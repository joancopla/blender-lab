import { describe, expect, it } from 'vitest';
import { vec3 } from '../../math/vec3';
import { faceNormal } from '../geometry';
import { type MeshData, meshCounts, meshFromFaces } from '../mesh-data';
import { cubeMesh, planeMesh } from '../primitives';
import { MeshTopology } from '../topology';
import { validateMesh } from '../validate';
import { deleteElements, dissolveEdges, dissolveFaces, dissolveVerts } from './delete';
import { extrudeEdges, extrudeRegion, extrudeVerts } from './extrude';
import { fill } from './fill';
import { inset } from './inset';
import { merge } from './merge';

const counts = (m: MeshData) => {
  const c = meshCounts(m);
  return [c.verts, c.edges, c.faces];
};
const expectClosed = (m: MeshData) => {
  expect(validateMesh(m)).toEqual([]);
  expect(new MeshTopology(m).isManifold()).toBe(true);
  expect(new MeshTopology(m).eulerCharacteristic()).toBe(2);
};
/** n x n grid of quads, vertices row by row. */
function grid(n: number): MeshData {
  const verts = [];
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) verts.push(vec3(x, y, 0));
  const at = (x: number, y: number) => y * (n + 1) + x;
  const faces = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) faces.push([at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)]);
  return meshFromFaces(verts, faces);
}
/** Moves the vertices of the given faces (or vertices) by an offset, like the move after Extrude. */
function moved(
  m: MeshData,
  sel: { kind: 'vert' | 'edge' | 'face'; elements: readonly number[] },
  dir = vec3(0, 0, 1),
): MeshData {
  const vs = new Set(
    sel.kind === 'face'
      ? sel.elements.flatMap((f) => [...m.faces[f]!])
      : sel.kind === 'edge'
        ? sel.elements.flatMap((e) => [...m.edges[e]!])
        : sel.elements,
  );
  return { ...m, verts: m.verts.map((v, i) => (vs.has(i) ? vec3(v.x + dir.x, v.y + dir.y, v.z + dir.z) : v)) };
}
const TOP = 5; // cube face +Z (vertices 1, 3, 5, 7)
const PLUS_X = 1;

describe('extrude', () => {
  it('region: one cube face -> 12 / 20 / 10, closed, normal +Z', () => {
    const r = extrudeRegion(cubeMesh(), [TOP]);
    expect(counts(r.mesh)).toEqual([12, 20, 10]);
    expectClosed(moved(r.mesh, r.select));
    expect(r.normal).toEqual(vec3(0, 0, 1));
    expect(r.select).toEqual({ kind: 'face', elements: [TOP] });
  });

  it('region: two adjacent faces share their inner edge', () => {
    const r = extrudeRegion(cubeMesh(), [TOP, PLUS_X]);
    expect(counts(r.mesh)).toEqual([14, 24, 12]);
    // Moved along the region's normal, as the operator does.
    expectClosed(moved(r.mesh, r.select, r.normal!));
  });

  it('region on a plane makes an open box', () => {
    const r = extrudeRegion(planeMesh(), [0]);
    expect(counts(r.mesh)).toEqual([8, 12, 5]);
    expect(validateMesh(moved(r.mesh, r.select))).toEqual([]);
  });

  it('edges and vertices', () => {
    const e = extrudeEdges(planeMesh(), [0]);
    expect(counts(e.mesh)).toEqual([6, 7, 2]);
    expect(validateMesh(moved(e.mesh, e.select))).toEqual([]);
    const v = extrudeVerts(planeMesh(), [0]);
    expect(counts(v.mesh)).toEqual([5, 5, 1]);
    expect(v.select.elements).toEqual([4]);
  });
});

describe('inset', () => {
  it('region: 0.2 inside the top face', () => {
    const m = inset(cubeMesh(), [TOP], { thickness: 0.2, depth: 0, individual: false });
    expect(counts(m)).toEqual([12, 20, 10]);
    expectClosed(m);
    const top = m.faces[TOP]!.map((v) => m.verts[v]!);
    for (const p of top) {
      expect(Math.abs(p.x)).toBeCloseTo(0.8, 9);
      expect(Math.abs(p.y)).toBeCloseTo(0.8, 9);
      expect(p.z).toBeCloseTo(1, 9);
    }
  });

  it('depth moves the inner face along the normal', () => {
    const m = inset(cubeMesh(), [TOP], { thickness: 0.2, depth: -0.5, individual: false });
    for (const v of m.faces[TOP]!) expect(m.verts[v]!.z).toBeCloseTo(0.5, 9);
    expectClosed(m);
  });

  it('individual: each face on its own', () => {
    const m = inset(cubeMesh(), [TOP, PLUS_X], { thickness: 0.1, depth: 0, individual: true });
    expect(counts(m)).toEqual([16, 28, 14]);
    expectClosed(m);
    // Region inset of the same two faces keeps them joined.
    expect(counts(inset(cubeMesh(), [TOP, PLUS_X], { thickness: 0.1, depth: 0, individual: false }))).toEqual([14, 24, 12]);
  });
});

describe('delete', () => {
  const sel = (o: Partial<{ verts: number[]; edges: number[]; faces: number[] }>) => ({ verts: [], edges: [], faces: [], ...o });

  it('vertices take their edges and faces', () => {
    expect(counts(deleteElements(cubeMesh(), sel({ verts: [0] }), 'verts'))).toEqual([7, 9, 3]);
  });

  it('edges take their faces; faces keep shared edges; only faces keeps everything else', () => {
    const cube = cubeMesh();
    expect(counts(deleteElements(cube, sel({ edges: [0] }), 'edges'))).toEqual([8, 11, 4]);
    expect(counts(deleteElements(cube, sel({ faces: [TOP] }), 'faces'))).toEqual([8, 12, 5]);
    expect(counts(deleteElements(cube, sel({ faces: [TOP] }), 'onlyFaces'))).toEqual([8, 12, 5]);
    // Deleting all faces of a plane: the lone vertices and edges go too; Only Faces keeps them.
    expect(counts(deleteElements(planeMesh(), sel({ faces: [0] }), 'faces'))).toEqual([0, 0, 0]);
    expect(counts(deleteElements(planeMesh(), sel({ faces: [0] }), 'onlyFaces'))).toEqual([4, 4, 0]);
  });
});

describe('dissolve', () => {
  it('a vertex in the middle of an edge (5-gon) -> quad', () => {
    const m = meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(2, 1, 0), vec3(0, 1, 0)], [[0, 1, 2, 3, 4]]);
    const d = dissolveVerts(m, [1]);
    expect(counts(d)).toEqual([4, 4, 1]);
    expect(validateMesh(d)).toEqual([]);
  });

  it('an inner grid vertex: its four faces become one 8-gon', () => {
    const d = dissolveVerts(grid(2), [4]);
    expect(counts(d)).toEqual([8, 8, 1]);
    expect(d.faces[0]).toHaveLength(8);
    expect(faceNormal(d, 0).z).toBeCloseTo(1, 9);
  });

  it('edges: faces on both sides merge; the lone border vertex goes too', () => {
    const g = grid(2);
    const t = new MeshTopology(g);
    const d = dissolveEdges(g, [t.findEdge(1, 4)!]);
    expect(counts(d)).toEqual([8, 10, 3]);
    expect(validateMesh(d)).toEqual([]);
  });

  it('faces: a connected group becomes one face', () => {
    const d = dissolveFaces(grid(2), [0, 1]);
    expect(counts(d)).toEqual([9, 11, 3]);
    expect(validateMesh(d)).toEqual([]);
  });
});

describe('merge', () => {
  it('at center: the top of a cube becomes a point (pyramid)', () => {
    const r = merge(cubeMesh(), [1, 3, 5, 7], 'center');
    expect(counts(r.mesh)).toEqual([5, 8, 5]);
    expect(r.removed).toBe(3);
    expectClosed(r.mesh);
    expect(r.mesh.verts[r.selectVerts[0]!]).toEqual(vec3(0, 0, 1));
  });

  it('by distance joins duplicated vertices', () => {
    // Cube whose top face uses its own copies of the top vertices (a split mesh).
    const cube = cubeMesh();
    const verts = [...cube.verts, ...[1, 3, 5, 7].map((v) => cube.verts[v]!)];
    const copy = new Map([
      [1, 8],
      [3, 9],
      [5, 10],
      [7, 11],
    ]);
    const faces = cube.faces.map((f, i) => (i === TOP ? f.map((v) => copy.get(v)!) : f));
    const split = meshFromFaces(verts, faces);
    expect(new MeshTopology(split).isManifold()).toBe(false);
    const r = merge(split, verts.map((_, i) => i), 'distance');
    expect(r.removed).toBe(4);
    expectClosed(r.mesh);
  });

  it('collapse: each connected island to its own centre', () => {
    const g = grid(2);
    const r = merge(g, [0, 1, 7, 8], 'collapse');
    expect(r.removed).toBe(2);
    expect(validateMesh(r.mesh)).toEqual([]);
  });
});

describe('fill', () => {
  it('two vertices -> edge; a closed loop of edges -> face with consistent normals', () => {
    const plane = planeMesh();
    const open = deleteElements(plane, { verts: [], edges: [], faces: [0] }, 'onlyFaces');
    const r = fill(open, { verts: [0, 1, 2, 3], edges: [0, 1, 2, 3] })!;
    expect(r.created).toBe('face');
    expect(counts(r.mesh)).toEqual([4, 4, 1]);

    const box = deleteElements(cubeMesh(), { verts: [], edges: [], faces: [TOP] }, 'onlyFaces');
    const t = new MeshTopology(box);
    const rim = [t.findEdge(1, 3)!, t.findEdge(3, 7)!, t.findEdge(7, 5)!, t.findEdge(5, 1)!];
    const closed = fill(box, { verts: [1, 3, 5, 7], edges: rim })!;
    expectClosed(closed.mesh);

    const two = fill(open, { verts: [0, 2], edges: [] })!;
    expect(two.created).toBe('edge');
    expect(counts(two.mesh)).toEqual([4, 5, 0]);
  });

  it('three loose vertices -> triangle; nonsense -> null', () => {
    const pts = meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0)], []);
    expect(counts(fill(pts, { verts: [0, 1, 2], edges: [] })!.mesh)).toEqual([3, 3, 1]);
    expect(fill(cubeMesh(), { verts: [0], edges: [] })).toBeNull();
  });
});
