/**
 * Shared helpers for mesh operations: rebuilding edges, remapping vertices,
 * removing what is no longer used. All pure: they return new MeshData.
 */
import type { Vec3 } from '../../math/vec3';
import { type Edge, type Face, type MeshData, edge, edgeKey, faceEdgePairs, smoothFrom } from '../mesh-data';

/**
 * Builds a mesh from vertices and faces, keeping the given loose edges (those
 * not already used by a face) and dropping duplicates and self-edges.
 * `smoothFaces`, parallel to `faces`, is kept as is (see smoothFrom).
 */
export function rebuild(
  verts: readonly Vec3[],
  faces: readonly Face[],
  extraEdges: readonly Edge[] = [],
  smoothFaces?: readonly boolean[],
): MeshData {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  const add = (a: number, b: number) => {
    if (a === b) return;
    const k = edgeKey(a, b);
    if (seen.has(k)) return;
    seen.add(k);
    edges.push(edge(a, b));
  };
  for (const f of faces) for (const [a, b] of faceEdgePairs(f)) add(a, b);
  for (const [a, b] of extraEdges) add(a, b);
  return smoothFaces ? { verts, edges, faces, smoothFaces } : { verts, edges, faces };
}

/** Edges of the mesh that no face uses (wire edges). */
export function wireEdges(m: MeshData): Edge[] {
  const used = new Set<string>();
  for (const f of m.faces) for (const [a, b] of faceEdgePairs(f)) used.add(edgeKey(a, b));
  return m.edges.filter(([a, b]) => !used.has(edgeKey(a, b)));
}

/**
 * Cleans a face loop after vertices were merged: removes consecutive repeats
 * (including the wrap-around). Returns null when fewer than 3 vertices remain.
 */
export function cleanLoop(face: readonly number[]): number[] | null {
  const out: number[] = [];
  for (const v of face) if (out[out.length - 1] !== v) out.push(v);
  while (out.length > 1 && out[0] === out[out.length - 1]) out.pop();
  return out.length >= 3 && new Set(out).size === out.length ? out : null;
}

/**
 * Removes vertices not used by any face or edge and renumbers everything.
 * `keep` marks vertices to keep even if unused (e.g. loose vertices that were
 * already there). Returns the new mesh and the old -> new index map (-1 if removed).
 */
export function compact(m: MeshData, keep: ReadonlySet<number> = new Set()): { mesh: MeshData; map: number[] } {
  const used = new Array<boolean>(m.verts.length).fill(false);
  for (const f of m.faces) for (const v of f) used[v] = true;
  for (const [a, b] of m.edges) {
    used[a] = true;
    used[b] = true;
  }
  for (const v of keep) used[v] = true;
  const map: number[] = [];
  const verts: Vec3[] = [];
  m.verts.forEach((p, i) => {
    if (used[i]) {
      map[i] = verts.length;
      verts.push(p);
    } else {
      map[i] = -1;
    }
  });
  return {
    mesh: {
      ...m,
      verts,
      edges: m.edges.map(([a, b]) => edge(map[a]!, map[b]!)),
      faces: m.faces.map((f) => f.map((v) => map[v]!)),
    },
    map,
  };
}

/** Vertices that no face or edge uses (loose vertices). */
export function looseVerts(m: MeshData): Set<number> {
  const used = new Set<number>();
  for (const f of m.faces) for (const v of f) used.add(v);
  for (const [a, b] of m.edges) {
    used.add(a);
    used.add(b);
  }
  return new Set(m.verts.map((_, i) => i).filter((i) => !used.has(i)));
}

/**
 * Applies a vertex remap (several old vertices can map to one), cleaning faces
 * and edges, and removes vertices nobody uses any more.
 */
export function remapVerts(m: MeshData, target: readonly number[]): { mesh: MeshData; map: number[] } {
  const faces: number[][] = [];
  const sources: number[] = [];
  const faceKeys = new Set<string>();
  m.faces.forEach((f, i) => {
    const loop = cleanLoop(f.map((v) => target[v]!));
    if (!loop) return;
    const k = [...loop].sort((a, b) => a - b).join(',');
    if (faceKeys.has(k)) return;
    faceKeys.add(k);
    faces.push(loop);
    sources.push(i);
  });
  const loose = looseVerts(m);
  const wires = wireEdges(m).map(([a, b]) => [target[a]!, target[b]!] as const);
  const rebuilt = rebuild(m.verts, faces, wires, smoothFrom(m, sources));
  const keep = new Set([...loose].map((v) => target[v]!));
  return compact(rebuilt, keep);
}
