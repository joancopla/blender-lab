/**
 * The render side of the viewport's shading modes (three.js):
 * - Solid and Wireframe: no tone mapping, no scene lights (the renderer's
 *   studio rig lights Solid).
 * - Material Preview: the studio HDRI lights the scene and is the (blurred)
 *   background; the scene's lights are off, as in Blender by default.
 * - Rendered: the scene's lights (Blender units, see light-units.ts), the World
 *   as uniform ambient light and background, and shadows.
 * Material Preview and Rendered go through Color Management (AgX or Standard,
 * and Exposure).
 * Soft shadows come from the progressive samples (render/accumulator.ts): at
 * every sample each light is moved over its surface (light-sampling.ts).
 * FIDELITY? Material Preview background blur.
 */
import * as THREE from 'three';
import { setObjectLocation, setObjectRotation } from '../coords';
import {
  type LightObject,
  type SceneState,
  colorManagementOf,
  lightData,
  objectRotation,
  worldOf,
} from '../scene/scene';
import { exposureFactor, threeLight, worldAmbientIntensity } from './light-units';
import { lightSample } from './light-sampling';
import { studioPixels } from './studio-hdri';
import { fromEulerXYZ, mulQuat, rotate } from '../math/quat';
import { add, mul, vec3 } from '../math/vec3';

export type ShadingMode = 'WIREFRAME' | 'SOLID' | 'MATERIAL' | 'RENDERED';

/** Shadow map size: moderate, for classroom computers. */
const SHADOW_MAP_SIZE = 1024;
/**
 * Point lights render six shadow maps (a cube): smaller ones. The progressive
 * samples average them into soft shadows, which hides the lower resolution.
 */
const POINT_SHADOW_MAP_SIZE = 512;

interface LightEntry {
  readonly light: THREE.Light;
  readonly key: string;
}

/** An equirectangular float texture (three.js space, Y up). */
function equirect(pixels: Float32Array, width: number, height: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class RenderSetup {
  private readonly lights = new Map<string, LightEntry>();
  private readonly ambient = new THREE.AmbientLight(0xffffff, 0);
  private studio: { background: THREE.DataTexture; environment: THREE.Texture } | null = null;
  private worldTexture: THREE.DataTexture | null = null;
  private worldKey = '';

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    /** Blender-space root: scene lights live inside it, like the objects. */
    private readonly root: THREE.Object3D,
  ) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.root.add(this.ambient);
  }

  /**
   * Brings three.js in line with the mode and the scene. `sample`: the
   * progressive sample being rendered (the lights are moved for it).
   */
  sync(state: SceneState, mode: ShadingMode, sample = 0): void {
    const lit = mode === 'MATERIAL' || mode === 'RENDERED';
    const cm = colorManagementOf(state);
    this.renderer.toneMapping = !lit
      ? THREE.NoToneMapping
      : cm.viewTransform === 'AgX'
        ? THREE.AgXToneMapping
        : THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = exposureFactor(cm.exposure);

    if (mode === 'MATERIAL') {
      const studio = this.studioTextures();
      this.scene.environment = studio.environment;
      this.scene.background = studio.background;
      this.scene.backgroundBlurriness = 0.5;
    } else if (mode === 'RENDERED') {
      this.scene.environment = null;
      this.scene.background = this.worldBackground(state);
      this.scene.backgroundBlurriness = 0;
    } else {
      this.scene.environment = null;
      this.scene.background = null;
    }

    const world = worldOf(state);
    this.ambient.visible = mode === 'RENDERED';
    this.ambient.color.setRGB(world.color.x, world.color.y, world.color.z, THREE.LinearSRGBColorSpace);
    this.ambient.intensity = worldAmbientIntensity(world);

    this.syncLights(mode === 'RENDERED' ? state.objects.filter((o): o is LightObject => o.type === 'light') : [], sample);
  }

  private studioTextures() {
    if (!this.studio) {
      const background = equirect(studioPixels(256, 128), 256, 128);
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const environment = pmrem.fromEquirectangular(background).texture;
      pmrem.dispose();
      this.studio = { background, environment };
    }
    return this.studio;
  }

  /** The World colour as a background that goes through the view transform. */
  private worldBackground(state: SceneState): THREE.Texture {
    const w = worldOf(state);
    const key = `${w.color.x},${w.color.y},${w.color.z},${w.strength}`;
    if (!this.worldTexture || key !== this.worldKey) {
      this.worldTexture?.dispose();
      const px = new Float32Array(4 * 2 * 4);
      for (let i = 0; i < 8; i++) px.set([w.color.x * w.strength, w.color.y * w.strength, w.color.z * w.strength, 1], i * 4);
      this.worldTexture = equirect(px, 4, 2);
      this.worldKey = key;
    }
    return this.worldTexture;
  }

  private syncLights(lights: readonly LightObject[], sample: number): void {
    const keep = new Set(lights.map((l) => l.id));
    for (const [id, e] of this.lights) {
      if (keep.has(id)) continue;
      this.root.remove(e.light);
      e.light.dispose();
      this.lights.delete(id);
    }
    for (const o of lights) {
      const d = lightData(o);
      const t = threeLight(d);
      let e = this.lights.get(o.id);
      if (!e || e.key !== t.kind) {
        if (e) {
          this.root.remove(e.light);
          e.light.dispose();
        }
        e = { light: this.createLight(t.kind), key: t.kind };
        this.lights.set(o.id, e);
        this.root.add(e.light);
      }
      const light = e.light;
      // Soft shadows: this sample's point on the light (or direction of the Sun).
      const q = objectRotation(o);
      const s = lightSample(d, sample);
      setObjectLocation(light, add(o.location, rotate(q, mul(s.offset, o.scale))));
      setObjectRotation(light, mulQuat(q, fromEulerXYZ(vec3(s.tiltX, s.tiltY, 0))));
      light.color.setRGB(d.color.x, d.color.y, d.color.z, THREE.LinearSRGBColorSpace);
      light.intensity = t.intensity;
      if (light instanceof THREE.SpotLight) {
        light.angle = t.angle!;
        light.penumbra = t.penumbra!;
      }
      light.castShadow = d.useShadow;
    }
  }

  private createLight(kind: ReturnType<typeof threeLight>['kind']): THREE.Light {
    let light: THREE.Light;
    if (kind === 'point') {
      light = new THREE.PointLight(0xffffff, 1, 0, 2);
    } else if (kind === 'spot') {
      light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 4, 0, 2);
    } else {
      light = new THREE.DirectionalLight(0xffffff, 1);
      const cam = (light as THREE.DirectionalLight).shadow.camera;
      // FIDELITY? A fixed 20 m square around the origin for the Sun's shadow.
      Object.assign(cam, { left: -10, right: 10, top: 10, bottom: -10, near: 0.1, far: 100 });
    }
    // Spot and Sun shine along the light's local -Z, as in Blender: the target
    // is a child one metre in front of it.
    if (light instanceof THREE.SpotLight || light instanceof THREE.DirectionalLight) {
      light.target.position.set(0, 0, -1);
      light.add(light.target);
    }
    if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight || light instanceof THREE.DirectionalLight) {
      const size = light instanceof THREE.PointLight ? POINT_SHADOW_MAP_SIZE : SHADOW_MAP_SIZE;
      light.shadow.mapSize.set(size, size);
      light.shadow.bias = -0.0005;
      light.shadow.normalBias = 0.02;
    }
    return light;
  }
}
