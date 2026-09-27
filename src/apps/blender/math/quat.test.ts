import { describe, expect, it } from 'vitest';
import { DEG, fromAxisAngle, fromEulerXYZ, mulQuat, rotate, slerp, angleBetween } from './quat';
import { vec3, AXIS_X, AXIS_Z } from './vec3';

const close = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
  expect(a.z).toBeCloseTo(b.z, 9);
};

describe('quat', () => {
  it('rotates +X to +Y with +90° around Z (right-hand rule)', () => {
    close(rotate(fromAxisAngle(AXIS_Z, 90 * DEG), AXIS_X), vec3(0, 1, 0));
  });

  it('mulQuat applies the right operand first', () => {
    const a = fromAxisAngle(AXIS_Z, 90 * DEG);
    const b = fromAxisAngle(AXIS_X, 90 * DEG);
    // b maps +Y to +Z, then a leaves +Z unchanged.
    close(rotate(mulQuat(a, b), vec3(0, 1, 0)), vec3(0, 0, 1));
  });

  it('XYZ Euler applies X, then Y, then Z (global axes), like Blender', () => {
    const q = fromEulerXYZ(vec3(90 * DEG, 0, 90 * DEG));
    // X 90°: +Y -> +Z. Z 90°: +Z unchanged.
    close(rotate(q, vec3(0, 1, 0)), vec3(0, 0, 1));
    // X 90°: +Z -> -Y. Z 90°: -Y -> +X.
    close(rotate(q, vec3(0, 0, 1)), vec3(1, 0, 0));
  });

  it('slerp goes half way', () => {
    const a = fromAxisAngle(AXIS_Z, 0);
    const b = fromAxisAngle(AXIS_Z, 90 * DEG);
    const m = slerp(a, b, 0.5);
    expect(angleBetween(m, fromAxisAngle(AXIS_Z, 45 * DEG))).toBeCloseTo(0, 6);
  });
});
