import { type Vec3, vec3, normalize as normalizeVec } from './vec3';

/**
 * Immutable unit quaternion (w, x, y, z), same component order as Blender.
 * Rotations follow the right-hand rule; `mulQuat(a, b)` applies b first, then a.
 */
export interface Quat {
  readonly w: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const quat = (w: number, x: number, y: number, z: number): Quat => ({ w, x, y, z });

export const IDENTITY: Quat = quat(1, 0, 0, 0);

export const DEG = Math.PI / 180;

export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const n = normalizeVec(axis);
  const s = Math.sin(angle / 2);
  return quat(Math.cos(angle / 2), n.x * s, n.y * s, n.z * s);
}

export function mulQuat(a: Quat, b: Quat): Quat {
  return quat(
    a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  );
}

export const conjugate = (q: Quat): Quat => quat(q.w, -q.x, -q.y, -q.z);

export function normalizeQuat(q: Quat): Quat {
  const len = Math.hypot(q.w, q.x, q.y, q.z);
  return len > 0 ? quat(q.w / len, q.x / len, q.y / len, q.z / len) : IDENTITY;
}

export function rotate(q: Quat, v: Vec3): Vec3 {
  // v' = q * v * q^-1, expanded.
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return vec3(
    v.x + q.w * tx + (q.y * tz - q.z * ty),
    v.y + q.w * ty + (q.z * tx - q.x * tz),
    v.z + q.w * tz + (q.x * ty - q.y * tx),
  );
}

export const dotQuat = (a: Quat, b: Quat): number => a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

/** Angle in radians between two orientations (0..PI). */
export function angleBetween(a: Quat, b: Quat): number {
  const d = Math.min(1, Math.abs(dotQuat(a, b)));
  return 2 * Math.acos(d);
}

export function slerp(a: Quat, b: Quat, t: number): Quat {
  let d = dotQuat(a, b);
  let bb = b;
  if (d < 0) {
    d = -d;
    bb = quat(-b.w, -b.x, -b.y, -b.z);
  }
  if (d > 0.9995) {
    return normalizeQuat(
      quat(a.w + (bb.w - a.w) * t, a.x + (bb.x - a.x) * t, a.y + (bb.y - a.y) * t, a.z + (bb.z - a.z) * t),
    );
  }
  const theta = Math.acos(d);
  const s = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / s;
  const wb = Math.sin(t * theta) / s;
  return quat(a.w * wa + bb.w * wb, a.x * wa + bb.x * wb, a.y * wa + bb.y * wb, a.z * wa + bb.z * wb);
}

/**
 * Blender "XYZ Euler" (angles in radians): X is applied first, then Y, then Z,
 * all around global axes. Equivalent to R = Rz * Ry * Rx.
 */
export function fromEulerXYZ(e: Vec3): Quat {
  const qx = fromAxisAngle(vec3(1, 0, 0), e.x);
  const qy = fromAxisAngle(vec3(0, 1, 0), e.y);
  const qz = fromAxisAngle(vec3(0, 0, 1), e.z);
  return mulQuat(qz, mulQuat(qy, qx));
}

export function nearlyEqualQuat(a: Quat, b: Quat, eps = 1e-6): boolean {
  // q and -q describe the same orientation.
  return 1 - Math.abs(dotQuat(a, b)) <= eps;
}
