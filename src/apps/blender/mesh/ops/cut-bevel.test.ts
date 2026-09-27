import { describe, expect, it } from 'vitest';
import { length, sub, vec3 } from '../../math/vec3';
import { type MeshData, meshCounts, meshFromFaces } from '../mesh-data';
import { cubeMesh, cylinderMesh } from '../primitives';
import { MeshTopology } from '../topology';
import { validateMesh } from '../validate';
import { bevelEdges, bevelVerts, profilePoints } from './bevel';
import { cutParameters, loopCut, loopCutPreview, orientedRing } from './loopcut';

const counts = (m: MeshData) => {
  const c = meshCounts(m);
  return [c.verts, c.edges, c.faces];
};
const expectClosed = (m: MeshData) => {
  expect(validateMesh(m)).toEqual([]);
  const t = new MeshTopology(m);
  expect(t.isManifold()).toBe(true);
  expect(t.eulerCharacteristic()).toBe(2);
};
/** Vertical edges of the default cube (same x and y at both ends). */
const verticalEdges = (m: MeshData) =>
  m.edges
    .map((e, i) => ({ e, i }))
    .filter(({ e: [a, b] }) => m.verts[a]!.x === m.verts[b]!.x && m.verts[a]!.y === m.verts[b]!.y)
    .map(({ i }) => i);

describe('Loop Cut', () => {
  it('the ring of a cube edge goes round four faces, consistently oriented', () => {
    const ring = orientedRing(cubeMesh(), 0);
    expect(ring).toHaveLength(4);
    // Every start vertex is on the same side of the cut.
    const m = cubeMesh();
    const firstDir = sub(m.verts[ring[0]!.end]!, m.verts[ring[0]!.start]!);
    for (const r of ring) expect(sub(m.verts[r.end]!, m.verts[r.start]!)).toEqual(firstDir);
  });

  it('one and two cuts on a cube', () => {
    const one = loopCut(cubeMesh(), 0, 1);
    expect(counts(one.mesh)).toEqual([12, 20, 10]);
    expectClosed(one.mesh);
    expect(one.newEdges).toHaveLength(4);
    const two = loopCut(cubeMesh(), 0, 2);
    expect(counts(two.mesh)).toEqual([16, 28, 14]);
    expectClosed(two.mesh);
  });

  it('cut parameters: evenly spaced; the factor slides them', () => {
    expect(cutParameters(1, 0)).toEqual([0.5]);
    expect(cutParameters(3, 0)).toEqual([0.25, 0.5, 0.75]);
    expect(cutParameters(1, 0.5)[0]).toBeCloseTo(0.75, 12);
    expect(cutParameters(1, -0.5)[0]).toBeCloseTo(0.25, 12);
  });

  it('around a cylinder, and ending on its n-gon caps', () => {
    const cyl = cylinderMesh(8);
    const t = new MeshTopology(cyl);
    const vertical = t.findEdge(0, 8)!;
    const around = loopCut(cyl, vertical, 1);
    expect(counts(around.mesh)).toEqual([24, 40, 18]); // 8 split verticals + 8 new ring edges
    expectClosed(around.mesh);
    // A rim edge: its ring crosses the side and stops at the caps, which get new vertices.
    const rim = t.findEdge(0, 1)!;
    const across = loopCut(cyl, rim, 1);
    expectClosed(across.mesh);
    expect(Math.max(...across.mesh.faces.map((f) => f.length))).toBe(9);
  });

  it('the preview has one line per cut per ring face', () => {
    expect(loopCutPreview(cubeMesh(), 0, 2)).toHaveLength(8);
  });
});

describe('Bevel', () => {
  it('profile 0.5 on a right angle is a quarter circle', () => {
    const v = vec3(0, 0, 0);
    const pts = profilePoints(v, vec3(0.2, 0, 0), vec3(0, 0.2, 0), 4);
    expect(pts).toHaveLength(5);
    const centre = vec3(0.2, 0.2, 0);
    for (const p of pts) expect(length(sub(p, centre))).toBeCloseTo(0.2, 12);
    expect(pts[0]).toEqual(vec3(0.2, 0, 0));
  });

  it('the four vertical edges of a box with 3 segments', () => {
    const cube = cubeMesh();
    const r = bevelEdges(cube, verticalEdges(cube), 0.2, 3)!;
    expect(counts(r)).toEqual([32, 48, 18]);
    expectClosed(r);
    // The top face now has 4 corners x 4 profile points.
    expect(Math.max(...r.faces.map((f) => f.length))).toBe(16);
    // No vertex is farther than 1 from the axis in X or Y.
    for (const p of r.verts) expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeLessThanOrEqual(1 + 1e-12);
  });

  it('one segment is a chamfer', () => {
    const cube = cubeMesh();
    expectClosed(bevelEdges(cube, verticalEdges(cube), 0.3, 1)!);
    expect(counts(bevelEdges(cube, verticalEdges(cube), 0.3, 1)!)).toEqual([16, 24, 10]);
  });

  it('unsupported configurations return null', () => {
    const cube = cubeMesh();
    expect(bevelEdges(cube, cube.edges.map((_, i) => i), 0.2, 2)).toBeNull();
    const open = meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0)], [[0, 1, 2]]);
    expect(bevelEdges(open, [0], 0.1, 1)).toBeNull();
  });

  it('vertex bevel cuts a corner off', () => {
    const r = bevelVerts(cubeMesh(), [0], 0.3)!;
    expect(counts(r)).toEqual([10, 15, 7]);
    expectClosed(r);
  });
});
