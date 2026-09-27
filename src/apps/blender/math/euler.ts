/**
 * Quaternion -> Blender "XYZ Euler" (R = Rz * Ry * Rx), in radians.
 * Like Blender's compatible Euler conversion, it picks the solution closest to a
 * previous Euler, so rotating by small steps never makes the values jump.
 */
import type { Quat } from './quat';
import { type Vec3, vec3 } from './vec3';

function toEulerCandidates(q: Quat): [Vec3, Vec3] {
  const { w, x, y, z } = q;
  // Rotation matrix elements (row, column).
  const m00 = 1 - 2 * (y * y + z * z);
  const m10 = 2 * (x * y + w * z);
  const m20 = 2 * (x * z - w * y);
  const m21 = 2 * (y * z + w * x);
  const m22 = 1 - 2 * (x * x + y * y);
  const m01 = 2 * (x * y - w * z);
  const m11 = 1 - 2 * (x * x + z * z);
  const cy = Math.hypot(m00, m10);
  if (cy > 1e-9) {
    const a = vec3(Math.atan2(m21, m22), Math.atan2(-m20, cy), Math.atan2(m10, m00));
    const b = vec3(Math.atan2(-m21, -m22), Math.atan2(-m20, -cy), Math.atan2(-m10, -m00));
    return [a, b];
  }
  // Gimbal lock: Y is ±90°; put everything into X.
  const e = vec3(Math.atan2(-m01, m11), Math.atan2(-m20, cy), 0);
  return [e, e];
}

/** Brings `a` to within PI of `ref` by adding multiples of 2*PI. */
function near(a: number, ref: number): number {
  const twoPi = Math.PI * 2;
  return a + Math.round((ref - a) / twoPi) * twoPi;
}

export function quatToEulerXYZ(q: Quat, compatibleWith: Vec3 = vec3(0, 0, 0)): Vec3 {
  const [a, b] = toEulerCandidates(q);
  const fix = (e: Vec3) => vec3(near(e.x, compatibleWith.x), near(e.y, compatibleWith.y), near(e.z, compatibleWith.z));
  const fa = fix(a);
  const fb = fix(b);
  const dist = (e: Vec3) =>
    Math.abs(e.x - compatibleWith.x) + Math.abs(e.y - compatibleWith.y) + Math.abs(e.z - compatibleWith.z);
  return dist(fa) <= dist(fb) ? fa : fb;
}
