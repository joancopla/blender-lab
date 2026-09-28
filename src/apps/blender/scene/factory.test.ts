import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { lightPose } from '../render/light-physics';
import { light } from './factory';

describe('aiming lights', () => {
  it('local -Z points at the target', () => {
    for (const [from, to] of [
      [vec3(3, -2, 4), vec3(0, 0, 1)],
      [vec3(0, 0, 5), vec3(0, 0, 0)],
      [vec3(0, 0, -5), vec3(0, 0, 0)],
    ] as const) {
      const d = lightPose(light('l', 'L', 'SPOT', from, to)).direction;
      const want = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
      const len = Math.hypot(want.x, want.y, want.z);
      expect(d.x).toBeCloseTo(want.x / len, 6);
      expect(d.y).toBeCloseTo(want.y / len, 6);
      expect(d.z).toBeCloseTo(want.z / len, 6);
    }
  });
});
