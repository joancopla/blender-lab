import { describe, expect, it } from 'vitest';
import { type Vec3, vec3 } from '../math/vec3';
import { faceCenter, faceNormal } from '../mesh/geometry';
import { type MeshData, meshCounts, meshFromFaces } from '../mesh/mesh-data';
import { primitiveMesh } from '../mesh/primitives';
import { validateMesh } from '../mesh/validate';
import { mesh as meshObject, sceneWith } from '../scene/factory';
import { type MeshObject, meshLocalBounds, meshOf } from '../scene/scene';
import { applyArray } from './array';
import { bisectMesh } from './bisect';
import { applyMirror } from './mirror';
import { evaluatedMesh, modifierEvaluations } from './stack';
import { type ArrayModifier, type Modifier, type MirrorModifier, newModifier } from './types';

const cube = primitiveMesh('cube');
const mirror = (patch: Partial<MirrorModifier> = {}): MirrorModifier => ({
  ...(newModifier('MIRROR') as MirrorModifier),
  ...patch,
});
const array = (patch: Partial<ArrayModifier> = {}): ArrayModifier => ({
  ...(newModifier('ARRAY') as ArrayModifier),
  ...patch,
});
const counts = (m: MeshData) => {
  const c = meshCounts(m);
  return { verts: c.verts, edges: c.edges, faces: c.faces };
};
const bounds = (m: MeshData) => meshLocalBounds(m);
const close = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
  expect(a.z).toBeCloseTo(b.z, 6);
};

/** Every face normal points away from the centre of the island it belongs to (given). */
function outward(m: MeshData, centreOf: (faceCentre: Vec3) => Vec3): boolean {
  return m.faces.every((_, f) => {
    const c = faceCenter(m, f);
    const n = faceNormal(m, f);
    const k = centreOf(c);
    return (c.x - k.x) * n.x + (c.y - k.y) * n.y + (c.z - k.z) * n.z > 0;
  });
}

describe('bisect', () => {
  it('cuts the cube in half, keeping the side opposite the kill normal', () => {
    const half = bisectMesh(cube, vec3(0, 0, 0), vec3(-1, 0, 0), 0.001);
    expect(counts(half)).toEqual({ verts: 8, edges: 12, faces: 5 });
    expect(bounds(half).min.x).toBeCloseTo(0);
    expect(bounds(half).max.x).toBeCloseTo(1);
    expect(validateMesh(half)).toEqual([]);
  });

  it('leaves the mesh untouched when nothing is on the kill side', () => {
    expect(bisectMesh(cube, vec3(2, 0, 0), vec3(1, 0, 0), 0.001)).toBe(cube);
  });
});

describe('Mirror modifier', () => {
  it('X by default: a copy reflected across the object origin', () => {
    const m = applyMirror(cube, mirror(), null);
    // The cube does not touch the plane: nothing merges, both copies overlap.
    expect(counts(m)).toEqual({ verts: 16, edges: 24, faces: 12 });
    expect(validateMesh(m)).toEqual([]);
    expect(outward(m, () => vec3(0, 0, 0))).toBe(true);
  });

  it('bisect + merge: half a cube becomes a cube with a seam loop, joined', () => {
    const m = applyMirror(cube, mirror({ useBisectAxis: [true, false, false] }), null);
    expect(counts(m)).toEqual({ verts: 12, edges: 20, faces: 10 });
    // No boundary edges left and the normals agree across the seam.
    expect(validateMesh(m)).toEqual([]);
    close(bounds(m).min, vec3(-1, -1, -1));
    close(bounds(m).max, vec3(1, 1, 1));
  });

  it('bisect keeps the positive side; Flip keeps the negative side', () => {
    const shifted: MeshData = { ...cube, verts: cube.verts.map((v) => vec3(v.x + 0.5, v.y, v.z)) };
    const keepPos = applyMirror(shifted, mirror({ useBisectAxis: [true, false, false] }), null);
    expect(bounds(keepPos).max.x).toBeCloseTo(1.5);
    const keepNeg = applyMirror(
      shifted,
      mirror({ useBisectAxis: [true, false, false], useBisectFlipAxis: [true, false, false] }),
      null,
    );
    expect(bounds(keepNeg).max.x).toBeCloseTo(0.5);
  });

  it('merges a vertex with its own reflection when closer than the distance, at the midpoint', () => {
    // A strip of two quads whose left edge is near the X plane.
    const strip = (x0: number) =>
      meshFromFaces(
        [vec3(x0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(x0, 1, 0)],
        [[0, 1, 2, 3]],
      );
    const near = applyMirror(strip(0.0004), mirror(), null);
    expect(counts(near)).toEqual({ verts: 6, edges: 7, faces: 2 });
    expect(near.verts.filter((v) => v.x === 0).length).toBe(2);
    expect(validateMesh(near)).toEqual([]);

    const far = applyMirror(strip(0.0006), mirror(), null);
    expect(counts(far).verts).toBe(8);

    const off = applyMirror(strip(0.0004), mirror({ useMirrorMerge: false }), null);
    expect(counts(off).verts).toBe(8);
  });

  it('X and Y: applied one after the other', () => {
    const m = applyMirror(
      cube,
      mirror({ useAxis: [true, true, false], useBisectAxis: [true, true, false] }),
      null,
    );
    expect(counts(m)).toEqual({ verts: 18, edges: 32, faces: 16 });
    expect(validateMesh(m)).toEqual([]);
  });

  it('Mirror Object: reflects across the other object’s planes, in local space', () => {
    const o = { ...meshObject('a', 'Cube', 'cube', vec3(0, 0, 0)), modifiers: [mirror({ mirrorObjectId: 'b' })] };
    const target = meshObject('b', 'Empty', 'plane', vec3(2, 0, 0));
    const m = evaluatedMesh(o, sceneWith([o, target]));
    close(bounds(m).min, vec3(-1, -1, -1));
    close(bounds(m).max, vec3(5, 1, 1));
  });

  it('Mirror Object follows scale and rotation of both objects', () => {
    // Object scaled 2x: the other object at world x = 2 is at local x = 1.
    const o = {
      ...meshObject('a', 'Cube', 'cube', vec3(0, 0, 0), vec3(0, 0, 0), vec3(2, 2, 2)),
      modifiers: [mirror({ mirrorObjectId: 'b' })],
    };
    const target = meshObject('b', 'Empty', 'plane', vec3(2, 0, 0), vec3(0, 0, 90));
    const m = evaluatedMesh(o, sceneWith([o, target]));
    // Rotated 90° around Z, the target's X axis is world Y: the mirror plane is y = 0 (local).
    close(bounds(m).min, vec3(-1, -1, -1));
    close(bounds(m).max, vec3(1, 1, 1));
    expect(counts(m).verts).toBe(16);
  });
});

describe('Array modifier', () => {
  it('Count 3 with the default relative offset: copies side by side along X', () => {
    const m = applyArray(cube, array({ count: 3 }));
    expect(counts(m)).toEqual({ verts: 24, edges: 36, faces: 18 });
    close(bounds(m).min, vec3(-1, -1, -1));
    close(bounds(m).max, vec3(5, 1, 1));
  });

  it('relative offset is measured on the input mesh size', () => {
    const flat: MeshData = { ...cube, verts: cube.verts.map((v) => vec3(v.x, v.y, v.z * 0.1)) };
    const m = applyArray(flat, array({ count: 4, relativeOffsetDisplace: vec3(0, 0, 1) }));
    expect(bounds(m).max.z).toBeCloseTo(0.1 + 3 * 0.2);
  });

  it('constant offset adds to the relative offset', () => {
    const m = applyArray(cube, array({ useConstantOffset: true, constantOffsetDisplace: vec3(0, 0, 0.5) }));
    close(bounds(m).max, vec3(3, 1, 1.5));
    const only = applyArray(
      cube,
      array({ useRelativeOffset: false, useConstantOffset: true, constantOffsetDisplace: vec3(0, 0, 3) }),
    );
    close(bounds(only).max, vec3(1, 1, 4));
  });

  it('Merge joins touching copies (the shared faces stay, as in Blender)', () => {
    const m = applyArray(cube, array({ count: 3, useMergeVertices: true }));
    expect(counts(m).verts).toBe(16);
    expect(counts(m).faces).toBe(16);
  });

  it('Merge with First Last joins the last copy to the first', () => {
    const stacked = array({
      count: 3,
      useRelativeOffset: false,
      useConstantOffset: true,
      constantOffsetDisplace: vec3(0, 0, 0),
      useMergeVertices: true,
      useMergeVerticesCap: true,
    });
    expect(counts(applyArray(cube, stacked)).verts).toBe(8);
  });

  it('Count 1 returns the input', () => {
    expect(applyArray(cube, array({ count: 1 }))).toBe(cube);
  });
});

describe('modifier stack', () => {
  const withMods = (id: string, mods: Modifier[]): MeshObject => ({
    ...meshObject(id, 'Cube', 'cube', vec3(0, 0, 0)),
    modifiers: mods,
  });

  it('no modifiers: the base mesh itself', () => {
    const o = meshObject('plain', 'Cube', 'cube', vec3(0, 0, 0));
    expect(evaluatedMesh(o, sceneWith([o]))).toBe(meshOf(o));
  });

  it('evaluates in order: the order changes the result', () => {
    const a = withMods('order1', [array(), mirror()]);
    const b = withMods('order2', [mirror({ mirrorObjectId: null }), array()]);
    // Array then Mirror: -1..3 mirrored -> -3..3. Mirror then Array: -1..1 (overlapping) -> -1..3.
    expect(bounds(evaluatedMesh(a, sceneWith([a]))).min.x).toBeCloseTo(-3);
    expect(bounds(evaluatedMesh(b, sceneWith([b]))).min.x).toBeCloseTo(-1);
  });

  it('Realtime off skips the modifier in the viewport; Render uses the Render toggle', () => {
    const o = withMods('toggles', [array({ showViewport: false })]);
    const s = sceneWith([o]);
    expect(evaluatedMesh(o, s)).toBe(meshOf(o));
    expect(counts(evaluatedMesh(o, s, 'render')).verts).toBe(16);
  });

  it('in Edit Mode, only modifiers with Edit Mode on', () => {
    const o = withMods('edit', [array({ showInEditMode: false })]);
    const s = { ...sceneWith([o]), editObjectIds: ['edit'] };
    expect(evaluatedMesh(o, s)).toBe(meshOf(o));
  });

  it('caches: nothing is recomputed while nothing changes', () => {
    const o = withMods('cache1', [mirror(), array()]);
    const s = sceneWith([o]);
    const first = evaluatedMesh(o, s);
    const n = modifierEvaluations();
    // A moved object (new object data, same mesh and modifiers) reuses the result.
    const moved = { ...o, location: vec3(3, 0, 0) };
    expect(evaluatedMesh(moved, sceneWith([moved]))).toBe(first);
    expect(modifierEvaluations()).toBe(n);
  });

  it('caches per modifier: changing the last one does not recompute the first', () => {
    const m1 = mirror();
    const o = withMods('cache2', [m1, array()]);
    evaluatedMesh(o, sceneWith([o]));
    const n = modifierEvaluations();
    const changed = withMods('cache2', [m1, array({ count: 5 })]);
    evaluatedMesh(changed, sceneWith([changed]));
    expect(modifierEvaluations()).toBe(n + 1);
  });

  it('Mirror Object: moving the other object recomputes', () => {
    const o = withMods('cache3', [mirror({ mirrorObjectId: 'b' })]);
    const b1 = meshObject('b', 'Empty', 'plane', vec3(2, 0, 0));
    const r1 = evaluatedMesh(o, sceneWith([o, b1]));
    const b2 = { ...b1, location: vec3(3, 0, 0) };
    const r2 = evaluatedMesh(o, sceneWith([o, b2]));
    expect(r2).not.toBe(r1);
    expect(bounds(r2).max.x).toBeCloseTo(7);
  });
});
