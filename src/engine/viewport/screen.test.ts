import { describe, expect, it } from 'vitest';
import { vec3, dot } from '../math/vec3';
import type { DisplayedView } from './navigator';
import { screenRay, viewProjection, worldToScreen } from './screen';
import { AXIS_VIEW_ROTATIONS, defaultViewState } from './view-state';

const SIZE = { width: 800, height: 600 };

const front = (projection: 'perspective' | 'orthographic'): DisplayedView => ({
  rotation: AXIS_VIEW_ROTATIONS.front,
  target: vec3(0, 0, 0),
  distance: 10,
  projection,
  camera: null,
});

describe('screen projection', () => {
  for (const projection of ['perspective', 'orthographic'] as const) {
    it(`${projection}: the target projects to the centre`, () => {
      const vp = viewProjection(front(projection), SIZE, null);
      const p = worldToScreen(vp, SIZE, vec3(0, 0, 0))!;
      expect(p.x).toBeCloseTo(400, 9);
      expect(p.y).toBeCloseTo(300, 9);
      expect(p.depth).toBeCloseTo(10, 9);
    });

    it(`${projection}: +X is to the right and +Z is up in the Front view`, () => {
      const vp = viewProjection(front(projection), SIZE, null);
      const px = worldToScreen(vp, SIZE, vec3(1, 0, 0))!;
      const pz = worldToScreen(vp, SIZE, vec3(0, 0, 1))!;
      expect(px.x).toBeGreaterThan(400);
      expect(pz.y).toBeLessThan(300);
    });

    it(`${projection}: screenRay goes back through the projected point`, () => {
      const view = { ...front(projection), rotation: defaultViewState().rotation };
      const vp = viewProjection(view, SIZE, null);
      const p = vec3(1.2, -0.7, 0.4);
      const s = worldToScreen(vp, SIZE, p)!;
      const ray = screenRay(vp, SIZE, s.x, s.y);
      // Distance from p to the ray is ~0.
      const d = vec3(p.x - ray.origin.x, p.y - ray.origin.y, p.z - ray.origin.z);
      const t = dot(d, ray.direction);
      const closest = vec3(ray.origin.x + ray.direction.x * t, ray.origin.y + ray.direction.y * t, ray.origin.z + ray.direction.z * t);
      expect(Math.hypot(closest.x - p.x, closest.y - p.y, closest.z - p.z)).toBeLessThan(1e-9);
    });
  }

  it('points behind the eye do not project in perspective', () => {
    const vp = viewProjection(front('perspective'), SIZE, null);
    expect(worldToScreen(vp, SIZE, vec3(0, -20, 0))).toBeNull();
  });
});
