import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { mesh } from '../scene/factory';
import { ghostDistance, matchesGhost } from './ghost-match';

describe('ghost matching', () => {
  it('location within tolerance', () => {
    const g = mesh('g', 'g', 'cube', vec3(3, 0, 1));
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(3.05, 0, 1)), g)).toBe(true);
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(3.2, 0, 1)), g)).toBe(false);
  });

  it('a cube rotated 90° matches, 45° does not', () => {
    const g = mesh('g', 'g', 'cube', vec3(0, 0, 0));
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(0, 0, 0), vec3(0, 0, 90)), g)).toBe(true);
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(0, 0, 0), vec3(90, 180, -90)), g)).toBe(true);
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(0, 0, 0), vec3(0, 0, 45)), g)).toBe(false);
  });

  it('scale counts', () => {
    const g = mesh('g', 'g', 'cube', vec3(0, 0, 0), vec3(0, 0, 0), vec3(1.5, 1.5, 1.5));
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(0, 0, 0), vec3(0, 0, 0), vec3(1.5, 1.5, 1.5)), g)).toBe(true);
    expect(matchesGhost(mesh('c', 'Cube', 'cube', vec3(0, 0, 0)), g)).toBe(false);
  });

  it('a sphere ignores rotation; a cone does not flip', () => {
    const s = mesh('g', 'g', 'uvSphere', vec3(1, 1, 1));
    expect(matchesGhost(mesh('s', 'Sphere', 'uvSphere', vec3(1, 1, 1), vec3(30, 60, 10)), s)).toBe(true);
    const c = mesh('g', 'g', 'cone', vec3(0, 0, 1));
    expect(matchesGhost(mesh('c', 'Cone', 'cone', vec3(0, 0, 1), vec3(180, 0, 0)), c)).toBe(false);
    expect(matchesGhost(mesh('c', 'Cone', 'cone', vec3(0, 0, 1), vec3(0, 0, 77)), c)).toBe(true);
  });

  it('a cylinder upside down matches', () => {
    const c = mesh('g', 'g', 'cylinder', vec3(0, 0, 1));
    expect(matchesGhost(mesh('c', 'Cylinder', 'cylinder', vec3(0, 0, 1), vec3(180, 0, 0)), c)).toBe(true);
    expect(matchesGhost(mesh('c', 'Cylinder', 'cylinder', vec3(0, 0, 1), vec3(90, 0, 0)), c)).toBe(false);
  });

  it('different primitives never match', () => {
    expect(ghostDistance(mesh('a', 'a', 'cube', vec3(0, 0, 0)), mesh('b', 'b', 'uvSphere', vec3(0, 0, 0)))).toBe(Infinity);
  });
});
