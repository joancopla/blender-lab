/**
 * Where a light is for each progressive sample (soft shadows): a point inside
 * the sphere of radius Radius (Point, Spot), a direction within the Sun's
 * Angle, or a point on the Area's surface. Blender's light space: the offsets
 * are in the light's local axes (it shines along -Z). Deterministic (Halton
 * sequence), so the average is always the same.
 *
 * Adaptat de cifog-lab (xavikai), labs/lighting/scene.js (lights moved over
 * their emitting surface at every sample).
 */
import { type Vec3, vec3 } from '../math/vec3';
import type { LightData } from '../scene/scene';
import { halton } from './accumulator';

export interface LightSample {
  /** Offset of the light's position, in its local axes (metres). */
  readonly offset: Vec3;
  /** Tilt of the light's direction around its local X and Y (radians), for the Sun. */
  readonly tiltX: number;
  readonly tiltY: number;
}

const NONE: LightSample = { offset: vec3(0, 0, 0), tiltX: 0, tiltY: 0 };

export function lightSample(d: LightData, k: number): LightSample {
  const u = halton(k, 2);
  const v = halton(k, 3);
  const phi = 2 * Math.PI * v;
  if (d.lightType === 'SUN') {
    const half = ((d.angleDeg / 2) * Math.PI) / 180;
    const r = half * Math.sqrt(u);
    return { offset: vec3(0, 0, 0), tiltX: r * Math.sin(phi), tiltY: r * Math.cos(phi) };
  }
  if (d.lightType === 'AREA') {
    const sy = d.shape === 'RECTANGLE' || d.shape === 'ELLIPSE' ? d.sizeY : d.size;
    if (d.shape === 'DISK' || d.shape === 'ELLIPSE') {
      const r = 0.5 * Math.sqrt(u);
      return { offset: vec3(r * Math.cos(phi) * d.size, r * Math.sin(phi) * sy, 0), tiltX: 0, tiltY: 0 };
    }
    return { offset: vec3((u - 0.5) * d.size, (v - 0.5) * sy, 0), tiltX: 0, tiltY: 0 };
  }
  // Point and Spot: uniformly inside a sphere of radius Radius.
  const radius = d.shadowSoftSize;
  if (radius <= 0) return NONE;
  const z = 1 - 2 * u;
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  const r = radius * Math.cbrt(halton(k, 5));
  return { offset: vec3(r * s * Math.cos(phi), r * s * Math.sin(phi), r * z), tiltX: 0, tiltY: 0 };
}
