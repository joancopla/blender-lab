/**
 * Object-ID render pass, used for:
 *  - selection outlines of meshes (active: light orange, selected: dark orange);
 *  - box select, which picks the objects visible inside the rectangle.
 * FIDELITY? Outline width (1 px) and whether hidden parts get an outline.
 */
import * as THREE from 'three';
import { THEME } from './theme';

const MAX_IDS = 1024;

const idVertex = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const idFragment = /* glsl */ `
  uniform vec2 uId;
  void main() {
    gl_FragColor = vec4(uId, 0.0, 1.0);
  }
`;

const outlineVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const outlineFragment = /* glsl */ `
  uniform sampler2D tId;
  uniform sampler2D tState;
  uniform vec2 uTexel;
  uniform float uWidth;
  uniform vec3 uActive;
  uniform vec3 uSelected;
  varying vec2 vUv;

  int idAt(vec2 uv) {
    vec4 c = texture2D(tId, uv);
    return int(c.r * 255.0 + 0.5) + int(c.g * 255.0 + 0.5) * 256;
  }
  float stateOf(int id) {
    if (id == 0) return 0.0;
    return texelFetch(tState, ivec2(id, 0), 0).r * 255.0;
  }
  void main() {
    int me = idAt(vUv);
    float best = 0.0;
    for (int dx = -1; dx <= 1; dx++) {
      for (int dy = -1; dy <= 1; dy++) {
        if (dx == 0 && dy == 0) continue;
        int n = idAt(vUv + vec2(float(dx), float(dy)) * uTexel * uWidth);
        if (n != me) best = max(best, stateOf(n));
      }
    }
    if (best < 0.5) discard;
    gl_FragColor = vec4(best > 1.5 ? uActive : uSelected, 1.0);
    #include <colorspace_fragment>
  }
`;

export type OutlineState = 0 | 1 | 2; // none, selected, active

export class SelectionPasses {
  private readonly target = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
  });
  private readonly idMaterials = new Map<number, THREE.ShaderMaterial>();
  private readonly stateData = new Uint8Array(MAX_IDS * 4);
  private readonly stateTexture = new THREE.DataTexture(this.stateData, MAX_IDS, 1);
  private readonly outlineScene = new THREE.Scene();
  private readonly outlineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly outlineMaterial: THREE.ShaderMaterial;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.stateTexture.needsUpdate = true;
    this.outlineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tId: { value: this.target.texture },
        tState: { value: this.stateTexture },
        uTexel: { value: new THREE.Vector2() },
        uWidth: { value: 1 },
        uActive: { value: new THREE.Color(THEME.activeObject) },
        uSelected: { value: new THREE.Color(THEME.objectSelected) },
      },
      vertexShader: outlineVertex,
      fragmentShader: outlineFragment,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outlineMaterial);
    quad.frustumCulled = false;
    this.outlineScene.add(quad);
  }

  private idMaterial(id: number): THREE.ShaderMaterial {
    let m = this.idMaterials.get(id);
    if (!m) {
      m = new THREE.ShaderMaterial({
        uniforms: { uId: { value: new THREE.Vector2((id % 256) / 255, Math.floor(id / 256) / 255) } },
        vertexShader: idVertex,
        fragmentShader: idFragment,
        side: THREE.DoubleSide,
      });
      this.idMaterials.set(id, m);
    }
    return m;
  }

  private resizeTarget(): void {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if (this.target.width !== size.x || this.target.height !== size.y) this.target.setSize(size.x, size.y);
  }

  /**
   * Renders object IDs (index + 1) into the target. `objects` maps each scene
   * object's root to its ID; `include` decides which drawables take part.
   */
  private renderIds(
    scene: THREE.Scene,
    camera: THREE.Camera,
    objects: ReadonlyMap<THREE.Object3D, number>,
    include: (drawable: THREE.Object3D, root: THREE.Object3D) => boolean,
  ): void {
    this.resizeTarget();
    const restore: [THREE.Mesh | THREE.Line, THREE.Material | THREE.Material[], boolean][] = [];
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return;
      let root: THREE.Object3D | null = child;
      while (root && !objects.has(root)) root = root.parent;
      restore.push([child, child.material, child.visible]);
      if (!root || !include(child, root)) {
        child.visible = false;
        return;
      }
      child.material = this.idMaterial(objects.get(root)!);
    });
    const prevTarget = this.renderer.getRenderTarget();
    const prevClear = this.renderer.getClearColor(new THREE.Color());
    const prevAlpha = this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setClearColor(prevClear, prevAlpha);
    for (const [child, material, visible] of restore) {
      child.material = material;
      child.visible = visible;
    }
  }

  /**
   * Draws the outlines of selected meshes on top of the current frame.
   * `states` gives each ID its outline state.
   */
  renderOutlines(
    scene: THREE.Scene,
    camera: THREE.Camera,
    meshRoots: ReadonlyMap<THREE.Object3D, number>,
    states: ReadonlyMap<number, OutlineState>,
  ): void {
    this.stateData.fill(0);
    for (const [id, state] of states) if (id < MAX_IDS) this.stateData[id * 4] = state;
    this.stateTexture.needsUpdate = true;
    // Only meshes take part: wires would cut the outlines.
    this.renderIds(scene, camera, meshRoots, (drawable) => drawable instanceof THREE.Mesh && drawable.visible);
    const pr = this.renderer.getPixelRatio();
    this.outlineMaterial.uniforms.uTexel!.value.set(1 / this.target.width, 1 / this.target.height);
    this.outlineMaterial.uniforms.uWidth!.value = Math.max(1, Math.round(pr));
    this.renderer.render(this.outlineScene, this.outlineCamera);
  }

  /**
   * IDs of all objects with visible pixels inside a rectangle (CSS pixels,
   * top-left origin). Used by box select.
   */
  idsInRect(
    scene: THREE.Scene,
    camera: THREE.Camera,
    objects: ReadonlyMap<THREE.Object3D, number>,
    rect: { x: number; y: number; width: number; height: number },
    isPickable: (drawable: THREE.Object3D) => boolean,
  ): Set<number> {
    this.renderIds(scene, camera, objects, (drawable) => drawable.visible && isPickable(drawable));
    const pr = this.renderer.getPixelRatio();
    const x0 = Math.max(0, Math.floor(rect.x * pr));
    const x1 = Math.min(this.target.width, Math.ceil((rect.x + rect.width) * pr));
    const yTop = Math.max(0, Math.floor(rect.y * pr));
    const yBottom = Math.min(this.target.height, Math.ceil((rect.y + rect.height) * pr));
    const w = x1 - x0;
    const h = yBottom - yTop;
    const ids = new Set<number>();
    if (w <= 0 || h <= 0) return ids;
    const buf = new Uint8Array(w * h * 4);
    // WebGL's origin is bottom-left.
    this.renderer.readRenderTargetPixels(this.target, x0, this.target.height - yBottom, w, h, buf);
    for (let i = 0; i < buf.length; i += 4) {
      const id = buf[i]! + buf[i + 1]! * 256;
      if (id) ids.add(id);
    }
    return ids;
  }
}
