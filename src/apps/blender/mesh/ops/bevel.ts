/**
 * Bevel (Ctrl+B edges, Ctrl+Shift+B vertices), Offset width mode, profile 0.5.
 *
 * Exact for the lab's cases: edges between two faces whose end vertices have
 * three edges and only one beveled edge each (the vertical edges of a box).
 * The edge becomes a strip of `segments` faces following a quarter-ellipse
 * profile (a circle for 90° corners, as Blender's profile 0.5); the third face at
 * each end gets the profile points in its outline.
 * Vertex bevel supports one segment (a flat cap).
 * Other configurations return null (the operator then does nothing).
 * FIDELITY? Blender handles every case (corners with several beveled edges,
 * other profiles and width modes); documented as out of scope.
 * New faces are shaded like a face next to them (FIDELITY? which one when the
 * two faces of a beveled edge differ).
 */
import { type Vec3, add, cross, length, normalize, scale, sub } from '../../math/vec3';
import { type Face, type MeshData, edgeKey, smoothFrom } from '../mesh-data';
import { MeshTopology } from '../topology';
import { compact, looseVerts, rebuild, wireEdges } from './common';

/** Points of the profile from p1 to p2 around the corner `v` (segments + 1 points). */
export function profilePoints(v: Vec3, p1: Vec3, p2: Vec3, segments: number): Vec3[] {
  const o = sub(add(p1, p2), v); // opposite corner of the parallelogram
  const a = sub(p1, o);
  const b = sub(p2, o);
  return Array.from({ length: segments + 1 }, (_, k) => {
    const th = ((k / segments) * Math.PI) / 2;
    return add(o, add(scale(a, Math.cos(th)), scale(b, Math.sin(th))));
  });
}

/** Distance along an edge that gives a perpendicular offset `width` from the beveled edge. */
function slideDistance(edgeDir: Vec3, sideDir: Vec3, width: number): number {
  const sin = length(cross(normalize(edgeDir), normalize(sideDir)));
  return sin > 1e-6 ? width / sin : width;
}

export function bevelEdges(m: MeshData, edgeList: readonly number[], width: number, segments: number): MeshData | null {
  if (edgeList.length === 0 || segments < 1) return null;
  const t = new MeshTopology(m);
  const selected = new Set(edgeList);
  const verts = [...m.verts];
  const replaceInFace = new Map<number, Map<number, number[]>>(); // face -> vertex -> replacement run
  const setRun = (f: number, v: number, run: number[]) => {
    if (!replaceInFace.has(f)) replaceInFace.set(f, new Map());
    replaceInFace.get(f)!.set(v, run);
  };
  const strips: Face[] = [];
  const stripFrom: number[] = [];

  for (const e of edgeList) {
    const faces = t.edgeFaces[e]!;
    if (faces.length !== 2) return null;
    const [fa, fb] = faces as [number, number];
    // Direction of e in face A decides the orientation of the strip.
    const faceA = m.faces[fa]!;
    const [e0, e1] = m.edges[e]!;
    const ia = faceA.indexOf(e0);
    const [v0, v1] = faceA[(ia + 1) % faceA.length] === e1 ? [e0, e1] : [e1, e0];

    const arcs: number[][] = [];
    for (const v of [v0, v1]) {
      const edges = t.vertEdges[v]!;
      if (edges.length !== 3 || edges.filter((x) => selected.has(x)).length !== 1) return null;
      const other = v === v0 ? v1 : v0;
      // Side edges: the one in face A and the one in face B.
      const sideA = edges.find((x) => x !== e && t.edgeFaces[x]!.includes(fa));
      const sideB = edges.find((x) => x !== e && t.edgeFaces[x]!.includes(fb));
      if (sideA === undefined || sideB === undefined) return null;
      const pv = m.verts[v]!;
      const ea = sub(m.verts[t.otherVert(sideA, v)]!, pv);
      const eb = sub(m.verts[t.otherVert(sideB, v)]!, pv);
      const along = sub(m.verts[other]!, pv);
      // Clamp Overlap: never past the middle of a side edge.
      const da = Math.min(slideDistance(along, ea, width), length(ea) / 2);
      const db = Math.min(slideDistance(along, eb, width), length(eb) / 2);
      const pa = add(pv, scale(normalize(ea), da));
      const pb = add(pv, scale(normalize(eb), db));
      const arc = profilePoints(pv, pa, pb, segments).map((p) => {
        verts.push(p);
        return verts.length - 1;
      });
      arcs.push(arc);
      setRun(fa, v, [arc[0]!]);
      setRun(fb, v, [arc[segments]!]);
      // The third face (between the two side edges) gets the whole profile.
      const fc = t.vertFaces[v]!.find((f) => f !== fa && f !== fb);
      if (fc === undefined) return null;
      const face = m.faces[fc]!;
      const k = face.indexOf(v);
      const before = face[(k + face.length - 1) % face.length]!;
      const fromA = before === t.otherVert(sideA, v);
      setRun(fc, v, fromA ? arc : [...arc].reverse());
    }
    const [a0, a1] = arcs as [number[], number[]];
    // Strip quads between the two profiles; the first shares its edge with face A.
    for (let k = 0; k < segments; k++) {
      strips.push([a1[k]!, a0[k]!, a0[k + 1]!, a1[k + 1]!]);
      stripFrom.push(fa);
    }
  }

  const faces: Face[] = m.faces.map((f, i) => {
    const runs = replaceInFace.get(i);
    return runs ? f.flatMap((v) => runs.get(v) ?? [v]) : f;
  });
  const bevelled = new Set(edgeList.map((e) => edgeKey(...m.edges[e]!)));
  const wires = wireEdges(m).filter(([a, b]) => !bevelled.has(edgeKey(a, b)));
  const smooth = smoothFrom(m, [...m.faces.keys(), ...stripFrom]);
  return compact(rebuild(verts, [...faces, ...strips], wires, smooth), looseVerts(m)).mesh;
}

/** Faces created by a bevel: they are appended last, so they are the final ones. */
export function lastFaces(mesh: MeshData, count: number): number[] {
  return Array.from({ length: count }, (_, i) => mesh.faces.length - count + i);
}

/** Vertex bevel with one segment: each vertex becomes a flat cap. */
export function bevelVerts(m: MeshData, vertList: readonly number[], width: number): MeshData | null {
  if (vertList.length === 0) return null;
  const t = new MeshTopology(m);
  const sel = new Set(vertList);
  const verts = [...m.verts];
  const pointOnEdge = new Map<string, number>(); // "v>n" -> new vertex near v on edge v-n
  const caps: Face[] = [];
  for (const v of vertList) {
    if (!t.isManifoldVert(v) || t.vertNeighbours(v).some((n) => sel.has(n))) return null;
    for (const n of t.vertNeighbours(v)) {
      const pv = m.verts[v]!;
      const d = sub(m.verts[n]!, pv);
      verts.push(add(pv, scale(normalize(d), Math.min(width, length(d) / 2))));
      pointOnEdge.set(`${v}>${n}`, verts.length - 1);
    }
  }
  const faces: Face[] = m.faces.map((f) =>
    f.flatMap((v, i) => {
      if (!sel.has(v)) return [v];
      const prev = f[(i + f.length - 1) % f.length]!;
      const next = f[(i + 1) % f.length]!;
      return [pointOnEdge.get(`${v}>${prev}`)!, pointOnEdge.get(`${v}>${next}`)!];
    }),
  );
  // Cap: walk the faces around v; each gives the segment (next-point -> prev-point) reversed.
  for (const v of vertList) {
    const next = new Map<number, number>();
    for (const f of t.vertFaces[v]!) {
      const face = m.faces[f]!;
      const i = face.indexOf(v);
      const prev = face[(i + face.length - 1) % face.length]!;
      const nxt = face[(i + 1) % face.length]!;
      // In the face the run goes prevPoint -> nextPoint; the cap goes the other way.
      next.set(pointOnEdge.get(`${v}>${nxt}`)!, pointOnEdge.get(`${v}>${prev}`)!);
    }
    const start = next.keys().next().value!;
    const loop = [start];
    let cur = next.get(start)!;
    while (cur !== start && loop.length <= next.size) {
      loop.push(cur);
      cur = next.get(cur)!;
    }
    caps.push(loop);
  }
  const smooth = smoothFrom(m, [...m.faces.keys(), ...vertList.map((v) => t.vertFaces[v]![0] ?? -1)]);
  return compact(rebuild(verts, [...faces, ...caps], wireEdges(m), smooth), looseVerts(m)).mesh;
}

