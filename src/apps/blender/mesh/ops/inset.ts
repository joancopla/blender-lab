/**
 * Inset Faces (I): a smaller copy of the selected faces inside them, joined by a
 * ring of quads. Region mode insets the selection as a whole; Individual (I I)
 * insets each face on its own.
 */
import { type Vec3, add, cross, dot, normalize, scale, sub } from '../../math/vec3';
import { faceNormal } from '../geometry';
import { type Face, type MeshData, smoothFrom } from '../mesh-data';
import { rebuild, wireEdges } from './common';
import { regionBoundary, regionNormal } from './extrude';

export interface InsetParams {
  /** Distance of the new edges from the old ones, inside the faces. */
  readonly thickness: number;
  /** Distance along the normal (positive = outwards). */
  readonly depth: number;
  readonly individual: boolean;
}

/**
 * Offset of a corner so that both neighbouring edges move `thickness` inwards
 * (miter). `inA` and `inB` are the unit inward directions of the two edges.
 */
function miter(inA: Vec3, inB: Vec3, thickness: number): Vec3 {
  const d = 1 + dot(inA, inB);
  if (d < 1e-6) return scale(inA, thickness);
  return scale(add(inA, inB), thickness / d);
}

/** Unit inward direction of edge a->b inside a face with normal n (interior on the left). */
const inward = (m: MeshData, n: Vec3, a: number, b: number) => normalize(cross(n, sub(m.verts[b]!, m.verts[a]!)));

export function inset(m: MeshData, faceList: readonly number[], p: InsetParams): MeshData {
  return p.individual ? insetIndividual(m, faceList, p) : insetRegion(m, faceList, p);
}

function insetRegion(m: MeshData, faceList: readonly number[], p: InsetParams): MeshData {
  const region = new Set(faceList);
  const boundary = regionBoundary(m, region);
  if (boundary.length === 0) return m;
  // Inward direction of each boundary edge, from the region face it belongs to.
  const faceOfEdge = new Map<string, number>();
  for (const f of region) {
    const face = m.faces[f]!;
    face.forEach((a, i) => faceOfEdge.set(`${a}>${face[(i + 1) % face.length]}`, f));
  }
  const inDir = new Map<string, Vec3>();
  for (const [a, b] of boundary) inDir.set(`${a}>${b}`, inward(m, faceNormal(m, faceOfEdge.get(`${a}>${b}`)!), a, b));
  const outgoing = new Map<number, [number, number]>();
  const incoming = new Map<number, [number, number]>();
  for (const e of boundary) {
    outgoing.set(e[0], e);
    incoming.set(e[1], e);
  }
  const n = regionNormal(m, region);
  const verts = [...m.verts];
  const dup = new Map<number, number>();
  for (const [a] of boundary) {
    const eIn = incoming.get(a);
    const eOut = outgoing.get(a);
    const dIn = eIn ? inDir.get(`${eIn[0]}>${eIn[1]}`)! : inDir.get(`${eOut![0]}>${eOut![1]}`)!;
    const dOut = eOut ? inDir.get(`${eOut[0]}>${eOut[1]}`)! : dIn;
    const off = add(miter(dIn, dOut, p.thickness), scale(n, p.depth));
    dup.set(a, verts.length);
    verts.push(add(m.verts[a]!, off));
  }
  // Interior vertices of the region follow the depth.
  const regionVerts = new Set([...region].flatMap((f) => [...m.faces[f]!]));
  if (p.depth !== 0) for (const v of regionVerts) if (!dup.has(v)) verts[v] = add(verts[v]!, scale(n, p.depth));
  const faces: Face[] = m.faces.map((f, i) => (region.has(i) ? f.map((v) => dup.get(v) ?? v) : f));
  // Ring quads are shaded like the face they come from.
  for (const [a, b] of boundary) faces.push([a, b, dup.get(b)!, dup.get(a)!]);
  const sources = [...m.faces.keys(), ...boundary.map(([a, b]) => faceOfEdge.get(`${a}>${b}`)!)];
  return rebuild(verts, faces, wireEdges(m), smoothFrom(m, sources));
}

function insetIndividual(m: MeshData, faceList: readonly number[], p: InsetParams): MeshData {
  const verts = [...m.verts];
  const faces: Face[] = [...m.faces];
  const sources: number[] = [...m.faces.keys()];
  for (const f of faceList) {
    const face = m.faces[f]!;
    const nrm = faceNormal(m, f);
    const k = face.length;
    const inner = face.map((v, i) => {
      const prev = face[(i + k - 1) % k]!;
      const next = face[(i + 1) % k]!;
      const off = add(miter(inward(m, nrm, prev, v), inward(m, nrm, v, next), p.thickness), scale(nrm, p.depth));
      verts.push(add(m.verts[v]!, off));
      return verts.length - 1;
    });
    faces[f] = inner;
    face.forEach((a, i) => {
      const b = face[(i + 1) % k]!;
      faces.push([a, b, inner[(i + 1) % k]!, inner[i]!]);
      sources.push(f);
    });
  }
  return rebuild(verts, faces, wireEdges(m), smoothFrom(m, sources));
}
