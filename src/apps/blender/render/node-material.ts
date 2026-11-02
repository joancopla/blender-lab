/**
 * Materials made from node trees (Lab 05), for Material Preview and Rendered.
 *
 * Each scene material gets a MeshPhysicalMaterial whose fragment shader evaluates the
 * compiled tree (shading/compile.ts) and puts the result where three.js reads its own
 * parameters: base colour, metallic, roughness, IOR, specular, transmission, coat,
 * normal and emission. Values are uniforms, so editing a value only updates them; a
 * new link or option makes a new program. A tree that cannot be compiled, or whose
 * program fails, is drawn in magenta, as Blender does with a broken shader.
 */
import * as THREE from 'three';
import type { Material } from '../scene/scene';
import { type CompiledMaterial, compileMaterial, uniformValue } from '../shading/compile';
import type { ColorRampData } from '../shading/node-types';
import { RAMP_TABLE_SIZE, rampTable } from '../shading/ramp';
import { nodeById } from '../shading/tree';
import type { NodeTree } from '../shading/tree';

/**
 * Thickness used for refraction with Transmission (three.js needs one; Blender traces
 * the real object). FIDELITY? Blender's refraction depends on the object's shape.
 */
const TRANSMISSION_THICKNESS = 0.5;

/** Surfaces drawn with node materials or the magenta fallback (see object-meshes.ts). */
export const isNodeMaterial = (m: THREE.Material): boolean => m.userData.blSurface === true;

export interface NodeMaterialEvents {
  /** The lab's warning for things in a material it does not replicate (null: none). */
  onWarnings?(materialId: string, warnings: readonly string[], failed: boolean): void;
}

interface Entry {
  readonly key: string;
  readonly compiled: CompiledMaterial | null;
  readonly material: THREE.Material;
  readonly uniforms: Record<string, THREE.IUniform>;
  readonly ramps: Map<string, { data: ColorRampData; texture: THREE.DataTexture }>;
  tree: NodeTree | null;
}

let magenta: THREE.MeshBasicMaterial | null = null;
function magentaMaterial(): THREE.MeshBasicMaterial {
  if (!magenta) {
    magenta = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1, 0, 1, THREE.LinearSRGBColorSpace), side: THREE.DoubleSide });
    magenta.polygonOffset = true;
    magenta.polygonOffsetFactor = 1;
    magenta.polygonOffsetUnits = 1;
    magenta.userData.blSurface = true;
  }
  return magenta;
}

/** Replaces `from` in `text`; a miss means three.js changed its chunks, which must not pass silently. */
function patch(text: string, from: string, to: string, where: string): string {
  if (!text.includes(from)) {
    console.warn(`[node-material] "${from}" not found in ${where}`);
    return text;
  }
  return text.replace(from, to);
}

const chunk = (name: keyof typeof THREE.ShaderChunk) => THREE.ShaderChunk[name] as string;

const VERTEX_HEAD = `
attribute vec3 blOrco;
varying vec3 vBlOrco;
varying vec3 vBlObjP;
varying vec3 vBlObjN;
varying vec3 vBlWorldP;
varying mat3 vBlObjToWorld;
`;

const FRAGMENT_HEAD = `
varying vec3 vBlOrco;
varying vec3 vBlObjP;
varying vec3 vBlObjN;
varying vec3 vBlWorldP;
varying mat3 vBlObjToWorld;
// three.js world (Y up) <-> Blender world (Z up); see coords.ts.
vec3 bl_toBlender(vec3 v) { return vec3(v.x, -v.z, v.y); }
vec3 bl_toThree(vec3 v) { return vec3(v.x, v.z, -v.y); }
`;

/** Fills the surface inputs and evaluates the tree, right at the start of main(). */
function surfaceSetup(window: boolean): string {
  return `
  bl_P = bl_toBlender(vBlWorldP);
  float blFacing = gl_FrontFacing ? 1.0 : -1.0;
  bl_N = normalize(bl_toBlender(inverseTransformDirection(normalize(vNormal) * blFacing, viewMatrix)));
  vec3 blViewV = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
  bl_V = normalize(bl_toBlender(inverseTransformDirection(blViewV, viewMatrix)));
  bl_generated = vBlOrco;
  bl_objP = vBlObjP;
  bl_objN = normalize(vBlObjN) * blFacing;
  bl_camP = -vViewPosition;
  bl_window = ${window ? 'vec3(gl_FragCoord.xy / blResolution, 0.0)' : 'vec3(0.0)'};
  bl_objToWorld = vBlObjToWorld;
  BlClosure bl = bl_eval();
  diffuseColor = vec4(bl.base, bl.alpha * opacity);
`;
}

const toView = (e: string) => `normalize((viewMatrix * vec4(bl_toThree(${e}), 0.0)).xyz)`;

function injectShader(shader: THREE.WebGLProgramParametersWithUniforms, compiled: CompiledMaterial): void {
  let vs = shader.vertexShader;
  vs = patch(vs, 'void main() {', `${VERTEX_HEAD}\nvoid main() {`, 'vertex shader');
  vs = patch(
    vs,
    '#include <begin_vertex>',
    `#include <begin_vertex>
  vBlObjP = position;
  vBlObjN = normal;
  vBlOrco = blOrco;
  // Object normal -> Blender world normal: the model matrix's normal matrix, then Z up.
  mat3 blNormal = transpose(inverse(mat3(modelMatrix)));
  vBlObjToWorld = mat3(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0) * blNormal;`,
    'vertex shader',
  );
  vs = patch(vs, '#include <project_vertex>', '#include <project_vertex>\n  vBlWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;', 'vertex shader');
  shader.vertexShader = vs;

  let fs = shader.fragmentShader;
  fs = patch(fs, 'void main() {', `${FRAGMENT_HEAD}\n${compiled.code}\nvoid main() {`, 'fragment shader');
  fs = patch(fs, '#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${surfaceSetup(compiled.flags.window)}`, 'fragment shader');
  fs = patch(fs, 'vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = bl.emission;', 'fragment shader');
  fs = patch(
    fs,
    '#include <roughnessmap_fragment>',
    patch(chunk('roughnessmap_fragment'), 'float roughnessFactor = roughness;', 'float roughnessFactor = bl.roughness;', 'roughnessmap_fragment'),
    'fragment shader',
  );
  fs = patch(
    fs,
    '#include <metalnessmap_fragment>',
    patch(chunk('metalnessmap_fragment'), 'float metalnessFactor = metalness;', 'float metalnessFactor = bl.metallic;', 'metalnessmap_fragment'),
    'fragment shader',
  );
  fs = patch(fs, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n  normal = ${toView('bl.N')};`, 'fragment shader');
  fs = patch(
    fs,
    '#include <clearcoat_normal_fragment_maps>',
    `#include <clearcoat_normal_fragment_maps>\n#ifdef USE_CLEARCOAT\n  clearcoatNormal = ${toView('bl.coatN')};\n#endif`,
    'fragment shader',
  );
  let lights = chunk('lights_physical_fragment');
  lights = patch(lights, 'material.ior = ior;', 'material.ior = bl.ior;', 'lights_physical_fragment');
  lights = patch(lights, 'float specularIntensityFactor = specularIntensity;', 'float specularIntensityFactor = bl.spec;', 'lights_physical_fragment');
  lights = patch(lights, 'vec3 specularColorFactor = specularColor;', 'vec3 specularColorFactor = bl.specTint;', 'lights_physical_fragment');
  lights = patch(lights, 'material.clearcoat = clearcoat;', 'material.clearcoat = bl.coat;', 'lights_physical_fragment');
  lights = patch(lights, 'material.clearcoatRoughness = clearcoatRoughness;', 'material.clearcoatRoughness = bl.coatRough;', 'lights_physical_fragment');
  fs = patch(fs, '#include <lights_physical_fragment>', lights, 'fragment shader');
  let transmission = chunk('transmission_fragment');
  transmission = patch(transmission, 'material.transmission = transmission;', 'material.transmission = bl.transmission;', 'transmission_fragment');
  transmission = patch(transmission, 'material.thickness = thickness;', 'material.thickness = bl.thinWall > 0.5 ? 0.0 : thickness;', 'transmission_fragment');
  fs = patch(fs, '#include <transmission_fragment>', transmission, 'fragment shader');
  shader.fragmentShader = fs;
}

/** A uniform's three.js value from a tree value. */
function threeValue(v: unknown, glslType: string): unknown {
  if (glslType === 'float') return typeof v === 'number' ? v : 0;
  if (glslType === 'bool') return !!v;
  const a = Array.isArray(v) ? (v as number[]) : [0, 0, 0, 1];
  if (glslType === 'vec3') return new THREE.Vector3(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
  return new THREE.Vector4(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 1);
}

function rampTexture(r: ColorRampData): THREE.DataTexture {
  const t = new THREE.DataTexture(rampTable(r), RAMP_TABLE_SIZE, 1, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

let missingImage: THREE.DataTexture | null = null;
/** 1 × 1 magenta, until an image is loaded (Blender's colour for a missing image). */
function missingImageTexture(): THREE.DataTexture {
  if (!missingImage) {
    missingImage = new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1);
    missingImage.needsUpdate = true;
  }
  return missingImage;
}

export class NodeMaterials {
  private readonly entries = new Map<string, Entry>();
  /** Programs that failed to compile: their trees are drawn in magenta. */
  private readonly failedKeys = new Set<string>();
  /** Viewport size in buffer pixels (Texture Coordinate > Window). */
  readonly resolution = { value: new THREE.Vector2(1, 1) };
  private xray = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly images: (name: string) => THREE.Texture | null = () => null,
    private readonly events: NodeMaterialEvents = {},
  ) {}

  /** X-ray (Alt+Z) makes surfaces see-through, as for the default material. */
  setXray(on: boolean): void {
    if (on === this.xray) return;
    this.xray = on;
    for (const e of this.entries.values()) this.applyXray(e.material);
  }

  private applyXray(m: THREE.Material): void {
    if (m === magentaMaterial()) return;
    const alpha = m.userData.blAlphaHash === true;
    m.transparent = this.xray;
    m.opacity = this.xray ? 0.5 : 1;
    m.depthWrite = !this.xray;
    // Dithered alpha and X-ray do not mix: X-ray wins, as a viewport setting.
    (m as THREE.MeshPhysicalMaterial).alphaHash = !this.xray && alpha;
    m.needsUpdate = true;
  }

  /** The three.js material for a scene material, compiled or updated as needed. */
  get(mat: Material): THREE.Material {
    let e = this.entries.get(mat.id);
    if (!e || e.tree !== mat.tree) {
      let compiled: CompiledMaterial | null = null;
      let key = 'error';
      try {
        compiled = compileMaterial(mat.tree);
        key = compiled.key;
      } catch (err) {
        console.warn('[node-material]', err);
      }
      if (this.failedKeys.has(key)) compiled = null;
      if (!e || e.key !== key) {
        if (e) this.dispose(e);
        e = this.create(key, compiled);
        this.entries.set(mat.id, e);
        this.events.onWarnings?.(mat.id, compiled?.warnings ?? [], compiled === null);
      }
      this.updateValues(e, mat.tree);
    }
    return e.material;
  }

  /** Drops the materials of scene materials that no longer exist. */
  retain(ids: ReadonlySet<string>): void {
    for (const [id, e] of this.entries) {
      if (ids.has(id)) continue;
      this.dispose(e);
      this.entries.delete(id);
    }
  }

  /**
   * After a frame: a program three.js could not compile turns its material magenta
   * (the error itself is in the console, from three.js).
   */
  checkPrograms(): void {
    for (const [id, e] of this.entries) {
      if (!e.compiled) continue;
      const props = this.renderer.properties.get(e.material) as { currentProgram?: { diagnostics?: { runnable: boolean } } };
      if (props.currentProgram?.diagnostics?.runnable === false) {
        this.failedKeys.add(e.key);
        this.dispose(e);
        const failed = this.create(e.key, null);
        this.entries.set(id, failed);
        this.events.onWarnings?.(id, [], true);
      }
    }
  }

  private create(key: string, compiled: CompiledMaterial | null): Entry {
    if (!compiled) return { key, compiled: null, material: magentaMaterial(), uniforms: {}, ramps: new Map(), tree: null };
    const uniforms: Record<string, THREE.IUniform> = {};
    for (const u of compiled.uniforms) uniforms[u.name] = { value: null };
    if (compiled.flags.window) uniforms.blResolution = this.resolution;
    // The noise loops run to N * blOne so the GPU driver does not unroll them (glsl.ts).
    if (compiled.code.includes('uniform int blOne;')) uniforms.blOne = { value: 1 };
    const m = new THREE.MeshPhysicalMaterial({
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      // three.js turns these features on when they are above 0; the shader sets the real values.
      clearcoat: compiled.flags.coat ? 1 : 0,
      transmission: compiled.flags.transmission ? 1 : 0,
      thickness: TRANSMISSION_THICKNESS,
      alphaHash: compiled.flags.alpha,
    });
    m.userData.blSurface = true;
    m.userData.blAlphaHash = compiled.flags.alpha;
    m.onBeforeCompile = (shader) => {
      injectShader(shader, compiled);
      Object.assign(shader.uniforms, uniforms);
    };
    m.customProgramCacheKey = () => `bl-${compiled.key}`;
    const e: Entry = { key, compiled, material: m, uniforms, ramps: new Map(), tree: null };
    this.applyXray(m);
    return e;
  }

  private updateValues(e: Entry, tree: NodeTree): void {
    e.tree = tree;
    if (!e.compiled) return;
    for (const u of e.compiled.uniforms) {
      const slot = e.uniforms[u.name]!;
      if (u.source.kind === 'ramp') {
        const r = nodeById(tree, u.source.node)?.props.color_ramp as ColorRampData | undefined;
        if (!r) continue;
        const prev = e.ramps.get(u.source.node);
        if (!prev || prev.data !== r) {
          prev?.texture.dispose();
          const texture = rampTexture(r);
          e.ramps.set(u.source.node, { data: r, texture });
          slot.value = texture;
        }
      } else if (u.source.kind === 'image') {
        const name = nodeById(tree, u.source.node)?.props.image;
        slot.value = (typeof name === 'string' && this.images(name)) || missingImageTexture();
      } else {
        slot.value = threeValue(uniformValue(tree, u.source), u.glslType);
      }
    }
  }

  private dispose(e: Entry): void {
    for (const r of e.ramps.values()) r.texture.dispose();
    if (e.material !== magentaMaterial()) e.material.dispose();
  }
}
