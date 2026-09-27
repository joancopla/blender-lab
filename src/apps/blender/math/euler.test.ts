import { describe, expect, it } from 'vitest';
import { quatToEulerXYZ } from './euler';
import { DEG, angleBetween, fromAxisAngle, fromEulerXYZ, mulQuat } from './quat';
import { AXIS_Z, vec3 } from './vec3';

describe('quatToEulerXYZ', () => {
  it('round-trips ordinary angles', () => {
    for (const e of [vec3(10, 20, 30), vec3(-45, 60, 170), vec3(0, 0, 45), vec3(90, 0, 0)]) {
      const r = quatToEulerXYZ(fromEulerXYZ(vec3(e.x * DEG, e.y * DEG, e.z * DEG)), vec3(e.x * DEG, e.y * DEG, e.z * DEG));
      expect(r.x / DEG).toBeCloseTo(e.x, 9);
      expect(r.y / DEG).toBeCloseTo(e.y, 9);
      expect(r.z / DEG).toBeCloseTo(e.z, 9);
    }
  });

  it('keeps continuity past 180° (compatible Euler)', () => {
    let e = vec3(0, 0, 0);
    let q = fromEulerXYZ(e);
    for (let i = 0; i < 20; i++) {
      q = mulQuat(fromAxisAngle(AXIS_Z, 15 * DEG), q);
      e = quatToEulerXYZ(q, e);
    }
    expect(e.z / DEG).toBeCloseTo(300, 9);
  });

  it('handles gimbal lock', () => {
    const q = fromEulerXYZ(vec3(0, 90 * DEG, 0));
    expect(angleBetween(fromEulerXYZ(quatToEulerXYZ(q)), q)).toBeCloseTo(0, 6);
  });
});
