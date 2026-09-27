import { describe, expect, it } from 'vitest';
import { type Vec3, length, sub, vec3 } from '../math/vec3';
import { type MeshData, meshCounts, meshFromFaces } from '../mesh/mesh-data';
import { cylinderMesh, primitiveMesh } from '../mesh/primitives';
import { validateMesh } from '../mesh/validate';
import { mesh as meshObject, sceneWith } from '../scene/factory';
import { meshLocalBounds } from '../scene/scene';
import { applyBevel } from './bevel';
import { evaluatedMesh, modifierWarnings } from './stack';
import { applySubsurf, limitPositions, subdivideOnce } from './subsurf';
import { type BevelModifier, type SubsurfModifier, newModifier } from './types';

const cube = primitiveMesh('cube');
const plane = primitiveMesh('plane');
const subsurf = (patch: Partial<SubsurfModifier> = {}): SubsurfModifier => ({
  ...(newModifier('SUBSURF') as SubsurfModifier),
  ...patch,
});
const bevel = (patch: Partial<BevelModifier> = {}): BevelModifier => ({
  ...(newModifier('BEVEL') as BevelModifier),
  ...patch,
});
const counts = (m: MeshData) => {
  const c = meshCounts(m);
  return { verts: c.verts, edges: c.edges, faces: c.faces };
};
const has = (m: MeshData, p: Vec3, eps = 1e-6) => m.verts.some((v) => length(sub(v, p)) < eps);
/** The vertex set is the same after mirroring any axis. */
const symmetric = (m: MeshData) =>
  m.verts.every((v) => has(m, vec3(-v.x, v.y, v.z), 1e-5) && has(m, vec3(v.x, -v.y, v.z), 1e-5) && has(m, vec3(v.x, v.y, -v.z), 1e-5));

describe('Subdivision Surface: Catmull-Clark', () => {
  it('one level on the cube: counts and the classic positions (without limit surface)', () => {
    const m = subdivideOnce(cube, true);
    expect(counts(m)).toEqual({ verts: 26, edges: 48, faces: 24 });
    expect(validateMesh(m)).toEqual([]);
    expect(has(m, vec3(5 / 9, 5 / 9, 5 / 9))).toBe(true); // moved corner
    expect(has(m, vec3(0.75, 0.75, 0))).toBe(true); // edge point
    expect(has(m, vec3(1, 0, 0))).toBe(true); // face point
  });

  it('levels 1, 2, 3: counts, valid and symmetric', () => {
    const expected = [
      { verts: 26, edges: 48, faces: 24 },
      { verts: 98, edges: 192, faces: 96 },
      { verts: 386, edges: 768, faces: 384 },
    ];
    expected.forEach((c, i) => {
      const m = applySubsurf(cube, subsurf(), i + 1);
      expect(counts(m)).toEqual(c);
      expect(validateMesh(m)).toEqual([]);
      expect(symmetric(m)).toBe(true);
    });
  });

  it('limit surface pulls the vertices in (smaller than plain Catmull-Clark)', () => {
    const plain = applySubsurf(cube, subsurf({ useLimitSurface: false }), 1);
    const limit = applySubsurf(cube, subsurf(), 1);
    expect(meshLocalBounds(limit).max.x).toBeLessThan(meshLocalBounds(plain).max.x);
    // A flat region stays flat on the limit surface.
    expect(applySubsurf(plane, subsurf(), 2).verts.every((v) => Math.abs(v.z) < 1e-12)).toBe(true);
  });

  it('open boundaries are smoothed as creases (Boundary Smooth: All)', () => {
    const one = subdivideOnce(plane, true);
    expect(has(one, vec3(0.75, 0.75, 0))).toBe(true); // 3/4 v + 1/8 (neighbours)
    // Limit: (b0 + 4 v + b1) / 6 with the boundary neighbours (0,1,0) and (1,0,0).
    expect(has(limitPositions(one), vec3(2 / 3, 2 / 3, 0))).toBe(true);
    expect(counts(applySubsurf(plane, subsurf(), 2))).toEqual({ verts: 25, edges: 40, faces: 16 });
  });

  it('n-gons and triangles become quads', () => {
    const hex = cylinderMesh(6);
    const m = applySubsurf(hex, subsurf(), 1);
    expect(counts(m)).toEqual({ verts: 12 + 8 + 18, edges: 36 + 36, faces: 6 * 4 + 2 * 6 });
    expect(m.faces.every((f) => f.length === 4)).toBe(true);
    expect(validateMesh(m)).toEqual([]);
    const tri = meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0)], [[0, 1, 2]]);
    expect(counts(applySubsurf(tri, subsurf(), 1))).toEqual({ verts: 7, edges: 9, faces: 3 });
  });

  it('level 0 does nothing', () => {
    expect(applySubsurf(cube, subsurf(), 0)).toBe(cube);
  });
});

describe('Subdivision Surface: Simple', () => {
  it('splits without moving: the cube stays a cube', () => {
    const m = applySubsurf(cube, subsurf({ subdivisionType: 'SIMPLE' }), 2);
    expect(counts(m)).toEqual({ verts: 98, edges: 192, faces: 96 });
    expect(m.verts.every((v) => Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) === 1)).toBe(true);
  });
});

describe('Subdivision Surface in the stack', () => {
  it('Levels Viewport is limited to 3 in the lab; Render uses Levels Render', () => {
    const o = { ...meshObject('ss', 'Cube', 'cube', vec3(0, 0, 0)), modifiers: [subsurf({ levels: 5, renderLevels: 2 })] };
    const s = sceneWith([o]);
    expect(counts(evaluatedMesh(o, s)).faces).toBe(384);
    expect(counts(evaluatedMesh(o, s, 'render')).faces).toBe(96);
  });
});

describe('Bevel modifier', () => {
  it('defaults on the cube: every edge beveled, triangle corners', () => {
    const m = applyBevel(cube, bevel()).mesh;
    expect(counts(m)).toEqual({ verts: 24, edges: 48, faces: 26 });
    expect(validateMesh(m)).toEqual([]);
    expect(has(m, vec3(1, 0.9, 0.9))).toBe(true); // corner of the +X face, inset by the Amount
    expect(meshLocalBounds(m).max.x).toBeCloseTo(1);
  });

  it('2 segments: quarter-circle profiles, corners of 3 quads on a sphere', () => {
    const m = applyBevel(cube, bevel({ segments: 2 })).mesh;
    expect(counts(m)).toEqual({ verts: 56, edges: 108, faces: 54 });
    expect(validateMesh(m)).toEqual([]);
    const w = 0.1;
    const c = 1 - w;
    // Profile middle of the edge along Z at x = y = 1: on the circle of radius w.
    expect(has(m, vec3(c + w / Math.SQRT2, c + w / Math.SQRT2, c), 1e-9)).toBe(true);
    // Corner centre on the sphere of radius w.
    expect(has(m, vec3(c + w / Math.sqrt(3), c + w / Math.sqrt(3), c + w / Math.sqrt(3)), 1e-9)).toBe(true);
  });

  it('3 segments: corners with a triangle in the middle, all points on the sphere', () => {
    const m = applyBevel(cube, bevel({ segments: 3 })).mesh;
    expect(counts(m)).toEqual({ verts: 96, edges: 192, faces: 98 });
    expect(validateMesh(m)).toEqual([]);
    expect(m.faces.filter((f) => f.length === 3).length).toBe(8);
    const centre = vec3(0.9, 0.9, 0.9);
    const corner = m.verts.filter((v) => v.x > 0.9 + 1e-9 && v.y > 0.9 + 1e-9 && v.z > 0.9 + 1e-9);
    expect(corner.length).toBeGreaterThan(0);
    for (const v of corner) expect(length(sub(v, centre))).toBeCloseTo(0.1, 9);
  });

  it('4 segments: valid and symmetric', () => {
    const m = applyBevel(cube, bevel({ segments: 4 })).mesh;
    expect(validateMesh(m)).toEqual([]);
    expect(symmetric(m)).toBe(true);
  });

  it('Limit Method Angle on a cylinder: only the cap rims (loops through the ring)', () => {
    const cyl = cylinderMesh(32);
    const m = applyBevel(cyl, bevel()).mesh;
    expect(counts(m)).toEqual({ verts: 128, edges: 128 + 98 - 2, faces: 34 + 64 });
    expect(validateMesh(m)).toEqual([]);
    // Rim pushed down the sides by the Amount.
    expect(m.verts.some((v) => Math.abs(v.z - 0.9) < 1e-9)).toBe(true);
  });

  it('Limit Method None bevels every edge between two faces', () => {
    // Side faces are 0.196 m wide: 0.05 m on each side still fits.
    const cyl = cylinderMesh(32);
    const m = applyBevel(cyl, bevel({ limitMethod: 'NONE', width: 0.05 })).mesh;
    expect(counts(m).verts).toBe(64 * 3);
    expect(validateMesh(m)).toEqual([]);
  });

  it('Clamp Overlap: a huge Amount stops where the new vertices would cross', () => {
    const m = applyBevel(cube, bevel({ width: 5 })).mesh;
    expect(m.verts.every((v) => Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) <= 1 + 1e-9)).toBe(true);
  });

  it('an unsupported vertex (a sphere pole with every edge beveled): nothing happens, with a warning', () => {
    const sphere = primitiveMesh('uvSphere');
    const r = applyBevel(sphere, bevel({ limitMethod: 'NONE' }));
    expect(r.unsupported).toBe(true);
    expect(r.mesh).toBe(sphere);
    const o = {
      ...meshObject('bv', 'Sphere', 'uvSphere', vec3(0, 0, 0)),
      modifiers: [bevel({ name: 'Bevel', limitMethod: 'NONE' })],
    };
    expect(modifierWarnings(o, sceneWith([o])).get('Bevel')).toBe('bevelUnsupported');
  });

  it('Bevel then Subdivision: a rounded cube', () => {
    const o = {
      ...meshObject('bs', 'Cube', 'cube', vec3(0, 0, 0)),
      modifiers: [bevel({ segments: 2 }), subsurf({ levels: 1 })],
    };
    const m = evaluatedMesh(o, sceneWith([o]));
    expect(validateMesh(m)).toEqual([]);
    expect(symmetric(m)).toBe(true);
  });
});
