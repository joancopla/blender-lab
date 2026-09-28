/**
 * Bevel modifier (Affect: Edges, Width Type: Offset, profile 0.5, Clamp
 * Overlap, Loop Slide), after Blender's bmesh_bevel. Around every vertex that
 * has beveled edges, the edges and faces form a fan; the beveled edges split it
 * into sectors, and each sector gets one new "boundary vertex":
 *
 * - a sector that is a single face: where the two offset lines meet in that face;
 * - a sector with one unbeveled edge: slid along that edge (Loop Slide).
 *
 * Each beveled edge becomes a strip of `segments` faces between the profiles
 * at its two ends. Supported vertices (what the lab's stages need):
 *
 * - 1 beveled edge and 3 edges (the end of a beveled edge, as in Lab 02);
 * - 2 beveled edges, with 0 or 1 unbeveled edges on each side (a loop through);
 * - 3 beveled edges and 3 edges (a box corner): a rounded corner patch.
 *
 * Other vertices make the modifier do nothing and report it (FIDELITY? Blender
 * handles every case).
 */
import { DEG } from '../math/quat';
import { type Vec3, add, cross, dot, length, normalize, scale, sub, vec3 } from '../math/vec3';
import { faceNormal } from '../mesh/geometry';
import { type Face, type MeshData, edgeKey, smoothFrom } from '../mesh/mesh-data';
import { compact, looseVerts, rebuild, wireEdges } from '../mesh/ops/common';
import { MeshTopology } from '../mesh/topology';
import type { BevelModifier } from './types';

export interface BevelResult {
  readonly mesh: MeshData;
  /** Some vertex has a configuration the lab does not support: nothing was done. */
  readonly unsupported: boolean;
}

/** Edges the modifier bevels: edges between two faces, filtered by the Limit Method. */
export function bevelEdgeSet(m: MeshData, t: MeshTopology, mod: BevelModifier): Set<number> {
  const out = new Set<number>();
  m.edges.forEach((_, e) => {
    const faces = t.edgeFaces[e]!;
    if (faces.length !== 2) return;
    if (mod.limitMethod === 'ANGLE') {
      const c = dot(faceNormal(m, faces[0]!), faceNormal(m, faces[1]!));
      const angle = Math.acos(Math.max(-1, Math.min(1, c)));
      if (!(angle > mod.angleLimitDeg * DEG)) return;
    }
    out.add(e);
  });
  return out;
}

/**
 * Faces and edges around a vertex, clockwise seen from outside: `edges[i]` goes
 * to the vertex before v in `faces[i]` and `edges[i + 1]` to the one after it.
 */
interface Fan {
  readonly faces: number[];
  readonly edges: number[];
}

function buildFan(m: MeshData, t: MeshTopology, v: number): Fan | null {
  const vf = t.vertFaces[v]!;
  if (vf.length < 2 || t.vertEdges[v]!.length !== vf.length) return null;
  const after = new Map<number, { face: number; next: number }>();
  for (const f of vf) {
    const loop = m.faces[f]!;
    const i = loop.indexOf(v);
    if (i !== loop.lastIndexOf(v)) return null;
    const prev = t.findEdge(v, loop[(i + loop.length - 1) % loop.length]!);
    const next = t.findEdge(v, loop[(i + 1) % loop.length]!);
    if (prev === undefined || next === undefined || after.has(prev)) return null;
    after.set(prev, { face: f, next });
  }
  const faces: number[] = [];
  const edges: number[] = [];
  const start = after.keys().next().value!;
  let cur = start;
  do {
    const step = after.get(cur);
    if (!step) return null;
    edges.push(cur);
    faces.push(step.face);
    cur = step.next;
  } while (cur !== start && faces.length <= vf.length);
  return cur === start && faces.length === vf.length ? { faces, edges } : null;
}

/** Positions are v + width * dir; kept as unit-width directions until the width is clamped. */
interface Plan {
  readonly v: number;
  /** Unit-width displacement of every new boundary vertex of this vertex. */
  readonly points: Vec3[];
  /** Face -> run of point indices replacing v in that face's loop. */
  readonly runs: Map<number, number[]>;
  /** Beveled edge -> [right point, left point] (see strips below). */
  readonly ends: Map<number, readonly [number, number]>;
  /** How the profiles at this vertex are shaped. */
  readonly kind: 'terminal' | 'loop' | 'corner';
  /** For 'corner': point indices of the three sectors, counter-clockwise seen from outside. */
  readonly corner?: readonly [number, number, number];
  /** For 'terminal': the beveled edge's direction (the profile's middle is on it). */
  readonly edgeDir?: Vec3;
}

const sinBetween = (a: Vec3, b: Vec3) => length(cross(a, b));

function planVertex(m: MeshData, t: MeshTopology, v: number, beveled: Set<number>): Plan | null {
  const fan = buildFan(m, t, v);
  if (!fan) return null;
  const n = fan.edges.length;
  const first = fan.edges.findIndex((e) => beveled.has(e));
  // Rotate so that the fan starts at a beveled edge.
  const edges = [...fan.edges.slice(first), ...fan.edges.slice(0, first)];
  const faces = [...fan.faces.slice(first), ...fan.faces.slice(0, first)];
  const dir = (e: number) => normalize(sub(m.verts[t.otherVert(e, v)]!, m.verts[v]!));
  const bev = edges.map((e, i) => (beveled.has(e) ? i : -1)).filter((i) => i >= 0);
  const points: Vec3[] = [];
  const runs = new Map<number, number[]>();
  const ends = new Map<number, readonly [number, number]>();

  if (bev.length === 1) {
    // End of a beveled edge: edges e0 (beveled), e1, e2; faces f0 (e0-e1), f1 (e1-e2), f2 (e2-e0).
    if (n !== 3) return null;
    const d0 = dir(edges[0]!);
    const d1 = dir(edges[1]!);
    const d2 = dir(edges[2]!);
    const s1 = sinBetween(d0, d1);
    const s2 = sinBetween(d0, d2);
    if (s1 < 1e-6 || s2 < 1e-6) return null;
    points.push(scale(d1, 1 / s1), scale(d2, 1 / s2));
    runs.set(faces[0]!, [0]);
    runs.set(faces[1]!, [-1]); // the whole profile, filled in later
    runs.set(faces[2]!, [1]);
    ends.set(edges[0]!, [0, 1]);
    return { v, points, runs, ends, kind: 'terminal', edgeDir: d0 };
  }

  if (bev.length === 3 && n !== 3) return null;
  if (bev.length > 3) return null;
  // One point per sector (between consecutive beveled edges).
  const sectorPoint: number[] = [];
  for (let s = 0; s < bev.length; s++) {
    const a = bev[s]!;
    const b = s + 1 < bev.length ? bev[s + 1]! : bev[0]! + n;
    const k = b - a - 1;
    const da = dir(edges[a]!);
    const db = dir(edges[b % n]!);
    if (k === 0) {
      // Offset lines of both beveled edges meet at (d_a + d_b) / sin(angle).
      const sin = sinBetween(da, db);
      if (sin < 1e-6 || dot(cross(db, da), faceNormal(m, faces[a]!)) <= 0) return null; // reflex corner
      points.push(scale(add(da, db), 1 / sin));
      runs.set(faces[a]!, [points.length - 1]);
    } else if (k === 1) {
      const dm = dir(edges[a + 1]!);
      const sa = sinBetween(dm, da);
      const sb = sinBetween(dm, db);
      if (sa < 1e-6 || sb < 1e-6) return null;
      // FIDELITY? When the two sides disagree, the slide is their average.
      points.push(scale(dm, (1 / sa + 1 / sb) / 2));
      runs.set(faces[a]!, [points.length - 1]);
      runs.set(faces[(a + 1) % n]!, [points.length - 1]);
    } else {
      return null;
    }
    sectorPoint.push(points.length - 1);
  }
  // Beveled edge b_s: the sector after it is s, the sector before it is s - 1.
  bev.forEach((i, s) => {
    ends.set(edges[i]!, [sectorPoint[s]!, sectorPoint[(s + bev.length - 1) % bev.length]!]);
  });
  if (bev.length === 2) return { v, points, runs, ends, kind: 'loop' };
  return {
    v,
    points,
    runs,
    ends,
    kind: 'corner',
    // The fan goes clockwise: reversed to get counter-clockwise.
    corner: [sectorPoint[0]!, sectorPoint[2]!, sectorPoint[1]!],
  };
}

/**
 * Largest width that keeps new vertices from passing each other along an edge
 * (Clamp Overlap). FIDELITY? Blender's limit is computed per configuration.
 */
function clampLimit(m: MeshData, plans: Map<number, Plan>): number {
  let limit = Infinity;
  m.edges.forEach(([a, b]) => {
    const u = normalize(sub(m.verts[b]!, m.verts[a]!));
    const along = (v: number, dirToOther: Vec3) => {
      const p = plans.get(v);
      if (!p) return 0;
      return Math.max(0, ...p.points.map((d) => dot(d, dirToOther)));
    };
    const total = along(a, u) + along(b, scale(u, -1));
    if (total > 1e-9) limit = Math.min(limit, length(sub(m.verts[b]!, m.verts[a]!)) / total);
  });
  return limit;
}

/** Quarter-ellipse from p (θ = 0) to q (θ = 90°) around the corner `middle` (profile 0.5). */
function arc(p: Vec3, q: Vec3, middle: Vec3, segments: number): Vec3[] {
  const o = sub(add(p, q), middle);
  return Array.from({ length: segments + 1 }, (_, k) => {
    const th = ((k / segments) * Math.PI) / 2;
    return add(o, add(scale(sub(p, o), Math.cos(th)), scale(sub(q, o), Math.sin(th))));
  });
}

export function applyBevel(m: MeshData, mod: BevelModifier): BevelResult {
  const segments = Math.max(1, Math.floor(mod.segments));
  if (mod.width <= 0 || m.faces.length === 0) return { mesh: m, unsupported: false };
  const t = new MeshTopology(m);
  const beveled = bevelEdgeSet(m, t, mod);
  if (beveled.size === 0) return { mesh: m, unsupported: false };

  const plans = new Map<number, Plan>();
  for (let v = 0; v < m.verts.length; v++) {
    if (!t.vertEdges[v]!.some((e) => beveled.has(e))) continue;
    const plan = planVertex(m, t, v, beveled);
    if (!plan) return { mesh: m, unsupported: true };
    plans.set(v, plan);
  }
  const width = mod.useClampOverlap ? Math.min(mod.width, clampLimit(m, plans)) : mod.width;

  const verts = [...m.verts];
  const newVert = (p: Vec3) => verts.push(p) - 1;
  /** Vertex index of every plan point. */
  const pointVert = new Map<number, number[]>();
  for (const plan of plans.values()) {
    const pv = m.verts[plan.v]!;
    pointVert.set(plan.v, plan.points.map((d) => newVert(add(pv, scale(d, width)))));
  }
  /** Profile at a vertex for a beveled edge, from its right point to its left point. */
  const profiles = new Map<string, number[]>();
  const patches: Face[] = [];
  const patchFrom: number[] = [];

  for (const plan of plans.values()) {
    const pv = m.verts[plan.v]!;
    const ids = pointVert.get(plan.v)!;
    const pos = (i: number) => verts[ids[i]!]!;
    const inner = (pts: Vec3[], r: number, l: number) => [ids[r]!, ...pts.slice(1, -1).map(newVert), ids[l]!];
    if (plan.kind === 'terminal') {
      // The profile's corner is on the beveled edge's line.
      const [e, [r, l]] = [...plan.ends][0]!;
      const mid = scale(add(pos(r), pos(l)), 0.5);
      const middle = add(pv, scale(plan.edgeDir!, dot(sub(mid, pv), plan.edgeDir!)));
      profiles.set(`${plan.v}:${e}`, inner(arc(pos(r), pos(l), middle, segments), r, l));
    } else if (plan.kind === 'loop') {
      // Both edges share one profile, in opposite directions. FIDELITY? Corner at the vertex.
      const [[e0, [r, l]], [e1]] = [...plan.ends] as [[number, readonly [number, number]], [number, unknown]];
      const profile = inner(arc(pos(r), pos(l), pv, segments), r, l);
      profiles.set(`${plan.v}:${e0}`, profile);
      profiles.set(`${plan.v}:${e1}`, [...profile].reverse());
    } else {
      // Rounded box corner: the unit-cube corner patch mapped onto this corner
      // ((1,0,0), (0,1,0), (0,0,1) -> the three points; (1,1,1) -> the vertex).
      const [c0, c1, c2] = plan.corner!;
      const B = [pos(c0), pos(c1), pos(c2)];
      const origin = scale(sub(add(add(B[0]!, B[1]!), B[2]!), pv), 0.5);
      const cols = B.map((b) => sub(b, origin));
      const map = (c: Vec3) => add(origin, add(add(scale(cols[0]!, c.x), scale(cols[1]!, c.y)), scale(cols[2]!, c.z)));
      const grid = cornerPatch(segments, map, newVert, [ids[c0]!, ids[c1]!, ids[c2]!]);
      patches.push(...grid.faces);
      patchFrom.push(...grid.faces.map(() => t.vertFaces[plan.v]![0]!));
      // Arc i goes from corner point i to i + 1 (counter-clockwise). An edge's
      // right point is followed counter-clockwise by its left point, so its
      // profile (right -> left) is the arc that starts at its right point.
      for (const [e, [r]] of plan.ends) profiles.set(`${plan.v}:${e}`, grid.arcs[[c0, c1, c2].indexOf(r)]!);
    }
  }

  // Faces: every corner at a beveled vertex is replaced by its run.
  const faces: Face[] = m.faces.map((f, fi) =>
    f.flatMap((v) => {
      const plan = plans.get(v);
      if (!plan) return [v];
      const run = plan.runs.get(fi)!;
      if (run[0] === -1) return profiles.get(`${v}:${[...plan.ends.keys()][0]}`)!;
      return run.map((i) => pointVert.get(v)![i]!);
    }),
  );

  // Strips: for edge (v0, v1), the face going v0 -> v1 is on the left at v0
  // and on the right at v1, so P0[k] meets P1[segments - k].
  // New faces are shaded like a face next to them. FIDELITY? Which one when they differ.
  const strips: Face[] = [];
  const stripFrom: number[] = [];
  for (const e of beveled) {
    const [v0, v1] = m.edges[e]!;
    const p0 = profiles.get(`${v0}:${e}`)!;
    const p1 = profiles.get(`${v1}:${e}`)!;
    for (let k = 0; k < segments; k++) {
      strips.push([p0[k + 1]!, p0[k]!, p1[segments - k]!, p1[segments - k - 1]!]);
      stripFrom.push(t.edgeFaces[e]![0]!);
    }
  }

  const bevelledKeys = new Set([...beveled].map((e) => edgeKey(...m.edges[e]!)));
  const wires = wireEdges(m).filter(([a, b]) => !bevelledKeys.has(edgeKey(a, b)));
  const smooth = smoothFrom(m, [...m.faces.keys(), ...stripFrom, ...patchFrom]);
  const mesh = compact(rebuild(verts, [...faces, ...strips, ...patches], wires, smooth), looseVerts(m)).mesh;
  return { mesh, unsupported: false };
}

/**
 * Rounded corner patch of a unit cube corner (sphere octant), in Blender's
 * vertex mesh layout: around each of the three corner points a grid of quads;
 * with an odd number of segments, strips between the grids and a triangle in
 * the middle. Interior points are placed with a tangent mapping and pushed
 * onto the sphere. FIDELITY? Blender builds the interior by cubic subdivision
 * before snapping to the sphere: exact for 1 and 2 segments, to be checked
 * against Blender's output for more.
 *
 * Returns the faces and, for each i, the arc from corner point i to i + 1.
 */
function cornerPatch(
  ns: number,
  map: (c: Vec3) => Vec3,
  newVert: (p: Vec3) => number,
  corners: readonly [number, number, number],
): { faces: Face[]; arcs: number[][] } {
  const B = [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)];
  const tan = (j: number) => Math.tan(((j / ns) * Math.PI) / 2);
  const canon = (i: number, j: number, k: number) =>
    normalize(add(add(B[i]!, scale(B[(i + 1) % 3]!, tan(k))), scale(B[(i + 2) % 3]!, tan(j))));
  // Arcs first, so every region shares their vertices.
  const arcs: number[][] = [0, 1, 2].map((i) => [corners[i]!]);
  for (let i = 0; i < 3; i++) {
    for (let k = 1; k < ns; k++) arcs[i]!.push(newVert(map(canon(i, 0, k))));
    arcs[i]!.push(corners[(i + 1) % 3]!);
  }
  const m = Math.floor(ns / 2);
  const odd = ns % 2 === 1;
  // P(i, j, k): region around corner i; k goes along arc i, j back along arc i - 1.
  const P = new Map<string, number>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  let centre = -1;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j <= m; j++) {
      for (let k = 0; k <= m; k++) {
        let id: number;
        if (j === 0) id = arcs[i]![k]!;
        else if (k === 0) id = arcs[(i + 2) % 3]![ns - j]!;
        else if (!odd && j === m && k === m) id = centre >= 0 ? centre : (centre = newVert(map(canon(i, j, k))));
        else if (!odd && k === m) id = -1; // shared with the next region, filled below
        else id = newVert(map(canon(i, j, k)));
        P.set(key(i, j, k), id);
      }
    }
  }
  if (!odd) {
    // Column k = m of region i is row j = m of region i + 1: P(i, t, m) = P(i + 1, m, t).
    for (let i = 0; i < 3; i++) {
      for (let tt = 1; tt < m; tt++) P.set(key(i, tt, m), P.get(key((i + 1) % 3, m, tt))!);
    }
  }
  const at = (i: number, j: number, k: number) => P.get(key(i, j, k))!;
  const faces: Face[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < m; k++) faces.push([at(i, j, k), at(i, j, k + 1), at(i, j + 1, k + 1), at(i, j + 1, k)]);
    }
  }
  if (odd) {
    // Strip along the middle of arc i, between region i's column k = m and region i + 1's row j = m.
    for (let i = 0; i < 3; i++) {
      const n = (i + 1) % 3;
      for (let tt = 0; tt < m; tt++) faces.push([at(i, tt, m), at(n, m, tt), at(n, m, tt + 1), at(i, tt + 1, m)]);
    }
    faces.push([at(0, m, m), at(1, m, m), at(2, m, m)]);
  }
  return { faces, arcs };
}
