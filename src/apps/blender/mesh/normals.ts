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
function cornerAngle(m: MeshData, face: readonly number[], i: number): number {
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
 * Normal of every face corner: result[f][i] is the normal at face f's i-th
 * vertex. `sharpEdge` marks extra edges that split the shading (by edge index).
 */
export function cornerNormals(m: MeshData, sharpEdge: (e: number) => boolean = () => false): Vec3[][] {
  const faceNormals = m.faces.map((_, f) => faceNormal(m, f));
  if (!m.smoothFaces) return m.faces.map((face, f) => face.map(() => faceNormals[f]!));

  // Union-find over corners; corner id = start[f] + i.
  const start: number[] = [];
  let total = 0;
  for (const face of m.faces) {
    start.push(total);
    total += face.length;
  }
  const parent = Array.from({ length: total }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const join = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  const t = new MeshTopology(m);
  t.edgeFaces.forEach((faces, e) => {
    if (faces.length !== 2 || sharpEdge(e)) return;
    const [f1, f2] = faces as [number, number];
    if (!isSmooth(m, f1) || !isSmooth(m, f2)) return;
    const [a, b] = m.edges[e]!;
    const face1 = m.faces[f1]!;
    const face2 = m.faces[f2]!;
    const a1 = face1.indexOf(a);
    const b1 = face1.indexOf(b);
    const a2 = face2.indexOf(a);
    const b2 = face2.indexOf(b);
    // Consistent winding: the faces go through the edge in opposite directions.
    const forward1 = face1[(a1 + 1) % face1.length] === b;
    const forward2 = face2[(a2 + 1) % face2.length] === b;
    if (forward1 === forward2) return;
    join(start[f1]! + a1, start[f2]! + a2);
    join(start[f1]! + b1, start[f2]! + b2);
  });

  const sum = new Map<number, Vec3>();
  m.faces.forEach((face, f) => {
    if (!isSmooth(m, f)) return;
    face.forEach((_, i) => {
      const r = find(start[f]! + i);
      sum.set(r, add(sum.get(r) ?? vec3(0, 0, 0), scale(faceNormals[f]!, cornerAngle(m, face, i))));
    });
  });

  return m.faces.map((face, f) =>
    face.map((_, i) => {
      if (!isSmooth(m, f)) return faceNormals[f]!;
      const s = sum.get(find(start[f]! + i))!;
      return length(s) > 1e-12 ? normalize(s) : faceNormals[f]!;
    }),
  );
}
