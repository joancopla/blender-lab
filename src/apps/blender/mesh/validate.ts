/**
 * Consistency checks for MeshData, run by tests after every operation.
 */
import { edgeKey, faceEdgePairs, type MeshData } from './mesh-data';
import { faceArea } from './geometry';
import { MeshTopology } from './topology';

export type MeshIssue =
  | { readonly kind: 'invalidIndex'; readonly where: 'edge' | 'face'; readonly index: number }
  | { readonly kind: 'duplicateEdge'; readonly edge: number }
  | { readonly kind: 'selfEdge'; readonly edge: number }
  /** A face uses an edge that is not in the edge list. */
  | { readonly kind: 'missingFaceEdge'; readonly face: number; readonly a: number; readonly b: number }
  | { readonly kind: 'degenerateFace'; readonly face: number; readonly reason: 'tooFewVerts' | 'repeatedVert' | 'zeroArea' }
  | { readonly kind: 'duplicateFace'; readonly face: number }
  /** Two faces go through a shared edge in the same direction: flipped normals. */
  | { readonly kind: 'inconsistentOrientation'; readonly edge: number };

const AREA_EPSILON = 1e-10;

export function validateMesh(m: MeshData): MeshIssue[] {
  const issues: MeshIssue[] = [];
  const nv = m.verts.length;
  const validVert = (v: number) => Number.isInteger(v) && v >= 0 && v < nv;

  const keys = new Set<string>();
  m.edges.forEach(([a, b], i) => {
    if (!validVert(a) || !validVert(b)) issues.push({ kind: 'invalidIndex', where: 'edge', index: i });
    else if (a === b) issues.push({ kind: 'selfEdge', edge: i });
    const k = edgeKey(a, b);
    if (keys.has(k)) issues.push({ kind: 'duplicateEdge', edge: i });
    keys.add(k);
  });

  const faceKeys = new Set<string>();
  m.faces.forEach((f, i) => {
    if (!f.every(validVert)) {
      issues.push({ kind: 'invalidIndex', where: 'face', index: i });
      return;
    }
    if (f.length < 3) issues.push({ kind: 'degenerateFace', face: i, reason: 'tooFewVerts' });
    else if (new Set(f).size !== f.length) issues.push({ kind: 'degenerateFace', face: i, reason: 'repeatedVert' });
    else if (faceArea(m, i) < AREA_EPSILON) issues.push({ kind: 'degenerateFace', face: i, reason: 'zeroArea' });
    for (const [a, b] of faceEdgePairs(f)) {
      if (!keys.has(edgeKey(a, b))) issues.push({ kind: 'missingFaceEdge', face: i, a, b });
    }
    const fk = [...f].sort((x, y) => x - y).join(',');
    if (faceKeys.has(fk)) issues.push({ kind: 'duplicateFace', face: i });
    faceKeys.add(fk);
  });
  if (issues.some((i) => i.kind === 'invalidIndex')) return issues;

  // Orientation: across a manifold edge, the two faces must go opposite ways.
  const topo = new MeshTopology(m);
  m.edges.forEach(([a, b], e) => {
    const faces = topo.edgeFaces[e]!;
    if (faces.length !== 2) return;
    const dirs = faces.map((fi) => {
      const f = m.faces[fi]!;
      const i = f.indexOf(a);
      return f[(i + 1) % f.length] === b ? 1 : -1;
    });
    if (dirs[0] === dirs[1]) issues.push({ kind: 'inconsistentOrientation', edge: e });
  });
  return issues;
}
