import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { mesh, sceneWith } from '../scene/factory';
import type { LightObject, SceneState } from '../scene/scene';
import { measure, sceneTriangles, stopsBetween, surfaceAlong } from './light-meter';

/** A 8 m floor, a 2 m cube on it, and one light straight above the cube. */
function setup(light: Partial<LightObject>): SceneState {
  const s = sceneWith([mesh('floor', 'Plane', 'plane', vec3(0, 0, 0), vec3(0, 0, 0), vec3(4, 4, 1)), mesh('cube', 'Cube', 'cube', vec3(0, 0, 1))]);
  const l: LightObject = {
    id: 'l',
    name: 'Light',
    type: 'light',
    lightType: 'POINT',
    location: vec3(0, 0, 6),
    rotationDeg: vec3(0, 0, 0),
    scale: vec3(1, 1, 1),
    shadowSoftSize: 0,
    ...light,
  };
  return { ...s, objects: [...s.objects.filter((o) => o.type !== 'light'), l], world: { color: vec3(0, 0, 0), strength: 1 } };
}
const up = vec3(0, 0, 1);

describe('light meter', () => {
  it('finds the surface under a ray, with its normal facing the ray', () => {
    const s = setup({});
    const hit = surfaceAlong(sceneTriangles(s), vec3(3, 0, 10), vec3(0, 0, -1))!;
    expect(hit.objectId).toBe('floor');
    expect(hit.point.z).toBeCloseTo(0, 9);
    expect(hit.normal.z).toBeCloseTo(1, 9);
    expect(surfaceAlong(sceneTriangles(s), vec3(0, 0, 10), vec3(0, 0, -1))!.objectId).toBe('cube');
  });

  it('in the open: the light physics; under the cube: in shadow', () => {
    const s = setup({});
    const open = measure(s, vec3(3, 0, 0), up);
    expect(open.lights[0]!.irradiance).toBeCloseTo(((1000 / (4 * Math.PI)) * (6 / Math.hypot(3, 6))) / 45, 9);
    expect(measure(s, vec3(0.5, 0, 0), up).lights[0]!.irradiance).toBe(0);
    // Cast Shadow off: no shadow.
    expect(measure(setup({ useShadow: false }), vec3(0.5, 0, 0), up).lights[0]!.irradiance).toBeGreaterThan(0);
  });

  it('the Sun is blocked by the cube too, and the World adds its light', () => {
    const s = setup({ lightType: 'SUN', energy: 2 });
    expect(measure(s, vec3(0.5, 0, 0), up).lights[0]!.irradiance).toBe(0);
    expect(measure(s, vec3(3, 0, 0), up).lights[0]!.irradiance).toBeCloseTo(2, 9);
    const lit = { ...s, world: { color: vec3(1, 1, 1), strength: 0.5 } };
    expect(measure(lit, vec3(3, 0, 0), up).world).toBeCloseTo(0.5 * Math.PI, 9);
  });

  it('twice the distance is a quarter: two stops', () => {
    const near = measure(setup({ location: vec3(3, 0, 2) }), vec3(3, 0, 0), up).total;
    const far = measure(setup({ location: vec3(3, 0, 4) }), vec3(3, 0, 0), up).total;
    expect(stopsBetween(near, far)).toBeCloseTo(2, 9);
  });
});
