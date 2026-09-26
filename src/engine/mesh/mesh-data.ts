/**
 * Mesh data as stored in the scene state: plain, immutable and serialisable,
 * so undo snapshots are just references. Blender space (Z up), object local
 * coordinates.
 *
 * - `verts`: positions.
 * - `edges`: every edge, including the ones used by faces and loose ("wire")
 *   edges. Stored with the smaller index first.
 * - `faces`: ordered vertex indices (n-gons allowed). Counter-clockwise seen
 *   from outside, so the right-hand rule gives the outward normal.
 *
 * Faces are never triangulated here: triangulation is only for drawing.
 */
import type { Vec3 } from '../math/vec3';

export type Edge = readonly [number, number];
export type Face = readonly number[];

export interface MeshData {
  readonly verts: readonly Vec3[];
  readonly edges: readonly Edge[];
  readonly faces: readonly Face[];
}

/** Edge with its indices in canonical order (smaller first). */
export const edge = (a: number, b: number): Edge => (a < b ? [a, b] : [b, a]);

export const edgeKey = (a: number, b: number): string => (a < b ? `${a}_${b}` : `${b}_${a}`);

/** Edges of a face, in loop order: (v0,v1), (v1,v2), ..., (vn,v0). */
export function faceEdgePairs(face: Face): [number, number][] {
  return face.map((v, i) => [v, face[(i + 1) % face.length]!] as [number, number]);
}

/**
 * Builds mesh data from vertices and faces, deriving the edge list (plus any
 * extra loose edges). Edge order follows first use, like Blender's builders.
 */
export function meshFromFaces(verts: readonly Vec3[], faces: readonly Face[], looseEdges: readonly Edge[] = []): MeshData {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  const add = (a: number, b: number) => {
    const k = edgeKey(a, b);
    if (seen.has(k)) return;
    seen.add(k);
    edges.push(edge(a, b));
  };
  for (const f of faces) for (const [a, b] of faceEdgePairs(f)) add(a, b);
  for (const [a, b] of looseEdges) add(a, b);
  return { verts, edges, faces };
}

export interface MeshCounts {
  readonly verts: number;
  readonly edges: number;
  readonly faces: number;
  /** Triangles after triangulating every face (what Statistics calls "Triangles"). */
  readonly tris: number;
}

export function meshCounts(m: MeshData): MeshCounts {
  return {
    verts: m.verts.length,
    edges: m.edges.length,
    faces: m.faces.length,
    tris: m.faces.reduce((n, f) => n + Math.max(0, f.length - 2), 0),
  };
}
