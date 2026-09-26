import { describe, expect, it } from 'vitest';
import { dot, length, sub, vec3 } from '../math/vec3';
import { faceArea, faceCenter, faceNormal, triangulateFace } from './geometry';
import { type MeshData, meshCounts, meshFromFaces } from './mesh-data';
import { coneMesh, cubeMesh, cylinderMesh, planeMesh, primitiveMesh, torusMesh, uvSphereMesh } from './primitives';
import { MeshTopology } from './topology';
import { type MeshIssue, validateMesh } from './validate';
import { meshToGeometry } from '../viewport/mesh-geometry';

/** Every face normal points away from the object's centre (convex, centred primitives). */
function expectOutwardNormals(m: MeshData, centre = vec3(0, 0, 0)) {
  m.faces.forEach((_, f) => {
    expect(dot(faceNormal(m, f), sub(faceCenter(m, f), centre)), `face ${f}`).toBeGreaterThan(0);
  });
}

/** Closed, clean surface: no issues, all edges manifold, Euler characteristic as given. */
function expectClosed(m: MeshData, euler = 2) {
  expect(validateMesh(m)).toEqual([]);
  const topo = new MeshTopology(m);
  expect(topo.nonManifoldEdges()).toEqual([]);
  expect(topo.isManifold()).toBe(true);
  expect(topo.eulerCharacteristic()).toBe(euler);
}

describe('Blender primitives', () => {
  it.each([
    ['cube', cubeMesh(), { verts: 8, edges: 12, faces: 6, tris: 12 }],
    ['uvSphere', uvSphereMesh(), { verts: 482, edges: 992, faces: 512, tris: 960 }],
    ['cylinder', cylinderMesh(), { verts: 64, edges: 96, faces: 34, tris: 124 }],
    ['cone', coneMesh(), { verts: 33, edges: 64, faces: 33, tris: 62 }],
    ['torus', torusMesh(), { verts: 576, edges: 1152, faces: 576, tris: 1152 }],
    ['plane', planeMesh(), { verts: 4, edges: 4, faces: 1, tris: 2 }],
  ])('%s has Blender counts', (_, m, counts) => {
    expect(meshCounts(m)).toEqual(counts);
  });

  it('closed primitives are clean manifold surfaces with outward normals', () => {
    for (const m of [cubeMesh(), uvSphereMesh(), cylinderMesh(), coneMesh()]) {
      expectClosed(m);
      expectOutwardNormals(m);
    }
    expectClosed(torusMesh(), 0); // a torus has one hole: V - E + F = 0
  });

  it('the torus faces outwards from its ring', () => {
    const m = torusMesh();
    m.faces.forEach((f, i) => {
      const c = faceCenter(m, i);
      // Centre of the tube cross-section nearest to this face.
      const r = Math.hypot(c.x, c.y);
      const tube = vec3(c.x / r, c.y / r, 0);
      expect(dot(faceNormal(m, i), sub(c, tube)), `face ${i} (${f.length})`).toBeGreaterThan(0);
    });
  });

  it('sizes match Blender defaults', () => {
    const extent = (m: MeshData) => {
      const xs = m.verts.map((v) => v.x);
      const zs = m.verts.map((v) => v.z);
      return [Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)];
    };
    expect(extent(cubeMesh())).toEqual([2, 2]);
    expect(extent(cylinderMesh())[1]).toBeCloseTo(2, 9);
    expect(extent(uvSphereMesh())[1]).toBeCloseTo(2, 9);
    expect(extent(torusMesh())[0]).toBeCloseTo(2.5, 9);
  });

  it('primitiveMesh covers every kind', () => {
    for (const k of ['cube', 'uvSphere', 'cylinder', 'cone', 'torus', 'plane'] as const) {
      expect(validateMesh(primitiveMesh(k))).toEqual([]);
    }
  });
});

describe('validation', () => {
  const quad = () => meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0)], [[0, 1, 2, 3]]);
  const kinds = (issues: MeshIssue[]) => issues.map((i) => i.kind);

  it('an open quad is valid but not manifold', () => {
    const m = quad();
    expect(validateMesh(m)).toEqual([]);
    const topo = new MeshTopology(m);
    expect(topo.isManifold()).toBe(false);
    expect(topo.nonManifoldEdges()).toHaveLength(4);
    expect(topo.isBoundaryEdge(0)).toBe(true);
  });

  it('detects bad indices, duplicate edges and missing face edges', () => {
    const m = quad();
    expect(kinds(validateMesh({ ...m, faces: [[0, 1, 7]] }))).toContain('invalidIndex');
    expect(kinds(validateMesh({ ...m, edges: [...m.edges, [0, 1]] }))).toContain('duplicateEdge');
    expect(kinds(validateMesh({ ...m, edges: m.edges.slice(1) }))).toContain('missingFaceEdge');
    expect(kinds(validateMesh({ ...m, edges: [...m.edges, [2, 2]] }))).toContain('selfEdge');
  });

  it('detects degenerate faces', () => {
    const verts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(0, 1, 0)];
    expect(kinds(validateMesh(meshFromFaces(verts, [[0, 1, 2]])))).toEqual(['degenerateFace']);
    expect(validateMesh(meshFromFaces(verts, [[0, 1, 1, 3]])).find((i) => i.kind === 'degenerateFace')).toMatchObject({
      reason: 'repeatedVert',
    });
    expect(validateMesh({ verts, edges: [], faces: [[0, 1]] })[0]).toMatchObject({ reason: 'tooFewVerts' });
  });

  it('detects a flipped face (inconsistent orientation) and duplicate faces', () => {
    const cube = cubeMesh();
    const flipped = { ...cube, faces: cube.faces.map((f, i) => (i === 5 ? [...f].reverse() : f)) };
    expect(kinds(validateMesh(flipped)).filter((k) => k === 'inconsistentOrientation')).toHaveLength(4);
    const dup = { ...cube, faces: [...cube.faces, cube.faces[0]!] };
    expect(kinds(validateMesh(dup))).toContain('duplicateFace');
  });
});

describe('topology queries', () => {
  it('cube adjacency', () => {
    const t = new MeshTopology(cubeMesh());
    for (let v = 0; v < 8; v++) {
      expect(t.vertEdges[v]).toHaveLength(3);
      expect(t.vertFaces[v]).toHaveLength(3);
      expect(t.vertNeighbours(v)).toHaveLength(3);
    }
    for (let f = 0; f < 6; f++) expect(t.faceNeighbours(f)).toHaveLength(4);
    expect(t.findEdge(0, 1)).toBeDefined();
    expect(t.findEdge(0, 7)).toBeUndefined();
  });

  it('a non-manifold edge (three faces) and a bow-tie vertex are detected', () => {
    // Three quads sharing edge 0-1.
    const verts = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0), vec3(1, 0, 1), vec3(0, 0, 1), vec3(1, -1, 0), vec3(0, -1, 0)];
    const m = meshFromFaces(verts, [[0, 1, 2, 3], [1, 0, 5, 4], [0, 1, 6, 7]]);
    const t = new MeshTopology(m);
    const e = t.findEdge(0, 1)!;
    expect(t.edgeFaces[e]).toHaveLength(3);
    expect(t.nonManifoldEdges()).toContain(e);
    // Two triangles touching at a single vertex.
    const bow = meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(-1, 0, 0), vec3(0, -1, 0)], [[0, 1, 2], [0, 3, 4]]);
    expect(new MeshTopology(bow).isManifoldVert(0)).toBe(false);
  });

  it('loose edges and vertices', () => {
    const m = meshFromFaces([vec3(0, 0, 0), vec3(1, 0, 0), vec3(5, 5, 5)], [], [[0, 1]]);
    const t = new MeshTopology(m);
    expect(t.isWireEdge(0)).toBe(true);
    expect(t.vertEdges[2]).toEqual([]);
    expect(t.isManifoldVert(2)).toBe(false);
  });

  it('linked vertices (Ctrl+L)', () => {
    const cube = cubeMesh();
    const two = meshFromFaces(
      [...cube.verts, ...cube.verts.map((v) => vec3(v.x + 5, v.y, v.z))],
      [...cube.faces, ...cube.faces.map((f) => f.map((v) => v + 8))],
    );
    const t = new MeshTopology(two);
    expect([...t.linkedVerts([0])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(t.linkedVerts([9]).size).toBe(8);
  });

  it('edge loop around a cylinder side and along a boundary', () => {
    const cyl = cylinderMesh(8);
    const t = new MeshTopology(cyl);
    // A vertical side edge: its loop stops at the caps (vertices have 3 edges).
    const vertical = t.findEdge(0, 8)!;
    expect(t.edgeLoop(vertical)).toEqual([vertical]);
    // The UV sphere's rings are proper loops through valence-4 vertices.
    const s = uvSphereMesh(8, 4);
    const st = new MeshTopology(s);
    const ringEdge = st.findEdge(1 + 8, 1 + 8 + 1)!; // ring 2 (equator), consecutive vertices
    expect(st.edgeLoop(ringEdge)).toHaveLength(8);
    // An open grid: the border is followed as a boundary loop.
    const grid = gridMesh(3);
    const gt = new MeshTopology(grid);
    expect(gt.edgeLoop(gt.findEdge(0, 1)!)).toHaveLength(12);
  });

  it('edge loop across a grid stops at the border', () => {
    const g = gridMesh(3);
    const t = new MeshTopology(g);
    // Middle horizontal line y = 1 (vertices 4..7 in a 4x4 grid): 3 edges.
    const loop = t.edgeLoop(t.findEdge(5, 6)!);
    expect(loop.map((e) => [...t.edgeVerts(e)].sort((a, b) => a - b).join('-')).sort()).toEqual(['4-5', '5-6', '6-7']);
  });

  it('edge ring on a cube goes round four faces; on a cylinder side, all the way', () => {
    const cube = new MeshTopology(cubeMesh());
    expect(cube.edgeRing(0)).toHaveLength(4);
    const cyl = new MeshTopology(cylinderMesh(8));
    expect(cyl.edgeRing(cyl.findEdge(0, 8)!)).toHaveLength(8);
  });
});

describe('geometry', () => {
  it('Newell normal and area of a quad', () => {
    const m = planeMesh();
    expect(faceNormal(m, 0)).toEqual(vec3(0, 0, 1));
    expect(faceArea(m, 0)).toBeCloseTo(4, 12);
  });

  it('triangulates a concave n-gon without leaving the polygon', () => {
    // An L shape (6 vertices, concave corner at index 3).
    const L = meshFromFaces(
      [vec3(0, 0, 0), vec3(2, 0, 0), vec3(2, 1, 0), vec3(1, 1, 0), vec3(1, 2, 0), vec3(0, 2, 0)],
      [[0, 1, 2, 3, 4, 5]],
    );
    const tris = triangulateFace(L, 0);
    expect(tris).toHaveLength(4);
    // Total area preserved and every triangle keeps the face's winding.
    let area = 0;
    for (const [a, b, c] of tris) {
      const m = meshFromFaces(L.verts, [[a, b, c]]);
      expect(faceNormal(m, 0).z).toBeCloseTo(1, 9);
      area += faceArea(m, 0);
    }
    expect(area).toBeCloseTo(3, 9);
  });

  it('three.js geometry: one triangle per tri, flat normals, face lookup', () => {
    const m = cylinderMesh();
    const g = meshToGeometry(m);
    expect(g.geometry.getAttribute('position').count).toBe(124 * 3);
    expect(g.triangleFace).toHaveLength(124);
    const topCap = 32;
    const i = g.triangleFace.indexOf(topCap);
    const n = g.geometry.getAttribute('normal');
    // The top cap's triangles point straight up.
    expect(length(sub(vec3(n.getX(i * 3), n.getY(i * 3), n.getZ(i * 3)), vec3(0, 0, 1)))).toBeCloseTo(0, 6);
  });
});

/** An n x n grid of quads in the XY plane, vertices row by row. */
function gridMesh(n: number): MeshData {
  const verts = [];
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) verts.push(vec3(x, y, 0));
  const at = (x: number, y: number) => y * (n + 1) + x;
  const faces = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) faces.push([at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)]);
  return meshFromFaces(verts, faces);
}
