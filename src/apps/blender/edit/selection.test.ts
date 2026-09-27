import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { type MeshData, meshFromFaces } from '../mesh/mesh-data';
import { cubeMesh } from '../mesh/primitives';
import type { SelectMode } from '../scene/scene';
import {
  EMPTY_SELECTION,
  boxComponents,
  convertSelection,
  fromBase,
  linkedFromSelection,
  loopSelect,
  onlyComponent,
  ringSelect,
  selectAllComponents,
  selectAllOn,
  selectLess,
  selectLinked,
  selectMore,
  toggleComponent,
  topologyOf,
} from './selection';

const VERT: SelectMode = { vert: true, edge: false, face: false };
const EDGE: SelectMode = { vert: false, edge: true, face: false };
const FACE: SelectMode = { vert: false, edge: false, face: true };

/** n x n grid of quads, vertices row by row. */
function grid(n: number): MeshData {
  const verts = [];
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) verts.push(vec3(x, y, 0));
  const at = (x: number, y: number) => y * (n + 1) + x;
  const faces = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) faces.push([at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)]);
  return meshFromFaces(verts, faces);
}

describe('flushing', () => {
  const cube = cubeMesh();

  it('vertex mode: edges and faces follow their vertices', () => {
    // Top face of the cube: vertices 1, 3, 5, 7 (z = +1).
    const s = fromBase(cube, 'vert', [1, 3, 5, 7]);
    expect(s.faces).toEqual([5]);
    expect(s.edges).toHaveLength(4);
    // Three corners of a face: no face, two edges.
    const three = fromBase(cube, 'vert', [1, 3, 5]);
    expect(three.faces).toEqual([]);
    expect(three.edges).toHaveLength(2);
  });

  it('face mode: a face brings its edges and vertices', () => {
    const s = fromBase(cube, 'face', [5]);
    expect(s.verts).toEqual([1, 3, 5, 7]);
    expect(s.edges).toHaveLength(4);
  });

  it('edge mode: faces only when all their edges are selected', () => {
    const t = topologyOf(cube);
    const top = t.faceEdges[5]!;
    expect(fromBase(cube, 'edge', top.slice(0, 3)).faces).toEqual([]);
    expect(fromBase(cube, 'edge', top).faces).toEqual([5]);
  });

  it('new primitives start with everything selected', () => {
    const s = selectAllComponents(cube);
    expect([s.verts.length, s.edges.length, s.faces.length]).toEqual([8, 12, 6]);
  });
});

describe('select mode change (1 / 2 / 3)', () => {
  const cube = cubeMesh();

  it('vertex -> face keeps only fully selected faces; face -> vertex keeps their vertices', () => {
    const three = fromBase(cube, 'vert', [1, 3, 5]);
    expect(convertSelection(cube, three, FACE).verts).toEqual([]);
    const top = fromBase(cube, 'face', [5]);
    expect(convertSelection(cube, top, VERT).verts).toEqual([1, 3, 5, 7]);
  });

  it('a lone vertex is lost when going to edge mode', () => {
    expect(convertSelection(cube, fromBase(cube, 'vert', [0]), EDGE).verts).toEqual([]);
  });
});

describe('click', () => {
  const cube = cubeMesh();

  it('click selects only that element and makes it active', () => {
    const s = onlyComponent(cube, { kind: 'vert', index: 3 }, VERT);
    expect(s.verts).toEqual([3]);
    expect(s.active).toEqual({ kind: 'vert', index: 3 });
  });

  it('shift+click: add, then make active, then deselect', () => {
    let s = onlyComponent(cube, { kind: 'vert', index: 3 }, VERT);
    s = toggleComponent(cube, s, { kind: 'vert', index: 1 }, VERT);
    expect(s.verts).toEqual([1, 3]);
    expect(s.edges).toHaveLength(1);
    expect(s.active).toEqual({ kind: 'vert', index: 1 });
    s = toggleComponent(cube, s, { kind: 'vert', index: 3 }, VERT);
    expect(s.active).toEqual({ kind: 'vert', index: 3 });
    s = toggleComponent(cube, s, { kind: 'vert', index: 3 }, VERT);
    expect(s.verts).toEqual([1]);
    expect(s.active).toBeNull();
  });

  it('face mode: deselecting a face keeps the edges shared with other selected faces', () => {
    let s = onlyComponent(cube, { kind: 'face', index: 5 }, FACE);
    s = toggleComponent(cube, s, { kind: 'face', index: 1 }, FACE); // +X, shares an edge with the top
    expect(s.faces).toEqual([1, 5]);
    expect(s.edges).toHaveLength(7);
    // Face 1 is already the active one: Shift+click deselects it.
    s = toggleComponent(cube, s, { kind: 'face', index: 1 }, FACE);
    expect(s.faces).toEqual([5]);
    expect(s.edges).toHaveLength(4);
  });
});

describe('box, select all, invert', () => {
  const cube = cubeMesh();

  it('set / add / sub', () => {
    let s = boxComponents(cube, EMPTY_SELECTION, [1, 3], 'set', VERT);
    expect(s.verts).toEqual([1, 3]);
    s = boxComponents(cube, s, [5, 7], 'add', VERT);
    expect(s.faces).toEqual([5]);
    s = boxComponents(cube, s, [7], 'sub', VERT);
    expect(s.faces).toEqual([]);
    expect(s.verts).toEqual([1, 3, 5]);
  });

  it('A, Alt+A and Ctrl+I', () => {
    const all = selectAllOn(cube, EMPTY_SELECTION, 'select', VERT);
    expect(all.faces).toHaveLength(6);
    expect(selectAllOn(cube, all, 'deselect', VERT).verts).toEqual([]);
    const inv = selectAllOn(cube, fromBase(cube, 'face', [5]), 'invert', FACE);
    expect(inv.faces).toEqual([0, 1, 2, 3, 4]);
    // Inverting in vertex mode works on vertices: the other four corners, i.e. the bottom face.
    expect(selectAllOn(cube, fromBase(cube, 'vert', [1, 3, 5, 7]), 'invert', VERT).faces).toEqual([4]);
  });
});

describe('loops, rings, linked, more / less', () => {
  it('edge loop in vertex and edge mode; face loop in face mode', () => {
    const g = grid(3);
    const gt = topologyOf(g);
    const mid = gt.findEdge(5, 6)!;
    const s = loopSelect(g, EMPTY_SELECTION, mid, false, VERT);
    expect(s.verts).toEqual([4, 5, 6, 7]);
    expect(s.active).toEqual({ kind: 'edge', index: mid });
    // Face mode: the row of faces crossed by the edge's ring (a vertical line of faces).
    const col = loopSelect(g, EMPTY_SELECTION, gt.findEdge(5, 6)!, false, FACE);
    expect(col.faces).toHaveLength(3);
  });

  it('edge ring in edge mode selects parallel edges only', () => {
    const g = grid(3);
    const t = topologyOf(g);
    const s = ringSelect(g, EMPTY_SELECTION, t.findEdge(5, 6)!, false, EDGE);
    expect(s.edges).toHaveLength(4); // the vertical column of 4 horizontal edges
    expect(s.faces).toEqual([]);
  });

  it('L / Ctrl+L select everything connected', () => {
    const cube = cubeMesh();
    const two = meshFromFaces(
      [...cube.verts, ...cube.verts.map((v) => vec3(v.x + 5, v.y, v.z))],
      [...cube.faces, ...cube.faces.map((f) => f.map((v) => v + 8))],
    );
    const s = selectLinked(two, EMPTY_SELECTION, [9], VERT);
    expect(s.verts).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(linkedFromSelection(two, fromBase(two, 'face', [0]), FACE).faces).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('select more grows through faces; select less undoes it', () => {
    const g = grid(4); // 5 x 5 vertices, centre vertex 12
    const one = fromBase(g, 'vert', [12]);
    const more = selectMore(g, one, VERT);
    expect(more.verts).toEqual([6, 7, 8, 11, 12, 13, 16, 17, 18]);
    expect(more.faces).toHaveLength(4);
    expect(selectLess(g, more, VERT).verts).toEqual([12]);
  });

  it('face mode more / less', () => {
    // Away from the open border (see FIDELITY? in selectLess).
    const g = grid(5);
    const centre = fromBase(g, 'face', [12]); // face at (2,2)
    const more = selectMore(g, centre, FACE);
    expect(more.faces).toEqual([6, 7, 8, 11, 12, 13, 16, 17, 18]);
    expect(selectLess(g, more, FACE).faces).toEqual([12]);
  });
});
