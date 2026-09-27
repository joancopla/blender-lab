import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { analyzeMesh } from '../mesh/analyze';
import { meshFromFaces } from '../mesh/mesh-data';
import { cubeMesh, cylinderMesh, uvSphereMesh } from '../mesh/primitives';
import { extrudeRegion } from '../mesh/ops/extrude';
import { compareSilhouettes, worldTriangles } from './silhouette';

const place = (x = 0, s = 1) => ({ location: vec3(x, 0, 0), rotationDeg: vec3(0, 0, 0), scale: vec3(s, s, s) });

describe('topology analyser', () => {
  it('a clean cube has nothing to report', () => {
    expect(analyzeMesh(cubeMesh())).toEqual({ ngons: [], triangles: [], duplicates: [], nonManifoldEdges: [], flippedFaces: [] });
  });

  it('counts n-gons and triangles', () => {
    const r = analyzeMesh(cylinderMesh(8));
    expect(r.ngons).toHaveLength(2);
    expect(analyzeMesh(uvSphereMesh(8, 4)).triangles).toHaveLength(16);
  });

  it('finds duplicated vertices and the non-manifold edges they cause', () => {
    const cube = cubeMesh();
    const verts = [...cube.verts, ...[1, 3, 5, 7].map((v) => cube.verts[v]!)];
    const copy = new Map([
      [1, 8],
      [3, 9],
      [5, 10],
      [7, 11],
    ]);
    const split = meshFromFaces(verts, cube.faces.map((f, i) => (i === 5 ? f.map((v) => copy.get(v)!) : f)));
    const r = analyzeMesh(split);
    expect(r.duplicates).toHaveLength(4);
    expect(r.nonManifoldEdges.length).toBeGreaterThan(0);
  });

  it('finds a flipped face, and a whole cube turned inside out', () => {
    const cube = cubeMesh();
    const one = { ...cube, faces: cube.faces.map((f, i) => (i === 2 ? [...f].reverse() : f)) };
    expect(analyzeMesh(one).flippedFaces).toEqual([2]);
    const inside = { ...cube, faces: cube.faces.map((f) => [...f].reverse()) };
    expect(analyzeMesh(inside).flippedFaces).toHaveLength(6);
  });
});

describe('silhouettes', () => {
  it('identical shapes: IoU 1 in all three views', () => {
    const a = worldTriangles(cubeMesh(), place());
    const res = compareSilhouettes(a, a);
    expect(res.map((r) => r.iou)).toEqual([1, 1, 1]);
    expect(res[0]!.zone).toBeNull();
  });

  it('topology does not matter: an extruded-then-flattened cube equals a cube', () => {
    const r = extrudeRegion(cubeMesh(), [5]);
    const same = compareSilhouettes(worldTriangles(r.mesh, place()), worldTriangles(cubeMesh(), place()));
    for (const v of same) expect(v.iou).toBeGreaterThan(0.99);
  });

  it('a taller shape fails in Front and Right, but not Top; the zone points at the top', () => {
    const r = extrudeRegion(cubeMesh(), [5]);
    const up = { ...r.mesh, verts: r.mesh.verts.map((v, i) => (r.mesh.faces[5]!.includes(i) ? vec3(v.x, v.y, v.z + 1) : v)) };
    const res = compareSilhouettes(worldTriangles(up, place()), worldTriangles(cubeMesh(), place()));
    const [front, right, top] = res;
    expect(front!.iou).toBeLessThan(0.8);
    expect(right!.iou).toBeLessThan(0.8);
    expect(top!.iou).toBeGreaterThan(0.99);
    expect(front!.zone).toMatch(/^top/);
    expect(front!.kind).toBe('extra');
  });

  it('a smaller shape reports missing', () => {
    const res = compareSilhouettes(worldTriangles(cubeMesh(), place(0, 0.5)), worldTriangles(cubeMesh(), place()));
    expect(res[0]!.kind).toBe('missing');
    expect(res[0]!.iou).toBeCloseTo(0.25, 1);
  });
});
