import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from './default-scene';
import { type MeshObject, activeObject, objectWorldBounds, selectedObjects, unionBounds } from './scene';

const cube = (over: Partial<MeshObject> = {}): MeshObject => ({
  id: 'c',
  name: 'Cube',
  type: 'mesh',
  primitive: 'cube',
  location: vec3(0, 0, 0),
  rotationDeg: vec3(0, 0, 0),
  scale: vec3(1, 1, 1),
  ...over,
});

describe('scene bounds', () => {
  it('default cube is 2 m wide around the origin', () => {
    expect(objectWorldBounds(cube())).toEqual({ min: vec3(-1, -1, -1), max: vec3(1, 1, 1) });
  });

  it('applies scale and location', () => {
    const b = objectWorldBounds(cube({ location: vec3(0, 0, 2), scale: vec3(2, 1, 0.5) }));
    expect(b.min).toEqual(vec3(-2, -1, 1.5));
    expect(b.max).toEqual(vec3(2, 1, 2.5));
  });

  it('a 45° rotation around Z widens the box to √2', () => {
    const b = objectWorldBounds(cube({ rotationDeg: vec3(0, 0, 45) }));
    expect(b.max.x).toBeCloseTo(Math.SQRT2, 9);
    expect(b.max.z).toBeCloseTo(1, 9);
  });

  it('cameras and lights are points', () => {
    const s = blenderDefaultScene();
    const all = unionBounds(s.objects)!;
    expect(all.max.x).toBeCloseTo(7.3589, 6);
    expect(all.min.y).toBeCloseTo(-6.9258, 6);
    expect(all.max.z).toBeCloseTo(5.9039, 6);
    expect(unionBounds([])).toBeNull();
  });
});

describe('default scene', () => {
  it('has the Cube selected and active', () => {
    const s = blenderDefaultScene();
    expect(activeObject(s)?.name).toBe('Cube');
    expect(selectedObjects(s).map((o) => o.name)).toEqual(['Cube']);
  });
});
