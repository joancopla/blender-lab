/**
 * The physics of Blender's lights, with no DOM and no three.js, so it can be
 * tested. Blender coordinates (Z up, metres). Used by the light meter, by the
 * stage checks and to calibrate the three.js lights.
 *
 * Adaptat de cifog-lab (xavikai), labs/lighting/light.js.
 *
 * Units, as in Blender:
 * - Point and Spot: Power P (W) spread over the whole sphere, so the intensity
 *   is P / 4π and the irradiance E = P / (4π (d² + R²)) · cos θ ("Soft Falloff":
 *   the Radius R keeps the light finite next to the lamp).
 * - Sun: Strength S (W/m²): E = S · cos θ, whatever the distance.
 * - Area: Power P (W) sent forwards like a flat diffuse panel: intensity
 *   (P / π) · cos θ_light, integrated over the panel (5 x 5 samples).
 * - World: a uniform radiance L gives E = π · L on any surface facing the sky
 *   (no occlusion here).
 * A diffuse surface of albedo ρ lit with E looks like the scene-linear value
 * ρ · E / π. The light's colour multiplies its power, as in Blender.
 * FIDELITY? Soft Falloff (on by default since 4.0), Spot Blend curve, Area sampling.
 */
import { rotate } from '../math/quat';
import { type Vec3, add, dot, length, normalize, scale, sub, vec3 } from '../math/vec3';
import { type LightData, type LightObject, type WorldSettings, lightData, objectRotation } from '../scene/scene';

/** Where a light is and how it points (world space). */
export interface LightPose {
  readonly position: Vec3;
  /** Unit vector along which the light shines (its local -Z). */
  readonly direction: Vec3;
  /** Its local X and Y (the Area's sides). */
  readonly u: Vec3;
  readonly v: Vec3;
}

export function lightPose(o: LightObject): LightPose {
  const q = objectRotation(o);
  return {
    position: o.location,
    direction: normalize(rotate(q, vec3(0, 0, -1))),
    u: normalize(rotate(q, vec3(1, 0, 0))),
    v: normalize(rotate(q, vec3(0, 1, 0))),
  };
}

export const luminance = (c: Vec3): number => 0.2126 * c.x + 0.7152 * c.y + 0.0722 * c.z;

/**
 * Spot cone: 1 inside, 0 outside, a smooth edge whose width is Spot Blend
 * (a fraction of the half angle). `cosAngle`: cosine of the angle between the
 * spot's axis and the direction towards the point.
 */
export function spotFactor(spotSizeDeg: number, spotBlend: number, cosAngle: number): number {
  const half = ((spotSizeDeg * Math.PI) / 180) / 2;
  const outer = Math.cos(half);
  const inner = Math.cos(half * (1 - spotBlend));
  if (cosAngle <= outer) return 0;
  if (cosAngle >= inner) return 1;
  const t = (cosAngle - outer) / (inner - outer);
  return t * t * (3 - 2 * t);
}

/** Points on an Area light's surface (5 x 5, the disk and ellipse cut round). */
export function areaSamples(d: LightData, pose: LightPose): Vec3[] {
  const n = 5;
  const sx = d.size;
  const sy = d.shape === 'RECTANGLE' || d.shape === 'ELLIPSE' ? d.sizeY : d.size;
  const round = d.shape === 'DISK' || d.shape === 'ELLIPSE';
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = (i + 0.5) / n - 0.5;
      const b = (j + 0.5) / n - 0.5;
      if (round && a * a + b * b > 0.25) continue;
      out.push(add(pose.position, add(scale(pose.u, a * sx), scale(pose.v, b * sy))));
    }
  }
  return out;
}

/**
 * Irradiance (W/m², a scalar for white light) that a light gives to a surface
 * point with unit normal `n`, without shadows. Multiply by the light's colour
 * for RGB.
 */
export function irradiance(o: LightObject, p: Vec3, n: Vec3): number {
  const d = lightData(o);
  const pose = lightPose(o);
  if (d.lightType === 'SUN') {
    const towards = scale(pose.direction, -1);
    return d.energy * Math.max(0, dot(n, towards));
  }
  if (d.lightType === 'AREA') {
    const samples = areaSamples(d, pose);
    const i0 = d.energy / Math.PI / samples.length;
    let e = 0;
    for (const s of samples) {
      const toLight = sub(s, p);
      const dist = length(toLight);
      if (dist < 1e-9) continue;
      const dir = scale(toLight, 1 / dist);
      const cosSurface = dot(n, dir);
      const cosLight = -dot(pose.direction, dir);
      if (cosSurface > 0 && cosLight > 0) e += (i0 * cosLight * cosSurface) / (dist * dist);
    }
    return e;
  }
  // Point and Spot.
  const toLight = sub(pose.position, p);
  const dist = length(toLight);
  if (dist < 1e-9) return 0;
  const dir = scale(toLight, 1 / dist);
  const cos = dot(n, dir);
  if (cos <= 0) return 0;
  const shape = d.lightType === 'SPOT' ? spotFactor(d.spotSizeDeg, d.spotBlend, -dot(pose.direction, dir)) : 1;
  const r = d.shadowSoftSize;
  return ((d.energy / (4 * Math.PI)) * cos * shape) / (dist * dist + r * r);
}

/** Irradiance of the World on a surface open to the whole sky (uniform colour). */
export const worldIrradiance = (w: WorldSettings): number => Math.PI * luminance(w.color) * w.strength;

// ─── Colour temperature ──────────────────────────────────────────────────────
// Planck's law integrated with the CIE 1931 colour matching functions (Wyman et
// al. fit), converted to linear Rec.709 and scaled to luminance 1, so the
// temperature changes the colour, not the power.
// FIDELITY? Whether Blender 5.2's light panel has a Temperature option.

const lobe = (x: number, m: number, s1: number, s2: number) => {
  const t = (x - m) / (x < m ? s1 : s2);
  return Math.exp(-0.5 * t * t);
};
const cmf = (l: number): [number, number, number] => [
  1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2),
  0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
  1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8),
];
const blackbodyCache = new Map<number, Vec3>();

/** Linear RGB of a black body at `kelvin` (1000–20000 K), with luminance 1. */
export function blackbody(kelvin: number): Vec3 {
  const k = Math.round(Math.max(1000, Math.min(20000, kelvin)));
  const hit = blackbodyCache.get(k);
  if (hit) return hit;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const m = l * 1e-9;
    const b = 1 / (m ** 5 * (Math.exp(1.4388e-2 / (m * k)) - 1));
    const [cx, cy, cz] = cmf(l);
    x += b * cx;
    y += b * cy;
    z += b * cz;
  }
  const rgb = vec3(
    Math.max(0, 3.2406 * x - 1.5372 * y - 0.4986 * z),
    Math.max(0, -0.9689 * x + 1.8758 * y + 0.0415 * z),
    Math.max(0, 0.0557 * x - 0.204 * y + 1.057 * z),
  );
  const out = scale(rgb, 1 / luminance(rgb));
  blackbodyCache.set(k, out);
  return out;
}
