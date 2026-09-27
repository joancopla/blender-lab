/**
 * Edit Mode component selection on one mesh. Pure functions.
 *
 * The selection is kept consistent ("flushed") from the lowest enabled select
 * mode, the way Blender does it:
 * - Vertex mode: edges with both vertices selected, faces with all vertices selected.
 * - Edge mode: the vertices of selected edges, faces with all edges selected.
 * - Face mode: the edges and vertices of selected faces.
 * FIDELITY? With several modes on, the lowest one decides.
 */
import type { MeshData } from '../mesh/mesh-data';
import { MeshTopology } from '../mesh/topology';
import type { ComponentSelection, SelectMode } from '../scene/scene';

export type ComponentKind = 'vert' | 'edge' | 'face';

export interface ComponentRef {
  readonly kind: ComponentKind;
  readonly index: number;
}

/** The kind of element that drives the selection for this select mode. */
export function baseKind(mode: SelectMode): ComponentKind {
  return mode.vert ? 'vert' : mode.edge ? 'edge' : 'face';
}

const topologies = new WeakMap<MeshData, MeshTopology>();

/** Cached topology for immutable mesh data. */
export function topologyOf(m: MeshData): MeshTopology {
  let t = topologies.get(m);
  if (!t) {
    t = new MeshTopology(m);
    topologies.set(m, t);
  }
  return t;
}

export function selectAllComponents(m: MeshData): ComponentSelection {
  return {
    verts: m.verts.map((_, i) => i),
    edges: m.edges.map((_, i) => i),
    faces: m.faces.map((_, i) => i),
    active: null,
  };
}

export const EMPTY_SELECTION: ComponentSelection = { verts: [], edges: [], faces: [], active: null };

const sorted = (s: Iterable<number>) => [...s].sort((a, b) => a - b);

/** Elements of the base kind in a selection. */
export function baseElements(sel: ComponentSelection, kind: ComponentKind): Set<number> {
  return new Set(kind === 'vert' ? sel.verts : kind === 'edge' ? sel.edges : sel.faces);
}

/**
 * Builds a consistent selection from a set of base elements. The active element
 * is kept only if it is still selected.
 */
export function fromBase(
  m: MeshData,
  kind: ComponentKind,
  base: Iterable<number>,
  active: ComponentSelection['active'] = null,
): ComponentSelection {
  const t = topologyOf(m);
  const set = new Set(base);
  let verts: Set<number>;
  let edges: Set<number>;
  let faces: Set<number>;
  if (kind === 'vert') {
    verts = set;
    edges = new Set(m.edges.map((_, e) => e).filter((e) => verts.has(m.edges[e]![0]) && verts.has(m.edges[e]![1])));
    faces = new Set(m.faces.map((_, f) => f).filter((f) => m.faces[f]!.every((v) => verts.has(v))));
  } else if (kind === 'edge') {
    edges = set;
    verts = new Set([...edges].flatMap((e) => [...m.edges[e]!]));
    faces = new Set(m.faces.map((_, f) => f).filter((f) => t.faceEdges[f]!.every((e) => edges.has(e))));
  } else {
    faces = set;
    edges = new Set([...faces].flatMap((f) => t.faceEdges[f]!));
    verts = new Set([...faces].flatMap((f) => [...m.faces[f]!]));
  }
  const stillSelected =
    active &&
    (active.kind === 'vert' ? verts : active.kind === 'edge' ? edges : faces).has(active.index);
  return { verts: sorted(verts), edges: sorted(edges), faces: sorted(faces), active: stillSelected ? active : null };
}

/**
 * Base elements covered by any element: a face in vertex mode means its
 * vertices, an edge in face mode means nothing (edges do not select faces).
 */
export function toBase(m: MeshData, ref: ComponentRef, kind: ComponentKind): number[] {
  const t = topologyOf(m);
  if (ref.kind === kind) return [ref.index];
  if (kind === 'vert') return ref.kind === 'edge' ? [...m.edges[ref.index]!] : [...m.faces[ref.index]!];
  if (kind === 'edge') return ref.kind === 'face' ? [...t.faceEdges[ref.index]!] : [];
  return [];
}

/** Converts the selection when the select mode changes (1 / 2 / 3). */
export function convertSelection(m: MeshData, sel: ComponentSelection, mode: SelectMode): ComponentSelection {
  const kind = baseKind(mode);
  return fromBase(m, kind, baseElements(sel, kind), sel.active);
}

/** Is this element selected? */
export function isSelected(sel: ComponentSelection, ref: ComponentRef): boolean {
  const list = ref.kind === 'vert' ? sel.verts : ref.kind === 'edge' ? sel.edges : sel.faces;
  return list.includes(ref.index);
}

export const sameRef = (a: ComponentRef | null, b: ComponentRef | null): boolean =>
  !!a && !!b && a.kind === b.kind && a.index === b.index;

// ---------------------------------------------------------------------------
// Operations on one mesh

/** Click with Shift: add and make active / make active / deselect, like objects. */
export function toggleComponent(
  m: MeshData,
  sel: ComponentSelection,
  ref: ComponentRef,
  mode: SelectMode,
): ComponentSelection {
  const kind = baseKind(mode);
  const base = baseElements(sel, kind);
  const covered = toBase(m, ref, kind);
  if (!isSelected(sel, ref)) {
    for (const b of covered) base.add(b);
    return fromBase(m, kind, base, ref);
  }
  if (!sameRef(sel.active, ref)) return { ...sel, active: ref };
  for (const b of covered) base.delete(b);
  return fromBase(m, kind, base, null);
}

/** Click without Shift: only this element (on this mesh). */
export function onlyComponent(m: MeshData, ref: ComponentRef, mode: SelectMode): ComponentSelection {
  const kind = baseKind(mode);
  return fromBase(m, kind, toBase(m, ref, kind), ref);
}

export type BoxMode = 'set' | 'add' | 'sub';

/** Box select with base elements already found inside the box. */
export function boxComponents(
  m: MeshData,
  sel: ComponentSelection,
  inside: readonly number[],
  boxMode: BoxMode,
  mode: SelectMode,
): ComponentSelection {
  const kind = baseKind(mode);
  const base = boxMode === 'set' ? new Set<number>() : baseElements(sel, kind);
  for (const i of inside) {
    if (boxMode === 'sub') base.delete(i);
    else base.add(i);
  }
  return fromBase(m, kind, base, sel.active);
}

export type SelectAllAction = 'select' | 'deselect' | 'invert';

export function selectAllOn(
  m: MeshData,
  sel: ComponentSelection,
  action: SelectAllAction,
  mode: SelectMode,
): ComponentSelection {
  const kind = baseKind(mode);
  const count = kind === 'vert' ? m.verts.length : kind === 'edge' ? m.edges.length : m.faces.length;
  const all = Array.from({ length: count }, (_, i) => i);
  if (action === 'select') return fromBase(m, kind, all, sel.active);
  if (action === 'deselect') return fromBase(m, kind, [], null);
  const current = baseElements(sel, kind);
  return fromBase(m, kind, all.filter((i) => !current.has(i)), sel.active);
}

/** Adds (or replaces with) a set of edges, converted to the base kind. */
function selectEdges(
  m: MeshData,
  sel: ComponentSelection,
  edges: readonly number[],
  extend: boolean,
  mode: SelectMode,
  active: ComponentRef,
): ComponentSelection {
  const kind = baseKind(mode);
  const base = extend ? baseElements(sel, kind) : new Set<number>();
  for (const e of edges) for (const b of toBase(m, { kind: 'edge', index: e }, kind)) base.add(b);
  return fromBase(m, kind, base, active);
}

/**
 * Alt+click on an edge: edge loop. In face mode, the loop of faces crossed by the
 * edge's ring. FIDELITY? Blender toggles an already selected loop with Shift+Alt.
 */
export function loopSelect(
  m: MeshData,
  sel: ComponentSelection,
  edge: number,
  extend: boolean,
  mode: SelectMode,
): ComponentSelection {
  const t = topologyOf(m);
  if (baseKind(mode) === 'face') {
    const ring = new Set(t.edgeRing(edge));
    const faces = m.faces
      .map((_, f) => f)
      .filter((f) => m.faces[f]!.length === 4 && t.faceEdges[f]!.filter((e) => ring.has(e)).length === 2);
    const base = extend ? baseElements(sel, 'face') : new Set<number>();
    for (const f of faces) base.add(f);
    const first = t.edgeFaces[edge]![0];
    return fromBase(m, 'face', base, first === undefined ? null : { kind: 'face', index: first });
  }
  return selectEdges(m, sel, t.edgeLoop(edge), extend, mode, { kind: 'edge', index: edge });
}

/** Ctrl+Alt+click on an edge: edge ring. */
export function ringSelect(
  m: MeshData,
  sel: ComponentSelection,
  edge: number,
  extend: boolean,
  mode: SelectMode,
): ComponentSelection {
  return selectEdges(m, sel, topologyOf(m).edgeRing(edge), extend, mode, { kind: 'edge', index: edge });
}

/** Vertices of the given base elements. */
function vertsOf(m: MeshData, kind: ComponentKind, elements: Iterable<number>): number[] {
  const out: number[] = [];
  for (const i of elements) out.push(...toBase(m, { kind, index: i }, 'vert'));
  return out;
}

/** Base elements whose vertices are all in `verts`. */
function baseFromVerts(m: MeshData, kind: ComponentKind, verts: Set<number>): number[] {
  return [...baseElements(fromBase(m, 'vert', verts), kind)];
}

/**
 * L (under the cursor) and Ctrl+L (from the selection): everything connected.
 * `start` is a vertex set; the result is added to the selection.
 */
export function selectLinked(
  m: MeshData,
  sel: ComponentSelection,
  startVerts: Iterable<number>,
  mode: SelectMode,
): ComponentSelection {
  const kind = baseKind(mode);
  const linked = topologyOf(m).linkedVerts(startVerts);
  const base = baseElements(sel, kind);
  for (const b of baseFromVerts(m, kind, linked)) base.add(b);
  return fromBase(m, kind, base, sel.active);
}

export function linkedFromSelection(m: MeshData, sel: ComponentSelection, mode: SelectMode): ComponentSelection {
  return selectLinked(m, sel, vertsOf(m, baseKind(mode), baseElements(sel, baseKind(mode))), mode);
}

/**
 * Select More (Ctrl+Numpad +), with Face Step on (Blender's default): grows
 * through faces, so the diagonal corners of quads are included.
 */
export function selectMore(m: MeshData, sel: ComponentSelection, mode: SelectMode): ComponentSelection {
  const t = topologyOf(m);
  const kind = baseKind(mode);
  const verts = new Set(sel.verts);
  const grown = new Set(verts);
  for (const v of verts) {
    for (const f of t.vertFaces[v]!) for (const w of m.faces[f]!) grown.add(w);
    for (const e of t.vertEdges[v]!) if (t.isWireEdge(e)) grown.add(t.otherVert(e, v));
  }
  if (kind === 'face') {
    const faces = new Set(sel.faces);
    for (const f of m.faces.keys()) if (m.faces[f]!.some((v) => verts.has(v))) faces.add(f);
    return fromBase(m, 'face', faces, sel.active);
  }
  const base = baseElements(sel, kind);
  for (const b of baseFromVerts(m, kind, grown)) base.add(b);
  return fromBase(m, kind, base, sel.active);
}

/**
 * Select Less (Ctrl+Numpad −), Face Step on: removes the outer ring of the selection.
 * FIDELITY? At open mesh borders (edges with one face) the selection does not shrink here.
 */
export function selectLess(m: MeshData, sel: ComponentSelection, mode: SelectMode): ComponentSelection {
  const t = topologyOf(m);
  const kind = baseKind(mode);
  const verts = new Set(sel.verts);
  // A vertex is on the border if one of its faces (or wire edges) has an unselected vertex.
  const border = new Set<number>();
  for (const v of verts) {
    const touchesOutside =
      t.vertFaces[v]!.some((f) => m.faces[f]!.some((w) => !verts.has(w))) ||
      t.vertEdges[v]!.some((e) => !verts.has(t.otherVert(e, v)));
    if (touchesOutside) border.add(v);
  }
  if (kind === 'face') {
    const faces = sel.faces.filter((f) => !m.faces[f]!.some((v) => border.has(v)));
    return fromBase(m, 'face', faces, sel.active);
  }
  const kept = new Set([...verts].filter((v) => !border.has(v)));
  return fromBase(m, kind, baseFromVerts(m, kind, kept), sel.active);
}
