/**
 * Extrude (E). The new geometry is created in place; the operator then moves it
 * (along the normal for faces, freely for edges and vertices).
 */
import { type Vec3, add, length, normalize, scale, vec3 } from '../../math/vec3';
import { faceArea, faceNormal } from '../geometry';
import { type Edge, type Face, type MeshData, edgeKey, faceEdgePairs, smoothFrom } from '../mesh-data';
import { rebuild, wireEdges } from './common';

export interface ExtrudeResult {
  readonly mesh: MeshData;
  /** What to select afterwards (the part that moves). */
  readonly select: { readonly kind: 'vert' | 'edge' | 'face'; readonly elements: readonly number[] };
  /** Average normal of the extruded faces (region extrude), for the move. */
  readonly normal: Vec3 | null;
}

/** Directed boundary edges of a face region: edges used by exactly one region face. */
export function regionBoundary(m: MeshData, region: ReadonlySet<number>): [number, number][] {
  return regionBoundaryFaces(m, region).map(([a, b]) => [a, b]);
}

/** Like regionBoundary, with the region face each edge belongs to: [a, b, face]. */
export function regionBoundaryFaces(m: MeshData, region: ReadonlySet<number>): [number, number, number][] {
  const count = new Map<string, number>();
  for (const f of region) for (const [a, b] of faceEdgePairs(m.faces[f]!)) count.set(edgeKey(a, b), (count.get(edgeKey(a, b)) ?? 0) + 1);
  const out: [number, number, number][] = [];
  for (const f of region) for (const [a, b] of faceEdgePairs(m.faces[f]!)) if (count.get(edgeKey(a, b)) === 1) out.push([a, b, f]);
  return out;
}

/** Area-weighted average normal of a set of faces. */
export function regionNormal(m: MeshData, faces: Iterable<number>): Vec3 {
  let n = vec3(0, 0, 0);
  for (const f of faces) n = add(n, scale(faceNormal(m, f), faceArea(m, f)));
  return length(n) > 1e-12 ? normalize(n) : vec3(0, 0, 1);
}

/**
 * Extrude Region: boundary vertices of the selected faces are duplicated, side
 * quads join the old and new boundaries, and the region keeps its face indices.
 */
export function extrudeRegion(m: MeshData, faceList: readonly number[]): ExtrudeResult {
  const region = new Set(faceList);
  const boundary = regionBoundaryFaces(m, region);
  const verts = [...m.verts];
  const dup = new Map<number, number>();
  for (const [a, b] of boundary) {
    for (const v of [a, b]) {
      if (!dup.has(v)) {
        dup.set(v, verts.length);
        verts.push(m.verts[v]!);
      }
    }
  }
  const faces: Face[] = m.faces.map((f, i) => (region.has(i) ? f.map((v) => dup.get(v) ?? v) : f));
  // Side quad: old edge a->b (as the unselected neighbour sees it reversed), new edge b'->a'.
  // It is shaded like the region face it comes from. FIDELITY?
  for (const [a, b] of boundary) faces.push([a, b, dup.get(b)!, dup.get(a)!]);
  const smooth = smoothFrom(m, [...m.faces.keys(), ...boundary.map(([, , f]) => f)]);
  return {
    mesh: rebuild(verts, faces, wireEdges(m), smooth),
    select: { kind: 'face', elements: faceList },
    normal: regionNormal(m, region),
  };
}

/** Extrude edges: each selected edge becomes a quad towards its copy. */
export function extrudeEdges(m: MeshData, edgeList: readonly number[]): ExtrudeResult {
  const verts = [...m.verts];
  const dup = new Map<number, number>();
  const copy = (v: number) => {
    if (!dup.has(v)) {
      dup.set(v, verts.length);
      verts.push(m.verts[v]!);
    }
    return dup.get(v)!;
  };
  // Orientation of each edge in the face that uses it, so new quads face the same
  // way; the new quad is shaded like that face (FIDELITY?).
  const dir = new Map<string, [number, number, number]>();
  m.faces.forEach((f, fi) => {
    for (const [a, b] of faceEdgePairs(f)) dir.set(edgeKey(a, b), [a, b, fi]);
  });
  const faces: Face[] = [...m.faces];
  const sources: number[] = [...m.faces.keys()];
  const newEdges: Edge[] = [];
  for (const e of edgeList) {
    const [a0, b0] = m.edges[e]!;
    const [a, b, from] = dir.get(edgeKey(a0, b0)) ?? [a0, b0, -1];
    const a2 = copy(a);
    const b2 = copy(b);
    faces.push([b, a, a2, b2]);
    sources.push(from);
    newEdges.push([a2, b2]);
  }
  const mesh = rebuild(verts, faces, wireEdges(m), smoothFrom(m, sources));
  const newEdgeIds = newEdges.map(([a, b]) => mesh.edges.findIndex(([x, y]) => edgeKey(x, y) === edgeKey(a, b)));
  return { mesh, select: { kind: 'edge', elements: newEdgeIds }, normal: null };
}

/** Extrude vertices: each selected vertex gets a copy joined by a new edge. */
export function extrudeVerts(m: MeshData, vertList: readonly number[]): ExtrudeResult {
  const verts = [...m.verts];
  const newEdges: Edge[] = [...wireEdges(m)];
  const created: number[] = [];
  for (const v of vertList) {
    const n = verts.length;
    verts.push(m.verts[v]!);
    newEdges.push([v, n]);
    created.push(n);
  }
  return { mesh: rebuild(verts, m.faces, newEdges, m.smoothFaces), select: { kind: 'vert', elements: created }, normal: null };
}
