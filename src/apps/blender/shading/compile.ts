/**
 * Material node tree → GLSL (the GLSL itself is adapted from Blender, see glsl.ts).
 *
 * The result is a function `BlClosure bl_eval()` that the viewport injects into a
 * three.js MeshPhysicalMaterial (render/node-material.ts). Values of unlinked
 * sockets and node options that are numbers or colours become uniforms, so changing
 * them never recompiles the shader: only links, node types and enum options do.
 *
 * The surface is a single set of physical parameters (BlClosure). Blender mixes the
 * light of each closure; Mix Shader here mixes their parameters. FIDELITY?
 *
 * No DOM, no three.js.
 */
import { CHUNKS, MIX_FUNCTIONS, chunkCode, noiseTextureFunction } from './glsl';
import { type InputDef, nodeType } from './node-types';
import { LUMA, type SocketType, type SocketValue } from './sockets';
import {
  type NodeTree,
  type ShaderNode,
  availableInputs,
  availableOutputs,
  inputValue,
  linkInto,
  linkIsValid,
  nodeById,
  outputNode,
  passThrough,
} from './tree';

export type UniformSource =
  | { readonly kind: 'input'; readonly node: string; readonly socket: string; readonly type: SocketType }
  | { readonly kind: 'prop'; readonly node: string; readonly prop: string; readonly type: 'float' | 'color' }
  | { readonly kind: 'ramp'; readonly node: string }
  | { readonly kind: 'rampNearest'; readonly node: string }
  | { readonly kind: 'image'; readonly node: string };

export interface CompiledUniform {
  readonly name: string;
  readonly glslType: 'float' | 'vec3' | 'vec4' | 'bool' | 'sampler2D';
  readonly source: UniformSource;
}

/** What the surface needs from three.js (each one changes the program). */
export interface SurfaceFlags {
  /** Transmission is linked or above 0 somewhere: three's transmission pass. */
  readonly transmission: boolean;
  /** Coat is linked or above 0: three's clearcoat. */
  readonly coat: boolean;
  /** Alpha is linked or below 1: dithered transparency (EEVEE's default render method). */
  readonly alpha: boolean;
  /** Uses the Window coordinate (needs the viewport size). */
  readonly window: boolean;
}

export interface CompiledMaterial {
  /** Same key, same program: changes only with links, node types and enum options. */
  readonly key: string;
  /** File-scope GLSL: library, uniforms, inputs and bl_eval(). */
  readonly code: string;
  readonly uniforms: readonly CompiledUniform[];
  readonly flags: SurfaceFlags;
  /** Things the lab does not replicate in this material (shown as a warning). */
  readonly warnings: readonly string[];
}

/** File-scope inputs bl_eval() reads; the viewport fills them before calling it. */
export const SURFACE_INPUTS = `
struct BlClosure {
  vec3 base; float metallic; float roughness; float ior; float alpha; vec3 N;
  float spec; vec3 specTint; float transmission; float thinWall; float coat; float coatRough; vec3 coatN; vec3 emission;
};
vec3 bl_P;        // position, Blender world space
vec3 bl_N;        // normal, Blender world space, facing the viewer
vec3 bl_V;        // towards the viewer, Blender world space
vec3 bl_generated;
vec3 bl_objP;
vec3 bl_objN;
vec3 bl_camP;
vec3 bl_window;
mat3 bl_objToWorld;   // object normal → Blender world normal
BlClosure bl_closure_emission(vec3 e) {
  return BlClosure(vec3(0.0), 0.0, 1.0, 1.5, 1.0, bl_N, 0.0, vec3(1.0), 0.0, 0.0, 0.0, 0.03, bl_N, e);
}
BlClosure bl_closure_mix(BlClosure a, BlClosure b, float f) {
  f = clamp(f, 0.0, 1.0);
  return BlClosure(mix(a.base, b.base, f), mix(a.metallic, b.metallic, f), mix(a.roughness, b.roughness, f),
                   mix(a.ior, b.ior, f), mix(a.alpha, b.alpha, f), normalize(mix(a.N, b.N, f)), mix(a.spec, b.spec, f),
                   mix(a.specTint, b.specTint, f), mix(a.transmission, b.transmission, f), mix(a.thinWall, b.thinWall, f),
                   mix(a.coat, b.coat, f), mix(a.coatRough, b.coatRough, f), normalize(mix(a.coatN, b.coatN, f)),
                   mix(a.emission, b.emission, f));
}
`;

const GLSL_TYPE: Readonly<Record<SocketType, string>> = { float: 'float', color: 'vec4', vector: 'vec3', bool: 'bool', shader: 'BlClosure' };

const ident = (s: string) => s.replace(/[^A-Za-z0-9]/g, '_');
const num = (v: number) => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const lumaExpr = (e: string) => `dot((${e}).rgb, vec3(${LUMA.map(num).join(', ')}))`;

/** An expression of one socket type as another (Blender's implicit conversions). */
export function convertExpr(e: string, from: SocketType, to: SocketType): string {
  if (from === to) return e;
  if (to === 'shader') {
    if (from === 'color') return `bl_closure_emission(max((${e}).rgb, vec3(0.0)))`;
    if (from === 'vector') return `bl_closure_emission(max(${e}, vec3(0.0)))`;
    if (from === 'bool') return `bl_closure_emission(vec3((${e}) ? 1.0 : 0.0))`;
    return `bl_closure_emission(vec3(max(${e}, 0.0)))`;
  }
  const asFloat = from === 'color' ? lumaExpr(e) : from === 'vector' ? `(((${e}).x + (${e}).y + (${e}).z) / 3.0)` : from === 'bool' ? `((${e}) ? 1.0 : 0.0)` : e;
  switch (to) {
    case 'float':
      return asFloat;
    case 'bool':
      return `(${asFloat} > 0.0)`;
    case 'vector':
      return from === 'color' ? `(${e}).rgb` : `vec3(${asFloat})`;
    case 'color':
      return from === 'vector' ? `vec4(${e}, 1.0)` : `vec4(vec3(${asFloat}), 1.0)`;
  }
  return e;
}

/** A constant of a socket type, as GLSL. */
export function constExpr(v: SocketValue | undefined, type: SocketType): string {
  if (type === 'shader') return 'bl_closure_emission(vec3(0.0))';
  if (type === 'bool') return v ? 'true' : 'false';
  if (type === 'float') return num(typeof v === 'number' ? v : 0);
  const a = Array.isArray(v) ? (v as readonly number[]) : [0, 0, 0, 1];
  if (type === 'vector') return `vec3(${num(a[0] ?? 0)}, ${num(a[1] ?? 0)}, ${num(a[2] ?? 0)})`;
  return `vec4(${num(a[0] ?? 0)}, ${num(a[1] ?? 0)}, ${num(a[2] ?? 0)}, ${num(a[3] ?? 1)})`;
}

/** Inputs whose unlinked value is the surface normal (no value field in Blender). */
const NORMAL_INPUTS = new Set(['Normal', 'Coat Normal', 'Tangent']);

class Compiler {
  private readonly lines: string[] = [];
  private readonly chunks = new Set<string>();
  private readonly extra = new Map<string, string>();
  readonly uniforms: CompiledUniform[] = [];
  private readonly uniformNames = new Set<string>();
  private readonly done = new Map<string, Map<string, string>>();
  readonly warnings: string[] = [];
  transmission = false;
  coat = false;
  alpha = false;
  window = false;

  constructor(private readonly tree: NodeTree) {}

  private uniform(name: string, glslType: CompiledUniform['glslType'], source: UniformSource): string {
    if (!this.uniformNames.has(name)) {
      this.uniformNames.add(name);
      this.uniforms.push({ name, glslType, source });
    }
    return name;
  }

  private warn(text: string): void {
    if (!this.warnings.includes(text)) this.warnings.push(text);
  }

  /** Whether an output of a node is used by a valid link. */
  private outputUsed(n: ShaderNode, socket: string): boolean {
    return this.tree.links.some((l) => l.from.node === n.id && l.from.socket === socket && linkIsValid(this.tree, l));
  }

  /** The expression feeding an input, converted to the input's type. */
  input(n: ShaderNode, socket: string): string {
    const def = availableInputs(n).find((s) => s.id === socket);
    if (!def) throw new Error(`No input ${socket} on ${n.type}`);
    const link = linkInto(this.tree, { node: n.id, socket });
    if (link && linkIsValid(this.tree, link)) {
      const src = this.output(link.from.node, link.from.socket);
      if (src) return convertExpr(src.expr, src.type, def.type);
    }
    return this.unlinked(n, def);
  }

  /** Whether an input has a valid link. */
  linked(n: ShaderNode, socket: string): boolean {
    const link = linkInto(this.tree, { node: n.id, socket });
    return !!link && linkIsValid(this.tree, link);
  }

  private unlinked(n: ShaderNode, def: InputDef): string {
    if (def.implicitGenerated) return 'bl_generated';
    if (def.type === 'vector' && NORMAL_INPUTS.has(def.id)) return 'bl_N';
    if (def.type === 'shader') return constExpr(undefined, 'shader');
    if (def.hideValue) return constExpr(def.default, def.type);
    return this.uniform(`u_${ident(n.id)}_${ident(def.id)}`, GLSL_TYPE[def.type] as CompiledUniform['glslType'], {
      kind: 'input',
      node: n.id,
      socket: def.id,
      type: def.type,
    });
  }

  /** An output of a node as an expression, emitting the node first; muted nodes pass through. */
  output(nodeId: string, socket: string): { expr: string; type: SocketType } | null {
    const n = nodeById(this.tree, nodeId);
    if (!n) return null;
    const out = availableOutputs(n).find((s) => s.id === socket);
    if (!out) return null;
    if (n.muted) {
      const through = passThrough(n)[socket];
      if (!through) return { expr: constExpr(undefined, out.type), type: out.type };
      const def = availableInputs(n).find((s) => s.id === through)!;
      return { expr: this.input(n, through), type: def.type };
    }
    let outs = this.done.get(n.id);
    if (!outs) {
      outs = this.emit(n);
      this.done.set(n.id, outs);
    }
    const expr = outs.get(socket);
    return expr ? { expr, type: out.type } : { expr: constExpr(undefined, out.type), type: out.type };
  }

  private v(n: ShaderNode, socket: string) {
    return `v_${ident(n.id)}_${ident(socket)}`;
  }

  private line(s: string) {
    this.lines.push(`  ${s}`);
  }

  /** Emits one node's code; returns its outputs. */
  private emit(n: ShaderNode): Map<string, string> {
    const o = new Map<string, string>();
    const i = (s: string) => this.input(n, s);
    const p = n.props;
    switch (n.type) {
      case 'ShaderNodeBsdfPrincipled': {
        const v = this.v(n, 'BSDF');
        const trans = this.linked(n, 'Transmission Weight') || Number(inputValue(n, 'Transmission Weight')) > 0;
        const coat = this.linked(n, 'Coat Weight') || Number(inputValue(n, 'Coat Weight')) > 0;
        const alpha = this.linked(n, 'Alpha') || Number(inputValue(n, 'Alpha')) < 1;
        this.transmission ||= trans;
        this.coat ||= coat;
        this.alpha ||= alpha;
        for (const [panel, sockets] of [
          ['Subsurface', ['Subsurface Weight']],
          ['Sheen', ['Sheen Weight']],
          ['Thin Film', ['Thin Film Thickness']],
        ] as const) {
          if (sockets.some((s) => this.linked(n, s) || Number(inputValue(n, s)) > 0)) {
            this.warn(`Principled BSDF: ${panel}`);
          }
        }
        this.line(`BlClosure ${v};`);
        this.line(`${v}.base = max(${i('Base Color')}.rgb, vec3(0.0));`);
        this.line(`${v}.metallic = clamp(${i('Metallic')}, 0.0, 1.0);`);
        this.line(`${v}.roughness = clamp(${i('Roughness')}, 0.0, 1.0);`);
        this.line(`${v}.ior = max(${i('IOR')}, 1e-5);`);
        this.line(`${v}.alpha = clamp(${i('Alpha')}, 0.0, 1.0);`);
        this.line(`${v}.N = normalize(${i('Normal')});`);
        this.line(`${v}.spec = 2.0 * max(${i('Specular IOR Level')}, 0.0);`);
        this.line(`${v}.specTint = max(${i('Specular Tint')}.rgb, vec3(0.0));`);
        this.line(`${v}.transmission = ${trans ? `clamp(${i('Transmission Weight')}, 0.0, 1.0)` : '0.0'};`);
        this.line(`${v}.thinWall = ${i('Thin Wall')} ? 1.0 : 0.0;`);
        this.line(`${v}.coat = ${coat ? `max(${i('Coat Weight')}, 0.0)` : '0.0'};`);
        this.line(`${v}.coatRough = clamp(${i('Coat Roughness')}, 0.0, 1.0);`);
        this.line(`${v}.coatN = normalize(${i('Coat Normal')});`);
        this.line(`${v}.emission = max(${i('Emission Color')}.rgb, vec3(0.0)) * max(${i('Emission Strength')}, 0.0);`);
        o.set('BSDF', v);
        break;
      }
      case 'ShaderNodeEmission': {
        const v = this.v(n, 'Emission');
        this.line(`BlClosure ${v} = bl_closure_emission(max(${i('Color')}.rgb, vec3(0.0)) * max(${i('Strength')}, 0.0));`);
        o.set('Emission', v);
        break;
      }
      case 'ShaderNodeMixShader': {
        const v = this.v(n, 'Shader');
        this.line(`BlClosure ${v} = bl_closure_mix(${i('Shader')}, ${i('Shader_001')}, ${i('Fac')});`);
        o.set('Shader', v);
        break;
      }
      case 'ShaderNodeTexNoise': {
        const dims = String(p.noise_dimensions);
        const type = String(p.noise_type);
        const fn = noiseTextureFunction(dims, type, this.outputUsed(n, 'Color'));
        this.chunks.add(fn.chunk).add('noiseOffsets');
        this.extra.set(fn.name, fn.code);
        const has = (s: string) => availableInputs(n).some((d) => d.id === s);
        const vec = has('Vector') ? i('Vector') : 'vec3(0.0)';
        const w = has('W') ? i('W') : '0.0';
        const offset = has('Offset') ? i('Offset') : '0.0';
        const gain = has('Gain') ? i('Gain') : '1.0';
        const fac = this.v(n, 'Fac');
        const color = this.v(n, 'Color');
        const normalize = type === 'FBM' ? (p.normalize ? 'true' : 'false') : 'false';
        this.line(`float ${fac}; vec4 ${color};`);
        this.line(
          `${fn.name}(${vec}, ${w}, ${i('Scale')}, ${i('Detail')}, ${i('Roughness')}, ${i('Lacunarity')}, ${offset}, ${gain}, ${i('Distortion')}, ${normalize}, ${fac}, ${color});`,
        );
        o.set('Fac', fac).set('Color', color);
        break;
      }
      case 'ShaderNodeTexChecker': {
        this.chunks.add('checker');
        const fac = this.v(n, 'Fac');
        const color = this.v(n, 'Color');
        this.line(`float ${fac}; vec4 ${color};`);
        this.line(`bl_tex_checker(${i('Vector')}, ${i('Color1')}, ${i('Color2')}, ${i('Scale')}, ${color}, ${fac});`);
        o.set('Fac', fac).set('Color', color);
        break;
      }
      case 'ShaderNodeTexWave': {
        this.chunks.add('wave');
        const idx = (prop: string, options: readonly string[]) => Math.max(0, options.indexOf(String(p[prop])));
        const wt = idx('wave_type', ['BANDS', 'RINGS']);
        const bd = idx('bands_direction', ['X', 'Y', 'Z', 'DIAGONAL']);
        const rd = idx('rings_direction', ['X', 'Y', 'Z', 'SPHERICAL']);
        const wp = idx('wave_profile', ['SIN', 'SAW', 'TRI']);
        const fac = this.v(n, 'Fac');
        this.line(
          `float ${fac} = bl_calc_wave(${i('Vector')} * ${i('Scale')}, ${i('Distortion')}, ${i('Detail')}, ${i('Detail Scale')}, ${i('Detail Roughness')}, ${i('Phase Offset')}, ${wt}, ${bd}, ${rd}, ${wp});`,
        );
        o.set('Fac', fac).set('Color', `vec4(vec3(${fac}), 1.0)`);
        break;
      }
      case 'ShaderNodeTexImage': {
        const color = this.v(n, 'Color');
        if (p.image === null || p.image === undefined || p.image === '') {
          // Blender draws a missing image in magenta.
          this.line(`vec4 ${color} = vec4(1.0, 0.0, 1.0, 1.0);`);
        } else {
          const tex = this.uniform(`u_${ident(n.id)}_image`, 'sampler2D', { kind: 'image', node: n.id });
          if (p.projection !== 'FLAT') this.warn(`Image Texture: ${String(p.projection)}`);
          const uv = `(${i('Vector')}).xy`;
          const sample =
            p.extension === 'CLIP'
              ? `(any(lessThan(${uv}, vec2(0.0))) || any(greaterThan(${uv}, vec2(1.0))) ? vec4(0.0) : texture(${tex}, ${uv}))`
              : `texture(${tex}, ${uv})`;
          this.line(`vec4 ${color} = ${sample};`);
        }
        o.set('Color', color).set('Alpha', `${color}.a`);
        break;
      }
      case 'ShaderNodeValToRGB': {
        const table = this.uniform(`u_${ident(n.id)}_ramp`, 'sampler2D', { kind: 'ramp', node: n.id });
        const nearest = this.uniform(`u_${ident(n.id)}_rampNearest`, 'bool', { kind: 'rampNearest', node: n.id });
        const color = this.v(n, 'Color');
        this.extra.set('bl_ramp', RAMP_LOOKUP);
        this.line(`vec4 ${color} = bl_ramp(${table}, ${nearest}, ${i('Fac')});`);
        o.set('Color', color).set('Alpha', `${color}.a`);
        break;
      }
      case 'ShaderNodeMix':
        this.emitMix(n, o);
        break;
      case 'ShaderNodeRGB':
        o.set('Color', this.uniform(`u_${ident(n.id)}_color`, 'vec4', { kind: 'prop', node: n.id, prop: 'color', type: 'color' }));
        break;
      case 'ShaderNodeValue':
        o.set('Value', this.uniform(`u_${ident(n.id)}_value`, 'float', { kind: 'prop', node: n.id, prop: 'value', type: 'float' }));
        break;
      case 'ShaderNodeTexCoord': {
        if (p.object) this.warn('Texture Coordinate: Object');
        if (this.outputUsed(n, 'UV')) this.warn('Texture Coordinate: UV');
        if (this.outputUsed(n, 'Window')) this.window = true;
        o.set('Generated', 'bl_generated').set('Normal', 'bl_objN').set('UV', 'vec3(0.0)').set('Object', 'bl_objP');
        o.set('Camera', 'bl_camP').set('Window', 'bl_window').set('Reflection', 'reflect(-bl_V, bl_N)');
        break;
      }
      case 'ShaderNodeMapping': {
        this.chunks.add('mapping');
        const type = String(p.vector_type).toLowerCase();
        const loc = availableInputs(n).some((d) => d.id === 'Location') ? i('Location') : 'vec3(0.0)';
        const v = this.v(n, 'Vector');
        this.line(`vec3 ${v} = bl_mapping_${type}(${i('Vector')}, ${loc}, ${i('Rotation')}, ${i('Scale')});`);
        o.set('Vector', v);
        break;
      }
      case 'ShaderNodeBump': {
        const v = this.v(n, 'Normal');
        if (!this.linked(n, 'Height')) {
          // Without a height, Bump does nothing (gpu_shader_bump).
          this.line(`vec3 ${v} = ${i('Normal')};`);
        } else {
          this.chunks.add('bump');
          this.line(
            `vec3 ${v} = bl_bump(${i('Strength')}, ${i('Distance')}, ${i('Filter Width')}, ${i('Height')}, ${i('Normal')}, ${p.invert ? 'true' : 'false'}, bl_P);`,
          );
        }
        o.set('Normal', v);
        break;
      }
      case 'ShaderNodeNormalMap': {
        const v = this.v(n, 'Normal');
        const space = String(p.space);
        if (space === 'TANGENT') {
          // Tangent space needs a UV map's tangents; with none, Blender returns the normal.
          if (this.linked(n, 'Color')) this.warn('Normal Map: Tangent Space');
          this.line(`vec3 ${v} = bl_N;`);
        } else {
          const blender = space.startsWith('BLENDER');
          let nrm = blender ? `(vec3(2.0, -2.0, -2.0) * (${i('Color')}).rgb - vec3(1.0))` : `(2.0 * (${i('Color')}).rgb - vec3(1.0))`;
          if (p.convention === 'DIRECTX') nrm = `(${nrm} * vec3(1.0, -1.0, 1.0))`;
          if (space === 'OBJECT' || space === 'BLENDER_OBJECT') nrm = `normalize(bl_objToWorld * ${nrm})`;
          this.line(`vec3 ${v} = normalize(mix(bl_N, ${nrm}, max(0.0, ${i('Strength')})));`);
        }
        o.set('Normal', v);
        break;
      }
      case 'ShaderNodeOutputMaterial':
        break;
      default:
        throw new Error(`No GLSL for ${n.type}`);
    }
    return o;
  }

  private emitMix(n: ShaderNode, o: Map<string, string>): void {
    const p = n.props;
    const i = (s: string) => this.input(n, s);
    const clampF = p.clamp_factor !== false;
    const type = String(p.data_type);
    if (type === 'FLOAT') {
      const f = clampF ? `clamp(${i('Factor_Float')}, 0.0, 1.0)` : i('Factor_Float');
      const v = this.v(n, 'Result_Float');
      this.line(`float ${v} = ${i('A_Float')} * (1.0 - ${f}) + ${i('B_Float')} * ${f};`);
      o.set('Result_Float', v);
    } else if (type === 'VECTOR') {
      const nonUniform = p.factor_mode === 'NON_UNIFORM';
      const f = nonUniform
        ? clampF
          ? `clamp(${i('Factor_Vector')}, vec3(0.0), vec3(1.0))`
          : i('Factor_Vector')
        : clampF
          ? `vec3(clamp(${i('Factor_Float')}, 0.0, 1.0))`
          : `vec3(${i('Factor_Float')})`;
      const v = this.v(n, 'Result_Vector');
      this.line(`vec3 ${v} = ${i('A_Vector')} * (vec3(1.0) - ${f}) + ${i('B_Vector')} * ${f};`);
      o.set('Result_Vector', v);
    } else if (type === 'RGBA') {
      this.chunks.add('mixColor');
      const fn = MIX_FUNCTIONS[String(p.blend_type)] ?? 'bl_mix_blend';
      const f = clampF ? `clamp(${i('Factor_Float')}, 0.0, 1.0)` : i('Factor_Float');
      const v = this.v(n, 'Result_Color');
      const mixed = `${fn}(${f}, ${i('A_Color')}, ${i('B_Color')})`;
      this.line(`vec4 ${v} = ${p.clamp_result ? `clamp(${mixed}, vec4(0.0), vec4(1.0))` : mixed};`);
      o.set('Result_Color', v);
    } else {
      this.warn(`Mix: ${type}`);
    }
  }

  /** The whole program: library, uniforms, extra functions and bl_eval(). */
  finish(surface: string): string {
    const uniforms = this.uniforms.map((u) => `uniform ${u.glslType} ${u.name};`).join('\n');
    const lib = chunkCode(this.chunks);
    return [
      SURFACE_INPUTS,
      this.window ? 'uniform vec2 blResolution;' : '',
      lib,
      [...this.extra.values()].join('\n'),
      uniforms,
      'BlClosure bl_eval() {',
      ...this.lines,
      `  return ${surface};`,
      '}',
    ].join('\n');
  }
}

/** Linear lookup in the 257-entry ramp table (valtorgb), nearest for Constant (valtorgb_nearest). */
const RAMP_LOOKUP = `
vec4 bl_ramp(sampler2D table, bool nearest, float fac) {
  float x = clamp(fac, 0.0, 1.0) * 256.0;
  int i0 = int(floor(x));
  int i1 = min(i0 + 1, 256);
  float t = nearest ? 0.0 : x - floor(x);
  return mix(texelFetch(table, ivec2(i0, 0), 0), texelFetch(table, ivec2(i1, 0), 0), t);
}
`;

/** A tiny string hash for the program key. */
function hashString(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 + c, 0x5bd1e995);
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

/**
 * Compiles a material's tree. Throws when the tree has a node the lab cannot compile
 * (the viewport then draws the material in magenta).
 */
export function compileMaterial(tree: NodeTree): CompiledMaterial {
  const c = new Compiler(tree);
  const out = outputNode(tree);
  // Nothing connected to Surface: black, as an empty closure in EEVEE. FIDELITY?
  let surface = 'bl_closure_emission(vec3(0.0))';
  if (out && !out.muted) {
    const link = linkInto(tree, { node: out.id, socket: 'Surface' });
    if (link && linkIsValid(tree, link)) {
      const src = c.output(link.from.node, link.from.socket);
      if (src) surface = convertExpr(src.expr, src.type, 'shader');
    }
  }
  const code = c.finish(surface);
  const flags: SurfaceFlags = { transmission: c.transmission, coat: c.coat, alpha: c.alpha, window: c.window };
  return { key: hashString(code + JSON.stringify(flags)), code, uniforms: c.uniforms, flags, warnings: c.warnings };
}

/** The current value of a uniform's source (for inputs and options; tables are built by the viewport). */
export function uniformValue(tree: NodeTree, src: UniformSource): SocketValue | undefined {
  const n = nodeById(tree, src.node);
  if (!n) return undefined;
  if (src.kind === 'input') return inputValue(n, src.socket);
  if (src.kind === 'prop') return n.props[src.prop] as SocketValue | undefined;
  if (src.kind === 'rampNearest') {
    const r = n.props.color_ramp as { interpolation?: string } | undefined;
    return r?.interpolation === 'CONSTANT';
  }
  return undefined;
}

/** Used by the tests: every chunk compiles in dependency order. */
export const ALL_CHUNKS = Object.keys(CHUNKS);

/** The node types compile.ts handles (all of Lab 05's). */
export const compiledTypes = (): readonly string[] => [
  'ShaderNodeOutputMaterial', 'ShaderNodeBsdfPrincipled', 'ShaderNodeEmission', 'ShaderNodeMixShader',
  'ShaderNodeTexNoise', 'ShaderNodeTexChecker', 'ShaderNodeTexWave', 'ShaderNodeTexImage', 'ShaderNodeValToRGB',
  'ShaderNodeMix', 'ShaderNodeRGB', 'ShaderNodeValue', 'ShaderNodeTexCoord', 'ShaderNodeMapping', 'ShaderNodeBump',
  'ShaderNodeNormalMap',
].filter((t) => nodeType(t));
