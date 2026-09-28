/**
 * Delete (X) and Dissolve. Dissolving merges faces instead of leaving holes.
 * FIDELITY? Blender's Delete menu also has Edge Loops, Collapse Edges & Faces
 * and Limited Dissolve (out of scope here).
 */
import { type Face, type MeshData, edgeKey, faceEdgePairs, smoothFrom, withSmooth } from '../mesh-data';
import { MeshTopology } from '../topology';
import { compact, looseVerts, rebuild, wireEdges } from './common';

export type DeleteType = 'verts' | 'edges' | 'faces' | 'onlyFaces';

/** `m` keeping only the faces that pass `keep` (with their smooth flags). */
function keepFaces(m: MeshData, keep: (f: Face, i: number) => boolean): MeshData {
  const ids = [...m.faces.keys()].filter((i) => keep(m.faces[i]!, i));
  return withSmooth({ ...m, faces: ids.map((i) => m.faces[i]!) }, smoothFrom(m, ids));
}

const withEdges = (m: MeshData, edges: MeshData['edges']): MeshData => ({ ...m, edges });

/**
 * - Vertices: removes them and everything that uses them.
 * - Edges: removes them and the faces that use them; vertices left alone go too.
 * - Faces: removes them, plus edges and vertices only they used.
 * - Only Faces: removes the faces, keeps edges and vertices.
 */
export function deleteElements(
  m: MeshData,
  sel: { verts: readonly number[]; edges: readonly number[]; faces: readonly number[] },
  type: DeleteType,
): MeshData {
  const oldLoose = looseVerts(m);
  if (type === 'verts') {
    const gone = new Set(sel.verts);
    const kept = keepFaces(m, (f) => !f.some((v) => gone.has(v)));
    const edges = m.edges.filter(([a, b]) => !gone.has(a) && !gone.has(b));
    return compact(withEdges(kept, edges), new Set([...oldLoose].filter((v) => !gone.has(v)))).mesh;
  }
  if (type === 'edges') {
    const gone = new Set(sel.edges.map((e) => edgeKey(...m.edges[e]!)));
    const kept = keepFaces(m, (f) => !faceEdgePairs(f).some(([a, b]) => gone.has(edgeKey(a, b))));
    const edges = m.edges.filter(([a, b]) => !gone.has(edgeKey(a, b)));
    return compact(withEdges(kept, edges), oldLoose).mesh;
  }
  const goneFaces = new Set(sel.faces);
  const kept = keepFaces(m, (_, i) => !goneFaces.has(i));
  if (type === 'onlyFaces') return withEdges(kept, m.edges);
  // Faces: keep the edges still used by a remaining face, and the wire edges that were there.
  const rebuilt = rebuild(m.verts, kept.faces, wireEdges(m), kept.smoothFaces);
  return compact(rebuilt, oldLoose).mesh;
}

/**
 * Joins groups of faces into one face each: every group must be connected and
 * its outline must be a single loop (otherwise the group is left as it was).
 * The joined face is shaded like the group's first face (lab decision).
 */
function mergeFaceGroups(m: MeshData, groups: readonly (readonly number[])[]): MeshData {
  const replaced = new Set<number>();
  const added: Face[] = [];
  const addedFrom: number[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const set = new Set(group);
    // Directed outline edges: those whose reverse is not in the group.
    const directed = new Set<string>();
    for (const f of group) for (const [a, b] of faceEdgePairs(m.faces[f]!)) directed.add(`${a}>${b}`);
    const next = new Map<number, number>();
    let ok = true;
    for (const f of group) {
      for (const [a, b] of faceEdgePairs(m.faces[f]!)) {
        if (directed.has(`${b}>${a}`)) continue;
        if (next.has(a)) ok = false;
        next.set(a, b);
      }
    }
    if (!ok || next.size < 3) continue;
    const start = next.keys().next().value!;
    const loop = [start];
    let v = next.get(start)!;
    while (v !== start && loop.length <= next.size) {
      loop.push(v);
      v = next.get(v)!;
    }
    if (loop.length !== next.size) continue; // several outlines (holes): leave it
    for (const f of set) replaced.add(f);
    added.push(loop);
    addedFrom.push(Math.min(...group));
  }
  if (added.length === 0) return m;
  const keptIds = [...m.faces.keys()].filter((i) => !replaced.has(i));
  const faces = [...keptIds.map((i) => m.faces[i]!), ...added];
  const smooth = smoothFrom(m, [...keptIds, ...addedFrom]);
  return compact(rebuild(m.verts, faces, wireEdges(m), smooth), looseVerts(m)).mesh;
}

/** Groups of faces connected through the given edges (union-find). */
function groupsAcrossEdges(m: MeshData, edgeList: readonly number[]): number[][] {
  const topo = new MeshTopology(m);
  const parent = m.faces.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  const touched = new Set<number>();
  for (const e of edgeList) {
    const fs = topo.edgeFaces[e]!;
    if (fs.length !== 2) continue;
    parent[find(fs[0]!)] = find(fs[1]!);
    touched.add(fs[0]!);
    touched.add(fs[1]!);
  }
  const groups = new Map<number, number[]>();
  for (const f of touched) {
    const r = find(f);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(f);
  }
  return [...groups.values()];
}

/** Dissolve Faces: each connected group of selected faces becomes one face. */
export function dissolveFaces(m: MeshData, faceList: readonly number[]): MeshData {
  const topo = new MeshTopology(m);
  const set = new Set(faceList);
  const inner = m.edges.map((_, e) => e).filter((e) => topo.edgeFaces[e]!.length === 2 && topo.edgeFaces[e]!.every((f) => set.has(f)));
  return mergeFaceGroups(m, groupsAcrossEdges(m, inner));
}

/**
 * Dissolve Edges: the faces on both sides of each edge merge. Vertices left in
 * the middle of a straight run (two edges) are dissolved too ("Dissolve Vertices",
 * on by default in Blender).
 */
export function dissolveEdges(m: MeshData, edgeList: readonly number[]): MeshData {
  // Vertex positions are shared by reference across rebuilds: use them to find the ends again.
  const ends = edgeList.flatMap((e) => m.edges[e]!.map((v) => m.verts[v]!));
  const merged = mergeFaceGroups(m, groupsAcrossEdges(m, edgeList));
  const idx = [...new Set(ends)].map((p) => merged.verts.indexOf(p)).filter((i) => i >= 0);
  return dissolveVerts(merged, idx, true);
}

/**
 * Dissolve Vertices: the faces around each vertex become one face without it.
 * A vertex between two edges is simply removed from its faces.
 * `onlyTwoValent`: skip vertices with more than two edges.
 * FIDELITY? Vertices on an open border with more than two edges are left as they are.
 */
export function dissolveVerts(m: MeshData, vertList: readonly number[], onlyTwoValent = false): MeshData {
  let mesh = m;
  // Positions identify vertices across rebuilds (indices change after each step).
  const targets = vertList.map((v) => m.verts[v]!);
  for (const p of targets) {
    const v = mesh.verts.indexOf(p);
    if (v < 0) continue;
    const topo = new MeshTopology(mesh);
    const edges = topo.vertEdges[v]!;
    const faces = topo.vertFaces[v]!;
    if (edges.length === 2) {
      const [n1, n2] = edges.map((e) => topo.otherVert(e, v));
      const cut = mesh.faces.map((f) => (f.includes(v) ? f.filter((x) => x !== v) : f));
      const ids = [...cut.keys()].filter((i) => cut[i]!.length >= 3);
      const wires = wireEdges(mesh).filter(([a, b]) => a !== v && b !== v);
      if (faces.length === 0) wires.push([n1!, n2!]);
      const smooth = smoothFrom(mesh, ids);
      mesh = compact(rebuild(mesh.verts, ids.map((i) => cut[i]!), wires, smooth), looseVerts(mesh)).mesh;
      continue;
    }
    if (onlyTwoValent || !topo.isManifoldVert(v) || edges.some((e) => topo.isBoundaryEdge(e))) continue;
    // Closed fan: join the faces around v, walking from one to the next.
    const loops = faces.map((f) => {
      const face = mesh.faces[f]!;
      const i = face.indexOf(v);
      return [...face.slice(i + 1), ...face.slice(0, i)]; // from the vertex after v to the one before
    });
    const merged: number[] = [...loops[0]!];
    const used = new Set([0]);
    while (used.size < loops.length) {
      const last = merged[merged.length - 1];
      const k = loops.findIndex((l, i) => !used.has(i) && l[0] === last);
      if (k < 0) break;
      used.add(k);
      merged.push(...loops[k]!.slice(1));
    }
    if (used.size !== loops.length) continue;
    if (merged[merged.length - 1] === merged[0]) merged.pop();
    const fanSet = new Set(faces);
    const keptIds = [...mesh.faces.keys()].filter((i) => !fanSet.has(i));
    const newFaces = [...keptIds.map((i) => mesh.faces[i]!), merged];
    const smooth = smoothFrom(mesh, [...keptIds, Math.min(...faces)]);
    mesh = compact(rebuild(mesh.verts, newFaces, wireEdges(mesh), smooth), looseVerts(mesh)).mesh;
  }
  return mesh;
}
