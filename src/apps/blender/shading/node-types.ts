/**
 * The shader nodes of Lab 05, as Blender 5.2 declares them. Every name, identifier,
 * default, range and option comes from the Blender 5.2.1 source
 * (source/blender/nodes/shader/nodes/node_shader_<file>.cc, noted on each node).
 * Socket identifiers are Blender's ("Shader_001", "A_Color"...), so links and values
 * can be compared with a .blend file.
 */
import type { SocketType, SocketValue } from './sockets';

/** Node options that are not sockets (enums, toggles, the Color Ramp, an image...). */
export type PropValue = string | number | boolean | null | ColorRampData | readonly [number, number, number, number];

export interface ColorRampStop {
  readonly position: number;
  readonly color: readonly [number, number, number, number];
}
export interface ColorRampData {
  readonly interpolation: 'EASE' | 'CARDINAL' | 'LINEAR' | 'B_SPLINE' | 'CONSTANT';
  readonly colorMode: 'RGB' | 'HSV' | 'HSL';
  readonly stops: readonly ColorRampStop[];
}

export type Props = Readonly<Record<string, PropValue>>;

export interface InputDef {
  /** Blender socket identifier (unique in the node). */
  readonly id: string;
  /** Name shown on the node. */
  readonly name: string;
  readonly type: SocketType;
  readonly default?: SocketValue;
  readonly min?: number;
  readonly max?: number;
  /** PROP_FACTOR: drawn as a slider. */
  readonly factor?: boolean;
  /** No value field (Normal, Height...): only a link gives it a value. */
  readonly hideValue?: boolean;
  /** Unlinked texture Vector: uses the Generated coordinates. */
  readonly implicitGenerated?: boolean;
  /** Collapsible panel of the node (Principled BSDF). */
  readonly panel?: string;
  /** is_default_link_socket(): the node's main input (Mix: A). */
  readonly defaultLink?: boolean;
  /** Socket only exists with these options. */
  readonly when?: (props: Props) => boolean;
}

export interface OutputDef {
  readonly id: string;
  readonly name: string;
  readonly type: SocketType;
  readonly when?: (props: Props) => boolean;
}

export interface PropDef {
  readonly id: string;
  readonly default: PropValue;
  /** Enum identifiers, in Blender's order. */
  readonly options?: readonly string[];
  /** Enum labels shown in the drop-down (rna_nodetree.cc, rna_material.cc, rna_color.cc). */
  readonly labels?: Readonly<Record<string, string>>;
  /** Label of a checkbox option ("Normalize", "Invert"...). */
  readonly label?: string;
}

export type NodeClass = 'input' | 'output' | 'shader' | 'texture' | 'color' | 'vector' | 'converter';

export interface NodeTypeDef {
  /** Blender idname. */
  readonly id: string;
  /** ui_name: the node's title and the base of its name ("Noise Texture.001"). */
  readonly label: string;
  readonly nodeClass: NodeClass;
  readonly inputs: readonly InputDef[];
  readonly outputs: readonly OutputDef[];
  readonly props: readonly PropDef[];
  readonly panels?: readonly { readonly name: string; readonly defaultClosed: boolean }[];
  /** Default width (bke::NodeWidth); 140 when the node does not set one. */
  readonly width?: number;
  /** Options drawn on the node (draw_buttons), in order, for the current values. */
  readonly buttons?: (props: Props) => readonly string[];
  /** Options drawn at the top of a panel (Principled BSDF in 5.2). */
  readonly panelButtons?: Readonly<Record<string, readonly string[]>>;
  /** Output → input used when muting (M) or deleting with reconnect (Ctrl+X). */
  readonly passThrough?: (props: Props) => Readonly<Record<string, string>>;
  /** Blender source file the definition comes from. */
  readonly source: string;
}

const f = (id: string, def: number, min?: number, max?: number, extra: Partial<InputDef> = {}): InputDef => ({
  id,
  name: id,
  type: 'float',
  default: def,
  ...(min !== undefined ? { min } : {}),
  ...(max !== undefined ? { max } : {}),
  ...extra,
});
const factor = (id: string, def: number, extra: Partial<InputDef> = {}): InputDef => f(id, def, 0, 1, { factor: true, ...extra });
const color = (id: string, def: readonly [number, number, number, number], extra: Partial<InputDef> = {}): InputDef => ({ id, name: id, type: 'color', default: def, ...extra });
const vector = (id: string, extra: Partial<InputDef> = {}): InputDef => ({ id, name: id, type: 'vector', default: [0, 0, 0], ...extra });
const out = (id: string, type: SocketType, extra: Partial<OutputDef> = {}): OutputDef => ({ id, name: id, type, ...extra });
const texVector = vector('Vector', { hideValue: true, implicitGenerated: true });
const WHITE = [1, 1, 1, 1] as const;

// --- Output and shaders ------------------------------------------------------------

export const OUTPUT_MATERIAL: NodeTypeDef = {
  id: 'ShaderNodeOutputMaterial',
  label: 'Material Output',
  nodeClass: 'output',
  inputs: [
    { id: 'Surface', name: 'Surface', type: 'shader' },
    { id: 'Volume', name: 'Volume', type: 'shader' },
    vector('Displacement', { hideValue: true }),
    f('Thickness', 0, undefined, undefined, { hideValue: true }),
  ],
  outputs: [],
  props: [{ id: 'target', default: 'ALL', options: ['ALL', 'EEVEE', 'CYCLES'], labels: { ALL: 'All', EEVEE: 'EEVEE', CYCLES: 'Cycles' } }],
  buttons: () => ['target'],
  source: 'node_shader_output_material.cc',
};

const P_SUB = 'Subsurface';
const P_SPEC = 'Specular';
export const PRINCIPLED_BSDF: NodeTypeDef = {
  id: 'ShaderNodeBsdfPrincipled',
  label: 'Principled BSDF',
  nodeClass: 'shader',
  inputs: [
    color('Base Color', [0.8, 0.8, 0.8, 1]),
    factor('Metallic', 0),
    factor('Roughness', 0.5),
    f('IOR', 1.5, 1, 1000),
    factor('Alpha', 1),
    { id: 'Thin Wall', name: 'Thin Wall', type: 'bool', default: false },
    vector('Normal', { hideValue: true }),
    factor('Diffuse Roughness', 0, { panel: 'Diffuse' }),
    factor('Subsurface Weight', 0, { name: 'Weight', panel: P_SUB }),
    vector('Subsurface Radius', { name: 'Radius', default: [1, 0.2, 0.1], min: 0, max: 100, panel: P_SUB }),
    f('Subsurface Scale', 0.005, 0, 10, { name: 'Scale', panel: P_SUB }),
    f('Subsurface IOR', 1.4, 1.01, 3.8, { name: 'IOR', factor: true, panel: P_SUB }),
    f('Subsurface Anisotropy', 0, -1, 1, { name: 'Anisotropy', factor: true, panel: P_SUB }),
    factor('Specular IOR Level', 0.5, { name: 'IOR Level', panel: P_SPEC }),
    color('Specular Tint', WHITE, { name: 'Tint', panel: P_SPEC }),
    factor('Anisotropic', 0, { name: 'Anisotropy', panel: P_SPEC }),
    factor('Anisotropic Rotation', 0, { panel: P_SPEC }),
    vector('Tangent', { hideValue: true, panel: P_SPEC }),
    factor('Transmission Weight', 0, { name: 'Weight', panel: 'Transmission' }),
    factor('Coat Weight', 0, { name: 'Weight', panel: 'Coat' }),
    factor('Coat Roughness', 0.03, { name: 'Roughness', panel: 'Coat' }),
    f('Coat IOR', 1.5, 1, 4, { name: 'IOR', panel: 'Coat' }),
    color('Coat Tint', WHITE, { name: 'Tint', panel: 'Coat' }),
    vector('Coat Normal', { name: 'Normal', hideValue: true, panel: 'Coat' }),
    factor('Sheen Weight', 0, { name: 'Weight', panel: 'Sheen' }),
    factor('Sheen Roughness', 0.5, { name: 'Roughness', panel: 'Sheen' }),
    color('Sheen Tint', WHITE, { name: 'Tint', panel: 'Sheen' }),
    color('Emission Color', WHITE, { name: 'Color', panel: 'Emission' }),
    f('Emission Strength', 0, 0, 1000000, { name: 'Strength', panel: 'Emission' }),
    f('Thin Film Thickness', 0, 0, 100000, { name: 'Thickness', panel: 'Thin Film' }),
    f('Thin Film IOR', 1.33, 1, 1000, { name: 'IOR', panel: 'Thin Film' }),
  ],
  outputs: [out('BSDF', 'shader')],
  props: [
    { id: 'distribution', default: 'MULTI_GGX', options: ['GGX', 'MULTI_GGX'], labels: { GGX: 'GGX', MULTI_GGX: 'Multiscatter GGX' } },
    {
      id: 'subsurface_method',
      default: 'RANDOM_WALK',
      options: ['BURLEY', 'RANDOM_WALK', 'RANDOM_WALK_SKIN', 'RANDOM_WALK_LEGACY'],
      labels: { BURLEY: 'Christensen-Burley', RANDOM_WALK: 'Random Walk', RANDOM_WALK_SKIN: 'Random Walk (Skin)', RANDOM_WALK_LEGACY: 'Random Walk (Legacy)' },
    },
  ],
  width: 240,
  /** In 5.2 these drop-downs live inside the Subsurface and Specular panels (panel layouts). */
  panelButtons: { Subsurface: ['subsurface_method'], Specular: ['distribution'] },
  panels: ['Diffuse', P_SUB, P_SPEC, 'Transmission', 'Coat', 'Sheen', 'Emission', 'Thin Film'].map((name) => ({ name, defaultClosed: true })),
  source: 'node_shader_bsdf_principled.cc',
};

export const EMISSION: NodeTypeDef = {
  id: 'ShaderNodeEmission',
  label: 'Emission',
  nodeClass: 'shader',
  inputs: [color('Color', WHITE), f('Strength', 1, 0, 1000000)],
  outputs: [out('Emission', 'shader')],
  props: [],
  source: 'node_shader_emission.cc',
};

export const MIX_SHADER: NodeTypeDef = {
  id: 'ShaderNodeMixShader',
  label: 'Mix Shader',
  nodeClass: 'shader',
  inputs: [factor('Fac', 0.5, { name: 'Factor' }), { id: 'Shader', name: 'Shader', type: 'shader' }, { id: 'Shader_001', name: 'Shader', type: 'shader' }],
  outputs: [out('Shader', 'shader')],
  props: [],
  passThrough: () => ({ Shader: 'Shader' }),
  source: 'node_shader_mix_shader.cc',
};

// --- Textures ----------------------------------------------------------------------

const dims = (p: Props) => p.noise_dimensions as string;
const noiseType = (p: Props) => p.noise_type as string;
export const NOISE_TEXTURE: NodeTypeDef = {
  id: 'ShaderNodeTexNoise',
  label: 'Noise Texture',
  nodeClass: 'texture',
  inputs: [
    { ...texVector, when: (p) => dims(p) !== '1D' },
    f('W', 0, -1000, 1000, { when: (p) => dims(p) === '1D' || dims(p) === '4D' }),
    f('Scale', 5, -1000, 1000),
    f('Detail', 2, 0, 15),
    factor('Roughness', 0.5),
    f('Lacunarity', 2, 0, 1000),
    f('Offset', 0, -1000, 1000, { when: (p) => noiseType(p) !== 'MULTIFRACTAL' && noiseType(p) !== 'FBM' }),
    f('Gain', 1, 0, 1000, { when: (p) => noiseType(p) === 'HYBRID_MULTIFRACTAL' || noiseType(p) === 'RIDGED_MULTIFRACTAL' }),
    f('Distortion', 0, -1000, 1000),
  ],
  outputs: [out('Fac', 'float', { name: 'Factor' }), out('Color', 'color')],
  props: [
    { id: 'noise_dimensions', default: '3D', options: ['1D', '2D', '3D', '4D'], labels: { '1D': '1D', '2D': '2D', '3D': '3D', '4D': '4D' } },
    {
      id: 'noise_type',
      default: 'FBM',
      options: ['MULTIFRACTAL', 'RIDGED_MULTIFRACTAL', 'HYBRID_MULTIFRACTAL', 'FBM', 'HETERO_TERRAIN'],
      labels: { MULTIFRACTAL: 'Multifractal', RIDGED_MULTIFRACTAL: 'Ridged Multifractal', HYBRID_MULTIFRACTAL: 'Hybrid Multifractal', FBM: 'fBM', HETERO_TERRAIN: 'Hetero Terrain' },
    },
    { id: 'normalize', default: true, label: 'Normalize' },
  ],
  width: 160,
  buttons: (p) => (p.noise_type === 'FBM' ? ['noise_dimensions', 'noise_type', 'normalize'] : ['noise_dimensions', 'noise_type']),
  source: 'node_shader_tex_noise.cc',
};

export const CHECKER_TEXTURE: NodeTypeDef = {
  id: 'ShaderNodeTexChecker',
  label: 'Checker Texture',
  nodeClass: 'texture',
  inputs: [texVector, color('Color1', [0.8, 0.8, 0.8, 1]), color('Color2', [0.2, 0.2, 0.2, 1]), f('Scale', 5, -10000, 10000)],
  outputs: [out('Color', 'color'), out('Fac', 'float', { name: 'Factor' })],
  props: [],
  source: 'node_shader_tex_checker.cc',
};

export const WAVE_TEXTURE: NodeTypeDef = {
  id: 'ShaderNodeTexWave',
  label: 'Wave Texture',
  nodeClass: 'texture',
  inputs: [
    texVector,
    f('Scale', 5, -1000, 1000),
    f('Distortion', 0, -1000, 1000),
    f('Detail', 2, 0, 15),
    f('Detail Scale', 1, -1000, 1000),
    factor('Detail Roughness', 0.5),
    f('Phase Offset', 0, -1000, 1000),
  ],
  outputs: [out('Color', 'color'), out('Fac', 'float', { name: 'Factor' })],
  props: [
    { id: 'wave_type', default: 'BANDS', options: ['BANDS', 'RINGS'], labels: { BANDS: 'Bands', RINGS: 'Rings' } },
    { id: 'bands_direction', default: 'X', options: ['X', 'Y', 'Z', 'DIAGONAL'], labels: { X: 'X', Y: 'Y', Z: 'Z', DIAGONAL: 'Diagonal' } },
    { id: 'rings_direction', default: 'X', options: ['X', 'Y', 'Z', 'SPHERICAL'], labels: { X: 'X', Y: 'Y', Z: 'Z', SPHERICAL: 'Spherical' } },
    { id: 'wave_profile', default: 'SIN', options: ['SIN', 'SAW', 'TRI'], labels: { SIN: 'Sine', SAW: 'Saw', TRI: 'Triangle' } },
  ],
  width: 160,
  buttons: (p) => ['wave_type', p.wave_type === 'BANDS' ? 'bands_direction' : 'rings_direction', 'wave_profile'],
  source: 'node_shader_tex_wave.cc',
};

export const IMAGE_TEXTURE: NodeTypeDef = {
  id: 'ShaderNodeTexImage',
  label: 'Image Texture',
  nodeClass: 'texture',
  inputs: [texVector],
  outputs: [out('Color', 'color'), out('Alpha', 'float')],
  props: [
    { id: 'image', default: null },
    { id: 'interpolation', default: 'Linear', options: ['Linear', 'Closest', 'Cubic', 'Smart'], labels: { Linear: 'Linear', Closest: 'Closest', Cubic: 'Cubic', Smart: 'Smart' } },
    { id: 'projection', default: 'FLAT', options: ['FLAT', 'BOX', 'SPHERE', 'TUBE'], labels: { FLAT: 'Flat', BOX: 'Box', SPHERE: 'Sphere', TUBE: 'Tube' } },
    { id: 'extension', default: 'REPEAT', options: ['REPEAT', 'EXTEND', 'CLIP', 'MIRROR'], labels: { REPEAT: 'Repeat', EXTEND: 'Extend', CLIP: 'Clip', MIRROR: 'Mirror' } },
  ],
  width: 240,
  buttons: () => ['image', 'interpolation', 'projection', 'extension'],
  source: 'node_shader_tex_image.cc',
};

// --- Color and converters -------------------------------------------------------------

/** BKE_colorband_init(rangetype = true): black at 0, white at 1, both opaque, Linear. */
export const DEFAULT_RAMP: ColorRampData = {
  interpolation: 'LINEAR',
  colorMode: 'RGB',
  stops: [
    { position: 0, color: [0, 0, 0, 1] },
    { position: 1, color: [1, 1, 1, 1] },
  ],
};

export const COLOR_RAMP: NodeTypeDef = {
  id: 'ShaderNodeValToRGB',
  label: 'Color Ramp',
  nodeClass: 'converter',
  inputs: [factor('Fac', 0.5, { name: 'Factor' })],
  outputs: [out('Color', 'color'), out('Alpha', 'float')],
  props: [{ id: 'color_ramp', default: DEFAULT_RAMP }],
  width: 240,
  buttons: () => ['color_ramp'],
  source: 'node_shader_color_ramp.cc, blenkernel/intern/colorband.cc',
};

/** Blend modes of the Mix node (rna ramp_blend_items order). The lab implements MIX, MULTIPLY, OVERLAY and SCREEN. */
const BLEND_LABELS: Readonly<Record<string, string>> = {
  MIX: 'Mix', DARKEN: 'Darken', MULTIPLY: 'Multiply', BURN: 'Color Burn', LIGHTEN: 'Lighten', SCREEN: 'Screen',
  DODGE: 'Color Dodge', ADD: 'Add', OVERLAY: 'Overlay', SOFT_LIGHT: 'Soft Light', LINEAR_LIGHT: 'Linear Light',
  DIFFERENCE: 'Difference', EXCLUSION: 'Exclusion', SUBTRACT: 'Subtract', DIVIDE: 'Divide', HUE: 'Hue',
  SATURATION: 'Saturation', COLOR: 'Color', VALUE: 'Value',
};

export const BLEND_TYPES = [
  'MIX', 'DARKEN', 'MULTIPLY', 'BURN', 'LIGHTEN', 'SCREEN', 'DODGE', 'ADD', 'OVERLAY',
  'SOFT_LIGHT', 'LINEAR_LIGHT', 'DIFFERENCE', 'EXCLUSION', 'SUBTRACT', 'DIVIDE', 'HUE', 'SATURATION', 'COLOR', 'VALUE',
] as const;

const dataType = (p: Props) => p.data_type as string;
const nonUniform = (p: Props) => dataType(p) === 'VECTOR' && p.factor_mode === 'NON_UNIFORM';
export const MIX: NodeTypeDef = {
  id: 'ShaderNodeMix',
  label: 'Mix',
  nodeClass: 'converter',
  inputs: [
    factor('Factor_Float', 1, { name: 'Factor', when: (p) => !nonUniform(p) }),
    vector('Factor_Vector', { name: 'Factor', default: [0.5, 0.5, 0.5], min: 0, max: 1, factor: true, when: nonUniform }),
    f('A_Float', 0, -10000, 10000, { name: 'A', defaultLink: true, when: (p) => dataType(p) === 'FLOAT' }),
    f('B_Float', 0, -10000, 10000, { name: 'B', when: (p) => dataType(p) === 'FLOAT' }),
    vector('A_Vector', { name: 'A', defaultLink: true, when: (p) => dataType(p) === 'VECTOR' }),
    vector('B_Vector', { name: 'B', when: (p) => dataType(p) === 'VECTOR' }),
    color('A_Color', [0.5, 0.5, 0.5, 1], { name: 'A', defaultLink: true, when: (p) => dataType(p) === 'RGBA' }),
    color('B_Color', [0.5, 0.5, 0.5, 1], { name: 'B', when: (p) => dataType(p) === 'RGBA' }),
  ],
  outputs: [
    out('Result_Float', 'float', { name: 'Result', when: (p) => dataType(p) === 'FLOAT' }),
    out('Result_Vector', 'vector', { name: 'Result', when: (p) => dataType(p) === 'VECTOR' }),
    out('Result_Color', 'color', { name: 'Result', when: (p) => dataType(p) === 'RGBA' }),
  ],
  props: [
    { id: 'data_type', default: 'FLOAT', options: ['FLOAT', 'VECTOR', 'RGBA', 'ROTATION'], labels: { FLOAT: 'Float', VECTOR: 'Vector', RGBA: 'Color', ROTATION: 'Rotation' } },
    { id: 'factor_mode', default: 'UNIFORM', options: ['UNIFORM', 'NON_UNIFORM'], labels: { UNIFORM: 'Uniform', NON_UNIFORM: 'Non-Uniform' } },
    { id: 'blend_type', default: 'MIX', options: BLEND_TYPES, labels: BLEND_LABELS },
    { id: 'clamp_factor', default: true, label: 'Clamp Factor' },
    { id: 'clamp_result', default: false, label: 'Clamp Result' },
  ],
  // sh_node_mix_layout: factor mode for vectors, blend mode and Clamp Result for colours.
  buttons: (p) => [
    'data_type',
    ...(p.data_type === 'VECTOR' ? ['factor_mode'] : []),
    ...(p.data_type === 'RGBA' ? ['blend_type', 'clamp_result'] : []),
    'clamp_factor',
  ],
  // is_default_link_socket(): A passes through when muted.
  passThrough: () => ({ Result_Float: 'A_Float', Result_Vector: 'A_Vector', Result_Color: 'A_Color' }),
  source: 'node_shader_mix.cc',
};

/** The RGB node: called "Color" in Blender 5.2 (ui_name). */
export const RGB: NodeTypeDef = {
  id: 'ShaderNodeRGB',
  label: 'Color',
  nodeClass: 'input',
  inputs: [],
  outputs: [out('Color', 'color')],
  props: [{ id: 'color', default: [0.5, 0.5, 0.5, 1] }],
  buttons: () => ['color'],
  source: 'node_shader_rgb.cc',
};

export const VALUE: NodeTypeDef = {
  id: 'ShaderNodeValue',
  label: 'Value',
  nodeClass: 'input',
  inputs: [],
  outputs: [out('Value', 'float')],
  props: [{ id: 'value', default: 0 }],
  buttons: () => ['value'],
  source: 'node_shader_value.cc',
};

// --- Vector -------------------------------------------------------------------------

export const TEXTURE_COORDINATE: NodeTypeDef = {
  id: 'ShaderNodeTexCoord',
  label: 'Texture Coordinate',
  nodeClass: 'input',
  inputs: [],
  outputs: ['Generated', 'Normal', 'UV', 'Object', 'Camera', 'Window', 'Reflection'].map((id) => out(id, 'vector')),
  props: [
    { id: 'object', default: null },
    { id: 'from_instancer', default: false, label: 'From Instancer' },
  ],
  buttons: () => ['object', 'from_instancer'],
  source: 'node_shader_tex_coord.cc',
};

const mappingType = (p: Props) => p.vector_type as string;
export const MAPPING: NodeTypeDef = {
  id: 'ShaderNodeMapping',
  label: 'Mapping',
  nodeClass: 'vector',
  inputs: [
    vector('Vector'),
    vector('Location', { when: (p) => mappingType(p) === 'POINT' || mappingType(p) === 'TEXTURE' }),
    vector('Rotation'),
    vector('Scale', { default: [1, 1, 1] }),
  ],
  outputs: [out('Vector', 'vector')],
  props: [{ id: 'vector_type', default: 'POINT', options: ['POINT', 'TEXTURE', 'VECTOR', 'NORMAL'], labels: { POINT: 'Point', TEXTURE: 'Texture', VECTOR: 'Vector', NORMAL: 'Normal' } }],
  buttons: () => ['vector_type'],
  passThrough: () => ({ Vector: 'Vector' }),
  source: 'node_shader_mapping.cc',
};

export const BUMP: NodeTypeDef = {
  id: 'ShaderNodeBump',
  label: 'Bump',
  nodeClass: 'vector',
  inputs: [
    factor('Strength', 1),
    f('Distance', 0.001, 0, 1000),
    f('Filter Width', 0.1, 0.001, 10),
    f('Height', 1, -1000, 1000, { hideValue: true }),
    vector('Normal', { hideValue: true }),
  ],
  outputs: [out('Normal', 'vector')],
  props: [{ id: 'invert', default: false, label: 'Invert' }],
  buttons: () => ['invert'],
  passThrough: () => ({ Normal: 'Normal' }),
  source: 'node_shader_bump.cc',
};

export const NORMAL_MAP: NodeTypeDef = {
  id: 'ShaderNodeNormalMap',
  label: 'Normal Map',
  nodeClass: 'vector',
  inputs: [f('Strength', 1, 0, 10), color('Color', [0.5, 0.5, 1, 1])],
  outputs: [out('Normal', 'vector')],
  props: [
    {
      id: 'space',
      default: 'TANGENT',
      options: ['TANGENT', 'OBJECT', 'WORLD', 'BLENDER_OBJECT', 'BLENDER_WORLD'],
      labels: { TANGENT: 'Tangent Space', OBJECT: 'Object Space', WORLD: 'World Space', BLENDER_OBJECT: 'Blender Object Space', BLENDER_WORLD: 'Blender World Space' },
    },
    // New in 5.x (DNA NodeShaderNormalMap: OpenGL and Displaced by default).
    { id: 'convention', default: 'OPENGL', options: ['OPENGL', 'DIRECTX'], labels: { OPENGL: 'OpenGL', DIRECTX: 'DirectX' } },
    { id: 'base', default: 'DISPLACED', options: ['ORIGINAL', 'DISPLACED'], labels: { ORIGINAL: 'Original Base', DISPLACED: 'Displaced Base' } },
    { id: 'uv_map', default: '' },
  ],
  width: 160,
  buttons: (p) => (p.space === 'TANGENT' ? ['space', 'convention', 'base', 'uv_map'] : ['space', 'convention']),
  source: 'node_shader_normal_map.cc',
};

export const NODE_TYPES: readonly NodeTypeDef[] = [
  OUTPUT_MATERIAL, PRINCIPLED_BSDF, EMISSION, MIX_SHADER,
  NOISE_TEXTURE, CHECKER_TEXTURE, WAVE_TEXTURE, IMAGE_TEXTURE,
  COLOR_RAMP, MIX, RGB, VALUE,
  TEXTURE_COORDINATE, MAPPING, BUMP, NORMAL_MAP,
];

const BY_ID = new Map(NODE_TYPES.map((t) => [t.id, t]));
export function nodeType(id: string): NodeTypeDef {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown shader node type ${id}`);
  return t;
}
