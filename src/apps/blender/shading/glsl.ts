/**
 * GLSL of the Lab 05 shader nodes, for WebGL2 (GLSL ES 3.00).
 *
 * Adapted from Blender 5.2.1 (GPL-2.0-or-later, Blender Authors):
 * source/blender/gpu/shaders/common/gpu_shader_common_hash.glsl,
 * gpu_shader_common_color_utils.glsl, gpu_shader_math_base_lib.glsl,
 * source/blender/gpu/shaders/material/gpu_shader_material_noise.glsl,
 * gpu_shader_material_fractal_noise.glsl, gpu_shader_material_tex_noise.glsl,
 * gpu_shader_material_tex_wave.glsl, gpu_shader_material_tex_checker.glsl,
 * gpu_shader_material_mix_color.glsl, gpu_shader_material_mapping.glsl,
 * gpu_shader_material_bump.glsl and gpu_shader_material_normal_map.glsl.
 *
 * Changes from Blender's sources: macros turned into functions, no implicit int/float
 * conversions (GLSL ES has none), float2/3/4 written vec2/3/4, and a "bl_" prefix on
 * every name so nothing clashes with three.js.
 *
 * Each chunk lists the chunks it needs; compile.ts includes only what a material uses.
 * No DOM, no three.js.
 */

export interface GlslChunk {
  readonly deps: readonly string[];
  readonly code: string;
}

// --- Jenkins lookup3 hash (gpu_shader_common_hash.glsl) -------------------------------------

const HASH = `
uint bl_rot(uint x, uint k) { return (x << k) | (x >> (32u - k)); }
void bl_hash_mix(inout uint a, inout uint b, inout uint c) {
  a -= c; a ^= bl_rot(c, 4u); c += b;
  b -= a; b ^= bl_rot(a, 6u); a += c;
  c -= b; c ^= bl_rot(b, 8u); b += a;
  a -= c; a ^= bl_rot(c, 16u); c += b;
  b -= a; b ^= bl_rot(a, 19u); a += c;
  c -= b; c ^= bl_rot(b, 4u); b += a;
}
void bl_hash_final(inout uint a, inout uint b, inout uint c) {
  c ^= b; c -= bl_rot(b, 14u);
  a ^= c; a -= bl_rot(c, 11u);
  b ^= a; b -= bl_rot(a, 25u);
  c ^= b; c -= bl_rot(b, 16u);
  a ^= c; a -= bl_rot(c, 4u);
  b ^= a; b -= bl_rot(a, 14u);
  c ^= b; c -= bl_rot(b, 24u);
}
uint bl_hash_uint(uint kx) {
  uint a = 0xdeadbeefu + (1u << 2u) + 13u; uint b = a; uint c = a;
  a += kx;
  bl_hash_final(a, b, c);
  return c;
}
uint bl_hash_uint2(uint kx, uint ky) {
  uint a = 0xdeadbeefu + (2u << 2u) + 13u; uint b = a; uint c = a;
  b += ky; a += kx;
  bl_hash_final(a, b, c);
  return c;
}
uint bl_hash_uint3(uint kx, uint ky, uint kz) {
  uint a = 0xdeadbeefu + (3u << 2u) + 13u; uint b = a; uint c = a;
  c += kz; b += ky; a += kx;
  bl_hash_final(a, b, c);
  return c;
}
uint bl_hash_uint4(uint kx, uint ky, uint kz, uint kw) {
  uint a = 0xdeadbeefu + (4u << 2u) + 13u; uint b = a; uint c = a;
  a += kx; b += ky; c += kz;
  bl_hash_mix(a, b, c);
  a += kw;
  bl_hash_final(a, b, c);
  return c;
}
uint bl_hash_int(int kx) { return bl_hash_uint(uint(kx)); }
uint bl_hash_int2(int kx, int ky) { return bl_hash_uint2(uint(kx), uint(ky)); }
uint bl_hash_int3(int kx, int ky, int kz) { return bl_hash_uint3(uint(kx), uint(ky), uint(kz)); }
uint bl_hash_int4(int kx, int ky, int kz, int kw) { return bl_hash_uint4(uint(kx), uint(ky), uint(kz), uint(kw)); }
float bl_hash_uint_to_float(uint kx) { return float(bl_hash_uint(kx)) / float(0xFFFFFFFFu); }
float bl_hash_uint2_to_float(uint kx, uint ky) { return float(bl_hash_uint2(kx, ky)) / float(0xFFFFFFFFu); }
float bl_hash_float_to_float(float k) { return bl_hash_uint_to_float(floatBitsToUint(k)); }
float bl_hash_vec2_to_float(vec2 k) { return bl_hash_uint2_to_float(floatBitsToUint(k.x), floatBitsToUint(k.y)); }
`;

// --- Perlin noise (gpu_shader_material_noise.glsl) ---------------------------------------------

const NOISE = `
uniform int blOne;
float bl_compatible_mod(float a, float b) {
  if (b != 0.0) { int N = int(a / b); return a - float(N) * b; }
  return 0.0;
}
vec2 bl_compatible_mod(vec2 a, float b) { return vec2(bl_compatible_mod(a.x, b), bl_compatible_mod(a.y, b)); }
vec3 bl_compatible_mod(vec3 a, float b) { return vec3(bl_compatible_mod(a.x, b), bl_compatible_mod(a.y, b), bl_compatible_mod(a.z, b)); }
vec4 bl_compatible_mod(vec4 a, float b) { return vec4(bl_compatible_mod(a.x, b), bl_compatible_mod(a.y, b), bl_compatible_mod(a.z, b), bl_compatible_mod(a.w, b)); }
float bl_fade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float bl_negate_if(float v, uint c) { return (c != 0u) ? -v : v; }
float bl_noise_grad(uint hash, float x) {
  uint h = hash & 15u;
  float g = float(1u + (h & 7u));
  return bl_negate_if(g, h & 8u) * x;
}
float bl_noise_grad(uint hash, float x, float y) {
  uint h = hash & 7u;
  float u = h < 4u ? x : y;
  float v = 2.0 * (h < 4u ? y : x);
  return bl_negate_if(u, h & 1u) + bl_negate_if(v, h & 2u);
}
float bl_noise_grad(uint hash, float x, float y, float z) {
  uint h = hash & 15u;
  float u = h < 8u ? x : y;
  float vt = ((h == 12u) || (h == 14u)) ? x : z;
  float v = h < 4u ? y : vt;
  return bl_negate_if(u, h & 1u) + bl_negate_if(v, h & 2u);
}
float bl_noise_grad(uint hash, float x, float y, float z, float w) {
  uint h = hash & 31u;
  float u = h < 24u ? x : y;
  float v = h < 16u ? y : z;
  float s = h < 8u ? z : w;
  return bl_negate_if(u, h & 1u) + bl_negate_if(v, h & 2u) + bl_negate_if(s, h & 4u);
}
float bl_bi_mix(float v0, float v1, float v2, float v3, float x, float y) {
  float x1 = 1.0 - x;
  return (1.0 - y) * (v0 * x1 + v1 * x) + y * (v2 * x1 + v3 * x);
}
float bl_tri_mix(float v0, float v1, float v2, float v3, float v4, float v5, float v6, float v7, float x, float y, float z) {
  float x1 = 1.0 - x; float y1 = 1.0 - y; float z1 = 1.0 - z;
  return z1 * (y1 * (v0 * x1 + v1 * x) + y * (v2 * x1 + v3 * x)) + z * (y1 * (v4 * x1 + v5 * x) + y * (v6 * x1 + v7 * x));
}
float bl_noise_perlin(float x) {
  float xf = floor(x); int X = int(xf); float fx = x - xf;
  float u = bl_fade(fx);
  return mix(bl_noise_grad(bl_hash_int(X), fx), bl_noise_grad(bl_hash_int(X + 1), fx - 1.0), u);
}
/*
 * 2D to 4D: the corners are visited in a loop (corner index = dx + 2 dy + 4 dz + 8 dw,
 * Blender's v0, v1, v2... order) so the hash is written once; written out corner by
 * corner, as in Blender, the GPU driver takes seconds to compile it. Same results.
 * The loops run to N * blOne (a uniform equal to 1) so the driver cannot unroll them.
 */
float bl_noise_perlin(vec2 p) {
  vec2 pf = floor(p); ivec2 I = ivec2(pf); vec2 f = p - pf;
  float g[4];
  for (int c = 0; c < 4 * blOne; c++) {
    ivec2 o = ivec2(c & 1, (c >> 1) & 1);
    vec2 d = f - vec2(o);
    g[c] = bl_noise_grad(bl_hash_int2(I.x + o.x, I.y + o.y), d.x, d.y);
  }
  return bl_bi_mix(g[0], g[1], g[2], g[3], bl_fade(f.x), bl_fade(f.y));
}
float bl_noise_perlin(vec3 p) {
  vec3 pf = floor(p); ivec3 I = ivec3(pf); vec3 f = p - pf;
  float g[8];
  for (int c = 0; c < 8 * blOne; c++) {
    ivec3 o = ivec3(c & 1, (c >> 1) & 1, (c >> 2) & 1);
    vec3 d = f - vec3(o);
    g[c] = bl_noise_grad(bl_hash_int3(I.x + o.x, I.y + o.y, I.z + o.z), d.x, d.y, d.z);
  }
  return bl_tri_mix(g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7], bl_fade(f.x), bl_fade(f.y), bl_fade(f.z));
}
float bl_noise_perlin(vec4 p) {
  vec4 pf = floor(p); ivec4 I = ivec4(pf); vec4 f = p - pf;
  float g[16];
  for (int c = 0; c < 16 * blOne; c++) {
    ivec4 o = ivec4(c & 1, (c >> 1) & 1, (c >> 2) & 1, (c >> 3) & 1);
    vec4 d = f - vec4(o);
    g[c] = bl_noise_grad(bl_hash_int4(I.x + o.x, I.y + o.y, I.z + o.z, I.w + o.w), d.x, d.y, d.z, d.w);
  }
  float u = bl_fade(f.x); float v = bl_fade(f.y); float t = bl_fade(f.z); float s = bl_fade(f.w);
  return mix(bl_tri_mix(g[0], g[1], g[2], g[3], g[4], g[5], g[6], g[7], u, v, t),
             bl_tri_mix(g[8], g[9], g[10], g[11], g[12], g[13], g[14], g[15], u, v, t), s);
}
/* Remap to [-1, 1] (scales computed by the OSL developers), repeating every 100000. */
float bl_snoise(float p) {
  float pc = 0.5 * float(abs(p) >= 1000000.0);
  return 0.2500 * bl_noise_perlin(bl_compatible_mod(p, 100000.0) + pc);
}
float bl_snoise(vec2 p) {
  vec2 pc = 0.5 * vec2(greaterThanEqual(abs(p), vec2(1000000.0)));
  return 0.6616 * bl_noise_perlin(bl_compatible_mod(p, 100000.0) + pc);
}
float bl_snoise(vec3 p) {
  vec3 pc = 0.5 * vec3(greaterThanEqual(abs(p), vec3(1000000.0)));
  return 0.9820 * bl_noise_perlin(bl_compatible_mod(p, 100000.0) + pc);
}
float bl_snoise(vec4 p) {
  vec4 pc = 0.5 * vec4(greaterThanEqual(abs(p), vec4(1000000.0)));
  return 0.8344 * bl_noise_perlin(bl_compatible_mod(p, 100000.0) + pc);
}
`;

// --- Fractal noise (gpu_shader_material_fractal_noise.glsl), one overload per dimension ---------

/*
 * Each function calls the noise from a single place: the octaves and Blender's extra
 * fractional octave (rmd) share one loop, with the same arithmetic in the same order.
 */
const FRACTAL_TEMPLATES = (T: string): Record<string, string> => ({
  bl_noise_fbm: `
float bl_noise_fbm(${T} co, float detail, float roughness, float lacunarity, float offset, float gain, bool normalize) {
  ${T} p = co; float fscale = 1.0; float amp = 1.0; float maxamp = 0.0; float sum = 0.0; float sum2 = 0.0;
  int octaves = int(detail); float rmd = detail - floor(detail);
  int last = rmd != 0.0 ? octaves + 1 : octaves;
  for (int i = 0; i <= last; i++) {
    float t = bl_snoise(fscale * p);
    if (i <= octaves) { sum += t * amp; maxamp += amp; amp *= roughness; fscale *= lacunarity; }
    else sum2 = sum + t * amp;
  }
  if (rmd != 0.0) {
    return normalize ? mix(0.5 * sum / maxamp + 0.5, 0.5 * sum2 / (maxamp + amp) + 0.5, rmd) : mix(sum, sum2, rmd);
  }
  return normalize ? 0.5 * sum / maxamp + 0.5 : sum;
}`,
  bl_noise_multi_fractal: `
float bl_noise_multi_fractal(${T} co, float detail, float roughness, float lacunarity, float offset, float gain, bool normalize) {
  ${T} p = co; float value = 1.0; float pwr = 1.0;
  int octaves = int(detail); float rmd = detail - floor(detail);
  int last = rmd != 0.0 ? octaves + 1 : octaves;
  for (int i = 0; i <= last; i++) {
    float s = bl_snoise(p);
    if (i <= octaves) { value *= (pwr * s + 1.0); pwr *= roughness; p *= lacunarity; }
    else value *= (rmd * pwr * s + 1.0);
  }
  return value;
}`,
  bl_noise_hetero_terrain: `
float bl_noise_hetero_terrain(${T} co, float detail, float roughness, float lacunarity, float offset, float gain, bool normalize) {
  ${T} p = co; float pwr = roughness; float value = 0.0;
  int octaves = int(detail); float rmd = detail - floor(detail);
  int last = rmd != 0.0 ? octaves + 1 : octaves;
  for (int i = 0; i <= last; i++) {
    float s = bl_snoise(p);
    if (i == 0) { value = offset + s; p *= lacunarity; }
    else if (i <= octaves) { float increment = (s + offset) * pwr * value; value += increment; pwr *= roughness; p *= lacunarity; }
    else { float increment = (s + offset) * pwr * value; value += rmd * increment; }
  }
  return value;
}`,
  bl_noise_hybrid_multi_fractal: `
float bl_noise_hybrid_multi_fractal(${T} co, float detail, float roughness, float lacunarity, float offset, float gain, bool normalize) {
  ${T} p = co; float pwr = 1.0; float value = 0.0; float weight = 1.0;
  int octaves = int(detail); float rmd = detail - floor(detail);
  int last = rmd != 0.0 ? octaves + 1 : octaves;
  for (int i = 0; i <= last; i++) {
    if (weight <= 0.001) break;
    if (weight > 1.0) weight = 1.0;
    float signal = (bl_snoise(p) + offset) * pwr;
    if (i <= octaves) { pwr *= roughness; value += weight * signal; weight *= gain * signal; p *= lacunarity; }
    else value += rmd * weight * signal;
  }
  return value;
}`,
  bl_noise_ridged_multi_fractal: `
float bl_noise_ridged_multi_fractal(${T} co, float detail, float roughness, float lacunarity, float offset, float gain, bool normalize) {
  ${T} p = co; float pwr = roughness; float value = 0.0; float weight = 1.0; float signal = 0.0;
  int octaves = int(detail);
  for (int i = 0; i <= octaves; i++) {
    if (i > 0) { p *= lacunarity; weight = clamp(signal * gain, 0.0, 1.0); }
    float s = offset - abs(bl_snoise(p));
    s *= s;
    if (i == 0) { signal = s; value = s; }
    else { signal = s * weight; value += signal * pwr; pwr *= roughness; }
  }
  return value;
}`,
});

/**
 * One fractal function for one dimension, as the chunk name "fractal:<function>:<type>".
 * Only what a material uses goes into its shader: the full set makes the GPU driver
 * take seconds to compile.
 */
export const fractalChunk = (fn: string, T: string) => `fractal:${fn}:${T}`;

// --- Noise Texture (gpu_shader_material_tex_noise.glsl) ------------------------------------

const NOISE_OFFSETS = `
float bl_random_float_offset(float seed) { return 100.0 + bl_hash_float_to_float(seed) * 100.0; }
vec2 bl_random_vec2_offset(float seed) {
  return vec2(100.0 + bl_hash_vec2_to_float(vec2(seed, 0.0)) * 100.0, 100.0 + bl_hash_vec2_to_float(vec2(seed, 1.0)) * 100.0);
}
vec3 bl_random_vec3_offset(float seed) {
  return vec3(100.0 + bl_hash_vec2_to_float(vec2(seed, 0.0)) * 100.0, 100.0 + bl_hash_vec2_to_float(vec2(seed, 1.0)) * 100.0,
              100.0 + bl_hash_vec2_to_float(vec2(seed, 2.0)) * 100.0);
}
vec4 bl_random_vec4_offset(float seed) {
  return vec4(100.0 + bl_hash_vec2_to_float(vec2(seed, 0.0)) * 100.0, 100.0 + bl_hash_vec2_to_float(vec2(seed, 1.0)) * 100.0,
              100.0 + bl_hash_vec2_to_float(vec2(seed, 2.0)) * 100.0, 100.0 + bl_hash_vec2_to_float(vec2(seed, 3.0)) * 100.0);
}
`;

/** Noise types as the GLSL function names (rna noise_type identifiers). */
export const NOISE_FUNCTIONS: Readonly<Record<string, string>> = {
  FBM: 'bl_noise_fbm',
  MULTIFRACTAL: 'bl_noise_multi_fractal',
  HETERO_TERRAIN: 'bl_noise_hetero_terrain',
  HYBRID_MULTIFRACTAL: 'bl_noise_hybrid_multi_fractal',
  RIDGED_MULTIFRACTAL: 'bl_noise_ridged_multi_fractal',
};

const DIM_TYPE: Readonly<Record<string, string>> = { '1D': 'float', '2D': 'vec2', '3D': 'vec3', '4D': 'vec4' };

/**
 * One Noise Texture variant (node_noise_tex_<type>_<dims>): the distortion uses the
 * same seeds as Blender, and the colour is two more noise evaluations at offsets. They
 * are left out when the Color output is not used (Blender's compute_color).
 */
export function noiseTextureFunction(dims: string, type: string, color = true): { name: string; code: string; chunk: string } {
  const T = DIM_TYPE[dims] ?? 'vec3';
  const fn = NOISE_FUNCTIONS[type] ?? 'bl_noise_fbm';
  const chunk = fractalChunk(fn, T);
  const name = `bl_tex_noise_${type.toLowerCase()}_${dims.toLowerCase()}${color ? '_color' : ''}`;
  const p = { '1D': 'w * scale', '2D': 'co.xy * scale', '3D': 'co * scale', '4D': 'vec4(co, w) * scale' }[dims] ?? 'co * scale';
  const off = { float: 'bl_random_float_offset', vec2: 'bl_random_vec2_offset', vec3: 'bl_random_vec3_offset', vec4: 'bl_random_vec4_offset' }[T]!;
  const n = { float: 1, vec2: 2, vec3: 3, vec4: 4 }[T]!;
  const distort =
    n === 1
      ? `p += bl_snoise(p + ${off}(0.0)) * distortion;`
      : `${T} d; for (int k = 0; k < ${n} * blOne; k++) d[k] = bl_snoise(p + ${off}(float(k))) * distortion; p += d;`;
  // The value and, for Color, two more evaluations at offsets: one call site, in a loop.
  const code = `
void ${name}(vec3 co, float w, float scale, float detail, float roughness, float lacunarity, float offset, float gain,
             float distortion, bool normalize, out float value, out vec4 color) {
  detail = clamp(detail, 0.0, 15.0);
  roughness = max(roughness, 0.0);
  ${T} p = ${p};
  if (distortion != 0.0) { ${distort} }
  float vals[3];
  for (int k = 0; k < ${color ? 3 : 1} * blOne; k++) {
    ${T} q = k == 0 ? p : p + ${off}(float(${n} + k - 1));
    vals[k] = ${fn}(q, detail, roughness, lacunarity, offset, gain, normalize);
  }
  value = vals[0];
  color = ${color ? 'vec4(vals[0], vals[1], vals[2], 1.0)' : 'vec4(value, value, value, 1.0)'};
}
`;
  return { name, code, chunk };
}

// --- Wave Texture (gpu_shader_material_tex_wave.glsl) ---------------------------------------

const WAVE = `
float bl_calc_wave(vec3 p, float distortion, float detail, float detail_scale, float detail_roughness, float phase,
                   int wave_type, int bands_dir, int rings_dir, int wave_profile) {
  p = (p + 0.000001) * 0.999999;
  float n;
  if (wave_type == 0) {
    if (bands_dir == 0) n = p.x * 20.0;
    else if (bands_dir == 1) n = p.y * 20.0;
    else if (bands_dir == 2) n = p.z * 20.0;
    else n = (p.x + p.y + p.z) * 10.0;
  } else {
    vec3 rp = p;
    if (rings_dir == 0) rp *= vec3(0.0, 1.0, 1.0);
    else if (rings_dir == 1) rp *= vec3(1.0, 0.0, 1.0);
    else if (rings_dir == 2) rp *= vec3(1.0, 1.0, 0.0);
    n = length(rp) * 20.0;
  }
  n += phase;
  if (distortion != 0.0) {
    n += distortion * (bl_noise_fbm(p * detail_scale, detail, detail_roughness, 2.0, 0.0, 0.0, true) * 2.0 - 1.0);
  }
  const float M_PI = 3.14159265358979323846;
  if (wave_profile == 0) return 0.5 + 0.5 * sin(n - M_PI * 0.5);
  if (wave_profile == 1) { n /= 2.0 * M_PI; return n - floor(n); }
  n /= 2.0 * M_PI;
  return abs(n - floor(n + 0.5)) * 2.0;
}
`;

// --- Checker Texture (gpu_shader_material_tex_checker.glsl) ------------------------------------

const CHECKER = `
void bl_tex_checker(vec3 co, vec4 color1, vec4 color2, float scale, out vec4 color, out float fac) {
  vec3 p = co * scale;
  p = (p + 0.000001) * 0.999999;
  int xi = int(abs(floor(p.x)));
  int yi = int(abs(floor(p.y)));
  int zi = int(abs(floor(p.z)));
  bool check = ((xi % 2 == yi % 2) == (zi % 2 != 0));
  color = check ? color1 : color2;
  fac = check ? 1.0 : 0.0;
}
`;

// --- Colour (gpu_shader_common_color_utils.glsl, gpu_shader_material_mix_color.glsl) ------------

const HSV = `
vec4 bl_rgb_to_hsv(vec4 rgb) {
  float cmax = max(rgb.r, max(rgb.g, rgb.b));
  float cmin = min(rgb.r, min(rgb.g, rgb.b));
  float cdelta = cmax - cmin;
  float h = 0.0; float s = 0.0; float v = cmax;
  if (cmax != 0.0) s = cdelta / cmax;
  if (s != 0.0) {
    vec3 c = (vec3(cmax) - rgb.rgb) / cdelta;
    if (rgb.r == cmax) h = c.b - c.g;
    else if (rgb.g == cmax) h = 2.0 + c.r - c.b;
    else h = 4.0 + c.g - c.r;
    h /= 6.0;
    if (h < 0.0) h += 1.0;
  }
  return vec4(h, s, v, rgb.a);
}
vec4 bl_hsv_to_rgb(vec4 hsv) {
  float h = hsv.x; float s = hsv.y; float v = hsv.z;
  vec3 rgb;
  if (s == 0.0) {
    rgb = vec3(v);
  } else {
    if (h == 1.0) h = 0.0;
    h *= 6.0;
    float i = floor(h); float f = h - i;
    float p = v * (1.0 - s); float q = v * (1.0 - (s * f)); float t = v * (1.0 - (s * (1.0 - f)));
    if (i == 0.0) rgb = vec3(v, t, p);
    else if (i == 1.0) rgb = vec3(q, v, p);
    else if (i == 2.0) rgb = vec3(p, v, t);
    else if (i == 3.0) rgb = vec3(p, q, v);
    else if (i == 4.0) rgb = vec3(t, p, v);
    else rgb = vec3(v, p, q);
  }
  return vec4(rgb, hsv.w);
}
`;

const MIX_COLOR = `
vec4 bl_mix_blend(float fac, vec4 a, vec4 b) { return mix(a, b, fac); }
vec4 bl_mix_add(float fac, vec4 a, vec4 b) { vec4 o = mix(a, a + b, fac); o.a = a.a; return o; }
vec4 bl_mix_mult(float fac, vec4 a, vec4 b) { vec4 o = mix(a, a * b, fac); o.a = a.a; return o; }
vec4 bl_mix_screen(float fac, vec4 a, vec4 b) {
  float facm = 1.0 - fac;
  vec4 o = vec4(1.0) - (vec4(facm) + fac * (vec4(1.0) - b)) * (vec4(1.0) - a);
  o.a = a.a; return o;
}
float bl_overlay_channel(float facm, float fac, float a, float b) {
  return a < 0.5 ? a * (facm + 2.0 * fac * b) : 1.0 - (facm + 2.0 * fac * (1.0 - b)) * (1.0 - a);
}
vec4 bl_mix_overlay(float fac, vec4 a, vec4 b) {
  float facm = 1.0 - fac;
  return vec4(bl_overlay_channel(facm, fac, a.r, b.r), bl_overlay_channel(facm, fac, a.g, b.g), bl_overlay_channel(facm, fac, a.b, b.b), a.a);
}
vec4 bl_mix_sub(float fac, vec4 a, vec4 b) { vec4 o = mix(a, a - b, fac); o.a = a.a; return o; }
vec4 bl_mix_div_fallback(float fac, vec4 a, vec4 b) {
  float facm = 1.0 - fac; vec4 o = a;
  if (b.r != 0.0) o.r = facm * o.r + fac * o.r / b.r;
  if (b.g != 0.0) o.g = facm * o.g + fac * o.g / b.g;
  if (b.b != 0.0) o.b = facm * o.b + fac * o.b / b.b;
  return o;
}
vec4 bl_mix_diff(float fac, vec4 a, vec4 b) { vec4 o = mix(a, abs(a - b), fac); o.a = a.a; return o; }
vec4 bl_mix_exclusion(float fac, vec4 a, vec4 b) { vec4 o = max(mix(a, a + b - 2.0 * a * b, fac), 0.0); o.a = a.a; return o; }
vec4 bl_mix_dark(float fac, vec4 a, vec4 b) { return vec4(mix(a.rgb, min(a.rgb, b.rgb), fac), a.a); }
vec4 bl_mix_light(float fac, vec4 a, vec4 b) { return vec4(mix(a.rgb, max(a.rgb, b.rgb), fac), a.a); }
float bl_dodge_channel(float fac, float a, float b) {
  if (a == 0.0) return a;
  float tmp = 1.0 - fac * b;
  if (tmp <= 0.0) return 1.0;
  tmp = a / tmp;
  return tmp > 1.0 ? 1.0 : tmp;
}
vec4 bl_mix_dodge(float fac, vec4 a, vec4 b) {
  return vec4(bl_dodge_channel(fac, a.r, b.r), bl_dodge_channel(fac, a.g, b.g), bl_dodge_channel(fac, a.b, b.b), a.a);
}
float bl_burn_channel(float facm, float fac, float a, float b) {
  float tmp = facm + fac * b;
  if (tmp <= 0.0) return 0.0;
  tmp = 1.0 - (1.0 - a) / tmp;
  if (tmp < 0.0) return 0.0;
  if (tmp > 1.0) return 1.0;
  return tmp;
}
vec4 bl_mix_burn(float fac, vec4 a, vec4 b) {
  float facm = 1.0 - fac;
  return vec4(bl_burn_channel(facm, fac, a.r, b.r), bl_burn_channel(facm, fac, a.g, b.g), bl_burn_channel(facm, fac, a.b, b.b), a.a);
}
vec4 bl_mix_hue(float fac, vec4 a, vec4 b) {
  vec4 o = a;
  vec4 hsv2 = bl_rgb_to_hsv(b);
  if (hsv2.y != 0.0) {
    vec4 hsv = bl_rgb_to_hsv(o);
    hsv.x = hsv2.x;
    o = mix(o, bl_hsv_to_rgb(hsv), fac);
    o.a = a.a;
  }
  return o;
}
vec4 bl_mix_sat(float fac, vec4 a, vec4 b) {
  vec4 o = a;
  vec4 hsv = bl_rgb_to_hsv(o);
  if (hsv.y != 0.0) {
    vec4 hsv2 = bl_rgb_to_hsv(b);
    hsv.y = (1.0 - fac) * hsv.y + fac * hsv2.y;
    o = bl_hsv_to_rgb(hsv);
  }
  return o;
}
vec4 bl_mix_val(float fac, vec4 a, vec4 b) {
  vec4 hsv = bl_rgb_to_hsv(a);
  vec4 hsv2 = bl_rgb_to_hsv(b);
  hsv.z = (1.0 - fac) * hsv.z + fac * hsv2.z;
  return bl_hsv_to_rgb(hsv);
}
vec4 bl_mix_color(float fac, vec4 a, vec4 b) {
  vec4 o = a;
  vec4 hsv2 = bl_rgb_to_hsv(b);
  if (hsv2.y != 0.0) {
    vec4 hsv = bl_rgb_to_hsv(o);
    hsv.x = hsv2.x; hsv.y = hsv2.y;
    o = mix(o, bl_hsv_to_rgb(hsv), fac);
    o.a = a.a;
  }
  return o;
}
vec4 bl_mix_soft(float fac, vec4 a, vec4 b) {
  float facm = 1.0 - fac; vec4 one = vec4(1.0);
  vec4 scr = one - (one - b) * (one - a);
  vec4 o = facm * a + fac * ((one - a) * b * a + a * scr);
  o.a = a.a; return o;
}
vec4 bl_mix_linear(float fac, vec4 a, vec4 b) { vec4 o = a + fac * (2.0 * (b - vec4(0.5))); o.a = a.a; return o; }
`;

/** Mix node blend_type → GLSL function (gpu_shader_get_name in node_shader_mix.cc). */
export const MIX_FUNCTIONS: Readonly<Record<string, string>> = {
  MIX: 'bl_mix_blend', ADD: 'bl_mix_add', MULTIPLY: 'bl_mix_mult', SUBTRACT: 'bl_mix_sub', SCREEN: 'bl_mix_screen',
  DIVIDE: 'bl_mix_div_fallback', DIFFERENCE: 'bl_mix_diff', EXCLUSION: 'bl_mix_exclusion', DARKEN: 'bl_mix_dark',
  LIGHTEN: 'bl_mix_light', OVERLAY: 'bl_mix_overlay', DODGE: 'bl_mix_dodge', BURN: 'bl_mix_burn', HUE: 'bl_mix_hue',
  SATURATION: 'bl_mix_sat', VALUE: 'bl_mix_val', COLOR: 'bl_mix_color', SOFT_LIGHT: 'bl_mix_soft', LINEAR_LIGHT: 'bl_mix_linear',
};

// --- Mapping (gpu_shader_material_mapping.glsl, BLI eul_to_mat3) ----------------------------------

const MAPPING = `
mat3 bl_euler_xyz_to_mat3(vec3 e) {
  float ci = cos(e.x); float cj = cos(e.y); float ch = cos(e.z);
  float si = sin(e.x); float sj = sin(e.y); float sh = sin(e.z);
  float cc = ci * ch; float cs = ci * sh; float sc = si * ch; float ss = si * sh;
  return mat3(cj * ch, cj * sh, -sj,
              sj * sc - cs, sj * ss + cc, cj * si,
              sj * cc + ss, sj * cs - sc, cj * ci);
}
vec3 bl_safe_divide(vec3 a, vec3 b) {
  return vec3(b.x != 0.0 ? a.x / b.x : 0.0, b.y != 0.0 ? a.y / b.y : 0.0, b.z != 0.0 ? a.z / b.z : 0.0);
}
vec3 bl_mapping_point(vec3 v, vec3 loc, vec3 rot, vec3 scale) { return bl_euler_xyz_to_mat3(rot) * (v * scale) + loc; }
vec3 bl_mapping_texture(vec3 v, vec3 loc, vec3 rot, vec3 scale) { return bl_safe_divide(transpose(bl_euler_xyz_to_mat3(rot)) * (v - loc), scale); }
vec3 bl_mapping_vector(vec3 v, vec3 loc, vec3 rot, vec3 scale) { return bl_euler_xyz_to_mat3(rot) * (v * scale); }
vec3 bl_mapping_normal(vec3 v, vec3 loc, vec3 rot, vec3 scale) { return normalize(bl_euler_xyz_to_mat3(rot) * bl_safe_divide(v, scale)); }
`;

// --- Bump (gpu_shader_material_bump.glsl) ----------------------------------------------------------

/**
 * Blender evaluates the height again at P + dPdx·filter_width and P + dPdy·filter_width;
 * here the GPU derivatives of the height give the same first-order values. FIDELITY?
 * `P` is the Blender world position, `N` the normal to perturb.
 */
const BUMP = `
vec3 bl_bump(float strength, float dist, float filter_width, float height, vec3 N, bool invert, vec3 P) {
  N = normalize(N);
  float inv = invert ? -1.0 : 1.0;
  dist *= gl_FrontFacing ? inv : -inv;
  vec3 dPdx = dFdx(P) * filter_width;
  vec3 dPdy = dFdy(P) * filter_width;
  vec2 height_xy = vec2(height) + filter_width * vec2(dFdx(height), dFdy(height));
  vec3 Rx = cross(dPdy, N);
  vec3 Ry = cross(N, dPdx);
  float det = dot(dPdx, Rx);
  vec2 dHd = height_xy - vec2(height);
  vec3 surfgrad = dHd.x * Rx + dHd.y * Ry;
  strength = max(strength, 0.0);
  vec3 result = normalize(filter_width * abs(det) * N - dist * sign(det) * surfgrad);
  return normalize(mix(N, result, strength));
}
`;

export const CHUNKS: Readonly<Record<string, GlslChunk>> = {
  hash: { deps: [], code: HASH },
  noise: { deps: ['hash'], code: NOISE },
  noiseOffsets: { deps: ['hash'], code: NOISE_OFFSETS },
  wave: { deps: ['fractal:bl_noise_fbm:vec3'], code: WAVE },
  checker: { deps: [], code: CHECKER },
  hsv: { deps: [], code: HSV },
  mixColor: { deps: ['hsv'], code: MIX_COLOR },
  mapping: { deps: [], code: MAPPING },
  bump: { deps: [], code: BUMP },
};

/** The chunks' code in dependency order, each once. */
export function chunkCode(names: Iterable<string>): string {
  const out: string[] = [];
  const done = new Set<string>();
  const visit = (n: string) => {
    if (done.has(n)) return;
    done.add(n);
    const c = CHUNKS[n] ?? dynamicChunk(n);
    if (!c) throw new Error(`Unknown GLSL chunk ${n}`);
    for (const d of c.deps) visit(d);
    out.push(c.code);
  };
  for (const n of names) visit(n);
  return out.join('\n');
}

function dynamicChunk(name: string): GlslChunk | undefined {
  const [kind, fn, T] = name.split(':');
  if (kind !== 'fractal' || !fn || !T) return undefined;
  const code = FRACTAL_TEMPLATES(T)[fn];
  return code ? { deps: ['noise'], code } : undefined;
}
