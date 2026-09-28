/**
 * Shading normals per face corner, as Blender computes them for drawing:
 *
 * - A flat face: every corner gets the face normal.
 * - A smooth face: each corner gets the average of the face normals around its
 *   vertex, weighted by the corner angles, but only across edges that do not
 *   split the shading. An edge splits it when one of its faces is flat, when
 *   it is sharp (`sharpEdge`), when it does not have exactly two faces, or when
 *   its two faces have opposite winding.
 *
 * So a fully smooth closed mesh gets one normal per vertex, and a smooth fan
 * that meets a flat face or a sharp edge is shaded on its own.
 */
import { type Vec3, add, cross, dot, length, normalize, scale, sub, vec3 } from '../math/vec3';
import { faceNormal } from './geometry';
import { type MeshData, isSmooth } from './mesh-data';
import { MeshTopology } from './topology';

/** Angle at corner i of face f (0 for a degenerate corner). */
export function cornerAngle(m: MeshData, face: readonly number[], i: number): number {
  const n = face.length;
  const p = m.verts[face[i]!]!;
  const a = sub(m.verts[face[(i + n - 1) % n]!]!, p);
  const b = sub(m.verts[face[(i + 1) % n]!]!, p);
  const la = length(a);
  const lb = length(b);
  if (la < 1e-12 || lb < 1e-12) return 0;
  return Math.atan2(length(cross(a, b)), dot(a, b));
}

/**
 * Vertex normals: the face normals around each vertex, weighted by the corner
 * angles (Blender's vertex normals). Zero for vertices without faces.
 */
export function vertexNormals(m: MeshData): Vec3[] {
  const sums = m.verts.map(() => vec3(0, 0, 0));
  m.faces.forEach((face, f) => {
    const n = faceNormal(m, f);
    face.forEach((v, i) => {
      sums[v] = add(sums[v]!, scale(n, cornerAngle(m, face, i)));
    });
  });
  return sums.map((s) => (length(s) > 1e-12 ? normalize(s) : vec3(0, 0, 0)));
}

/**
 * Auto Smooth: an edge between two faces is sharp when the angle between their
 * normals is greater than `angleDeg`.
 */
export function angleSharpEdges(m: MeshData, angleDeg: number): (e: number) => boolean {
  const t = new MeshTopology(m);
  const minDot = Math.cos((angleDeg * Math.PI) / 180);
  const sharp = t.edgeFaces.map((faces) => {
    if (faces.length !== 2) return false;
    return dot(faceNormal(m, faces[0]!), faceNormal(m, faces[1]!)) < minDot - 1e-9;
  });
  return (e) => sharp[e] ?? false;
}

/**
 * Edges that split the shading besides flat faces: by edge index, or Auto
 * Smooth's angle (edges whose faces meet at more than `angleDeg`).
 */
export type SharpEdges = ((e: number) => boolean) | { readonly angleDeg: number };

/**
 * Normal of every face corner: result[f][i] is the normal at face f's i-th
 * vertex. Written for speed (it runs on every redraw of an edited mesh):
 * numeric edge keys, one pass over the corners and flat arrays for the sums.
 */
export function cornerNormals(m: MeshData, sharp?: SharpEdges): Vec3[][] {
  const faceNormals = m.faces.map((_, f) => faceNormal(m, f));
  if (!m.smoothFaces) return m.faces.map((face, f) => face.map(() => faceNormals[f]!));

  // Corner id = start[f] + i.
  const start = new Int32Array(m.faces.length);
  let total = 0;
  m.faces.forEach((face, f) => {
    start[f] = total;
    total += face.length;
  });

  // Up to two corners per edge (the corner at the edge's first vertex in its
  // face), and how many faces use the edge. Key: smaller * n + larger.
  const n = m.verts.length;
  const firstCorner = new Map<number, number>();
  const secondCorner = new Map<number, number>();
  const uses = new Map<number, number>();
  const cornerFace = new Int32Array(total);
  m.faces.forEach((face, f) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i]!;
      const b = face[(i + 1) % face.length]!;
      const key = a < b ? a * n + b : b * n + a;
      const c = start[f]! + i;
      cornerFace[c] = f;
      const k = uses.get(key) ?? 0;
      uses.set(key, k + 1);
      if (k === 0) firstCorner.set(key, c);
      else if (k === 1) secondCorner.set(key, c);
    }
  });

  let isSharpEdge: (key: number, f1: number, f2: number) => boolean = () => false;
  if (typeof sharp === 'function') {
    const edgeIndex = new Map<number, number>();
    m.edges.forEach(([a, b], e) => edgeIndex.set(a < b ? a * n + b : b * n + a, e));
    isSharpEdge = (key) => sharp(edgeIndex.get(key) ?? -1);
  } else if (sharp) {
    const minDot = Math.cos((sharp.angleDeg * Math.PI) / 180) - 1e-9;
    isSharpEdge = (_, f1, f2) => dot(faceNormals[f1]!, faceNormals[f2]!) < minDot;
  }

  const parent = new Int32Array(total);
  for (let i = 0; i < total; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const next = (c: number) => {
    const f = cornerFace[c]!;
    const i = c - start[f]!;
    return start[f]! + ((i + 1) % m.faces[f]!.length);
  };

  for (const [key, count] of uses) {
    if (count !== 2) continue;
    const c1 = firstCorner.get(key)!;
    const c2 = secondCorner.get(key)!;
    const f1 = cornerFace[c1]!;
    const f2 = cornerFace[c2]!;
    if (!isSmooth(m, f1) || !isSmooth(m, f2) || isSharpEdge(key, f1, f2)) continue;
    // Consistent winding: face 1 goes a -> b and face 2 goes b -> a.
    const a = m.faces[f1]![c1 - start[f1]!]!;
    const x = m.faces[f2]![c2 - start[f2]!]!;
    if (x === a) continue;
    // a: c1 in face 1, next(c2) in face 2; b: next(c1) in face 1, c2 in face 2.
    parent[find(c1)] = find(next(c2));
    parent[find(next(c1))] = find(c2);
  }

  const sums = new Float64Array(total * 3);
  m.faces.forEach((face, f) => {
    if (!isSmooth(m, f)) return;
    const fn = faceNormals[f]!;
    for (let i = 0; i < face.length; i++) {
      const w = cornerAngle(m, face, i);
      const r = find(start[f]! + i) * 3;
      sums[r] = sums[r]! + fn.x * w;
      sums[r + 1] = sums[r + 1]! + fn.y * w;
      sums[r + 2] = sums[r + 2]! + fn.z * w;
    }
  });

  return m.faces.map((face, f) => {
    if (!isSmooth(m, f)) return face.map(() => faceNormals[f]!);
    return face.map((_, i) => {
      const r = find(start[f]! + i) * 3;
      const x = sums[r]!;
      const y = sums[r + 1]!;
      const z = sums[r + 2]!;
      const len = Math.hypot(x, y, z);
      return len > 1e-12 ? vec3(x / len, y / len, z / len) : faceNormals[f]!;
    });
  });
}
