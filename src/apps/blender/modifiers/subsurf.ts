/**
 * Subdivision Surface modifier, reproducing what Blender gets from OpenSubdiv
 * with the modifier's defaults (Boundary Smooth: All, no creases, Use Limit
 * Surface on):
 *
 * - Catmull-Clark: each level splits every n-gon into n quads (face point,
 *   edge points, moved original vertices). Boundary and non-manifold edges are
 *   sharp (crease rule); vertices with 3+ sharp edges or several fans are corners.
 * - Simple: the same split without moving anything (bilinear).
 * - Use Limit Surface: after the last level, every vertex is moved onto the
 *   limit surface with the limit stencils. Blender evaluates the limit surface
 *   at the same parametric points, which is the same thing.
 */
import { type Vec3, add, scale, vec3 } from '../math/vec3';
import { type Edge, type Face, type MeshData, edge, smoothFrom, withSmooth } from '../mesh/mesh-data';
import { MeshTopology } from '../mesh/topology';
import type { SubsurfModifier } from './types';

/** How a vertex moves, from the sharp (boundary / non-manifold) edges around it. */
type VertRule =
  | { readonly kind: 'smooth' }
  | { readonly kind: 'crease'; readonly a: number; readonly b: number }
  | { readonly kind: 'corner' }
  /** Only on loose edges, or loose: stays. */
  | { readonly kind: 'fixed' };

const isSharp = (t: MeshTopology, e: number) => t.edgeFaces[e]!.length === 1 || t.edgeFaces[e]!.length > 2;

function vertRule(t: MeshTopology, v: number): VertRule {
  const faceEdges = t.vertEdges[v]!.filter((e) => t.edgeFaces[e]!.length > 0);
  if (faceEdges.length === 0) return { kind: 'fixed' };
  const sharp = faceEdges.filter((e) => isSharp(t, e));
  if (sharp.length >= 3) return { kind: 'corner' };
  if (sharp.length === 2) return { kind: 'crease', a: t.otherVert(sharp[0]!, v), b: t.otherVert(sharp[1]!, v) };
  // Smooth (or a dart, one sharp edge): needs a single closed fan of faces.
  // FIDELITY? A dart (a single sharp edge) only happens with non-manifold edges here.
  if (sharp.length === 0 && t.vertFaces[v]!.length !== faceEdges.length) return { kind: 'corner' };
  return { kind: 'smooth' };
}

function centroid(verts: readonly Vec3[], ids: readonly number[]): Vec3 {
  let c = vec3(0, 0, 0);
  for (const i of ids) c = add(c, verts[i]!);
  return scale(c, 1 / ids.length);
}

/** One level of subdivision. Vertex order: original vertices, face points, edge points. */
export function subdivideOnce(m: MeshData, smooth: boolean): MeshData {
  const t = new MeshTopology(m);
  const nv = m.verts.length;
  const nf = m.faces.length;
  const facePts = m.faces.map((f) => centroid(m.verts, f));

  const edgePts = m.edges.map(([a, b], e) => {
    const faces = t.edgeFaces[e]!;
    if (smooth && faces.length === 2) {
      return scale(add(add(m.verts[a]!, m.verts[b]!), add(facePts[faces[0]!]!, facePts[faces[1]!]!)), 0.25);
    }
    return scale(add(m.verts[a]!, m.verts[b]!), 0.5);
  });

  const vertPts = m.verts.map((p, v) => {
    if (!smooth) return p;
    const rule = vertRule(t, v);
    if (rule.kind === 'fixed' || rule.kind === 'corner') return p;
    if (rule.kind === 'crease') return add(scale(p, 0.75), scale(add(m.verts[rule.a]!, m.verts[rule.b]!), 0.125));
    const edges = t.vertEdges[v]!.filter((e) => t.edgeFaces[e]!.length > 0);
    const n = edges.length;
    let ring = vec3(0, 0, 0);
    for (const e of edges) ring = add(ring, m.verts[t.otherVert(e, v)]!);
    let faces = vec3(0, 0, 0);
    for (const f of t.vertFaces[v]!) faces = add(faces, facePts[f]!);
    return add(scale(p, (n - 2) / n), scale(add(ring, faces), 1 / (n * n)));
  });

  const faceVert = (f: number) => nv + f;
  const edgeVert = (e: number) => nv + nf + e;
  const faces: Face[] = [];
  const sources: number[] = []; // every child face is shaded like its parent
  const edges: Edge[] = [];
  m.faces.forEach((f, fi) => {
    const fe = t.faceEdges[fi]!; // fe[i] joins f[i] and f[i + 1]
    for (let i = 0; i < f.length; i++) {
      const prev = fe[(i + f.length - 1) % f.length]!;
      faces.push([f[i]!, edgeVert(fe[i]!), faceVert(fi), edgeVert(prev)]);
      sources.push(fi);
      edges.push(edge(faceVert(fi), edgeVert(fe[i]!)));
    }
  });
  m.edges.forEach(([a, b], e) => {
    edges.push(edge(a, edgeVert(e)), edge(edgeVert(e), b));
  });
  return withSmooth({ verts: [...vertPts, ...facePts, ...edgePts], edges, faces }, smoothFrom(m, sources));
}

/** Moves every vertex onto the Catmull-Clark limit surface (all faces must be quads). */
export function limitPositions(m: MeshData): MeshData {
  const t = new MeshTopology(m);
  const verts = m.verts.map((p, v) => {
    const rule = vertRule(t, v);
    if (rule.kind === 'fixed' || rule.kind === 'corner') return p;
    if (rule.kind === 'crease') return scale(add(add(m.verts[rule.a]!, m.verts[rule.b]!), scale(p, 4)), 1 / 6);
    const edges = t.vertEdges[v]!.filter((e) => t.edgeFaces[e]!.length > 0);
    const n = edges.length;
    let ring = vec3(0, 0, 0);
    for (const e of edges) ring = add(ring, m.verts[t.otherVert(e, v)]!);
    let diag = vec3(0, 0, 0);
    for (const f of t.vertFaces[v]!) {
      const face = m.faces[f]!;
      diag = add(diag, m.verts[face[(face.indexOf(v) + 2) % 4]!]!);
    }
    return scale(add(add(scale(p, n * n), scale(ring, 4)), diag), 1 / (n * (n + 5)));
  });
  return { ...m, verts };
}

export function applySubsurf(m: MeshData, mod: SubsurfModifier, levels: number): MeshData {
  if (levels <= 0 || m.faces.length === 0) return m;
  const smooth = mod.subdivisionType === 'CATMULL_CLARK';
  let out = m;
  for (let i = 0; i < levels; i++) out = subdivideOnce(out, smooth);
  return smooth && mod.useLimitSurface ? limitPositions(out) : out;
}
