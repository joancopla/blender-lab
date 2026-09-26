import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import { ClearLocationOp, ClearRotationOp, ClearScaleOp } from './clear';

const moved = () => {
  const s = blenderDefaultScene();
  return {
    ...s,
    objects: s.objects.map((o) =>
      o.id === 'cube' ? { ...o, location: vec3(1, 2, 3), rotationDeg: vec3(10, 20, 30), scale: vec3(2, 2, 2) } : o,
    ),
  };
};

describe('clear transforms', () => {
  it('Alt+G / Alt+R / Alt+S reset only the selected objects', () => {
    const s = moved();
    const loc = ClearLocationOp.apply(s);
    const cube = loc.objects.find((o) => o.id === 'cube')!;
    expect(cube.location).toEqual(vec3(0, 0, 0));
    expect(cube.rotationDeg).toEqual(vec3(10, 20, 30));
    expect(ClearRotationOp.apply(s).objects.find((o) => o.id === 'cube')!.rotationDeg).toEqual(vec3(0, 0, 0));
    expect(ClearScaleOp.apply(s).objects.find((o) => o.id === 'cube')!.scale).toEqual(vec3(1, 1, 1));
    // The camera is not selected: untouched.
    expect(loc.objects.find((o) => o.id === 'camera')).toBe(s.objects.find((o) => o.id === 'camera'));
  });

  it('returns the same state when there is nothing to clear', () => {
    const s = blenderDefaultScene();
    expect(ClearLocationOp.apply(s)).toBe(s);
  });
});
