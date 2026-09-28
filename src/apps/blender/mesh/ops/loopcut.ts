/**
 * Loop Cut (Ctrl+R): cuts across the edge ring of an edge. Every ring edge is
 * split into `cuts + 1` parts and the quads of the ring are divided accordingly;
 * faces at the ends of an open ring (n-gons, triangles) just get the new
 * vertices in their outline.
 * `factor` slides the cuts along the ring edges (-1..1), as Edge Slide does
 * right after the cut.
 * FIDELITY? With several cuts, sliding moves them together keeping their spacing.
 */
import { type Vec3, lerp } from '../../math/vec3';
import { type Face, type MeshData, edgeKey, faceEdgePairs, smoothFrom } from '../mesh-data';
import { MeshTopology } from '../topology';
import { rebuild, wireEdges } from './common';

export interface LoopCutResult {
  readonly mesh: MeshData;
  /** The new edge loops (to select them afterwards, as Blender does). */
  readonly newEdges: readonly number[];
}

export interface RingEdge {
  /** Edge index in the original mesh. */
  readonly edge: number;
  /** Vertex the cut parameter is measured from, consistent along the ring. */
  readonly start: number;
  readonly end: number;
}

/** The edge ring through `edge`, with consistent orientation. */
export function orientedRing(m: MeshData, edge: number): RingEdge[] {
  const t = new MeshTopology(m);
  const [a0, b0] = m.edges[edge]!;
  const ring = new Map<number, RingEdge>([[edge, { edge, start: a0, end: b0 }]]);
  const queue = [edge];
  while (queue.length) {
    const e = queue.shift()!;
    const { start, end } = ring.get(e)!;
    for (const f of t.edgeFaces[e]!) {
      const face = m.faces[f]!;
      if (face.length !== 4) continue;
      const i = face.indexOf(start);
      const j = face.indexOf(end);
      // The vertex next to `start` that is not `end` (through a side edge), same for `end`.
      const next = (k: number, other: number) => (face[(k + 1) % 4] === other ? face[(k + 3) % 4]! : face[(k + 1) % 4]!);
      const s2 = next(i, end);
      const e2 = next(j, start);
      const opp = t.findEdge(s2, e2);
      if (opp === undefined || ring.has(opp)) continue;
      ring.set(opp, { edge: opp, start: s2, end: e2 });
      queue.push(opp);
    }
  }
  return [...ring.values()];
}

/** Cut parameters along an edge (0 at its start, 1 at its end). */
export function cutParameters(cuts: number, factor: number): number[] {
  const step = 1 / (cuts + 1);
  const shift = Math.max(-1, Math.min(1, factor)) * step * (cuts === 1 ? 1 : 0.999);
  return Array.from({ length: cuts }, (_, i) => (i + 1) * step + shift);
}

/** Positions of the cut points on every ring edge (for the yellow preview). */
export function loopCutPreview(m: MeshData, edge: number, cuts: number): [Vec3, Vec3][] {
  const ring = orientedRing(m, edge);
  const t = new MeshTopology(m);
  const pts = new Map<number, Vec3[]>();
  for (const r of ring) pts.set(r.edge, cutParameters(cuts, 0).map((p) => lerp(m.verts[r.start]!, m.verts[r.end]!, p)));
  const lines: [Vec3, Vec3][] = [];
  const seen = new Set<string>();
  for (const r of ring) {
    for (const f of t.edgeFaces[r.edge]!) {
      const other = ring.find((x) => x.edge !== r.edge && t.faceEdges[f]!.includes(x.edge));
      if (!other) continue;
      const key = [r.edge, other.edge].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      pts.get(r.edge)!.forEach((p, i) => lines.push([p, pts.get(other.edge)![i]!]));
    }
  }
  return lines;
}

export function loopCut(m: MeshData, edge: number, cuts: number, factor = 0): LoopCutResult {
  const ring = orientedRing(m, edge);
  const byEdge = new Map(ring.map((r) => [edgeKey(r.start, r.end), r]));
  const params = cutParameters(cuts, factor);
  const verts = [...m.verts];
  const cutVerts = new Map<string, number[]>(); // from the ring start
  for (const r of ring) {
    const list = params.map((p) => {
      verts.push(lerp(m.verts[r.start]!, m.verts[r.end]!, p));
      return verts.length - 1;
    });
    cutVerts.set(edgeKey(r.start, r.end), list);
  }
  /** Cut vertices along the directed edge x -> y. */
  const along = (x: number, y: number) => {
    const r = byEdge.get(edgeKey(x, y))!;
    const list = cutVerts.get(edgeKey(x, y))!;
    return r.start === x ? list : [...list].reverse();
  };

  const faces: Face[] = [];
  const sources: number[] = []; // the face each new face comes from
  const newLoopPairs: [number, number][] = [];
  m.faces.forEach((face, fi) => {
    const ringSides = faceEdgePairs(face)
      .map(([x, y], i) => ({ x, y, i }))
      .filter(({ x, y }) => byEdge.has(edgeKey(x, y)));
    if (face.length === 4 && ringSides.length === 2 && (ringSides[1]!.i - ringSides[0]!.i) % 2 === 0) {
      // Rotate so the ring edges are v0->v1 and v2->v3.
      const k = ringSides[0]!.i;
      const [v0, v1, v2, v3] = [0, 1, 2, 3].map((d) => face[(k + d) % 4]!) as [number, number, number, number];
      const A = [v0, ...along(v0, v1), v1];
      const C = [v3, ...along(v3, v2), v2];
      for (let i = 0; i <= cuts; i++) {
        faces.push([A[i]!, A[i + 1]!, C[i + 1]!, C[i]!]);
        sources.push(fi);
      }
      for (let i = 1; i <= cuts; i++) newLoopPairs.push([A[i]!, C[i]!]);
    } else if (ringSides.length > 0) {
      // Not a ring quad: insert the cut vertices into the outline.
      const out: number[] = [];
      faceEdgePairs(face).forEach(([x, y]) => {
        out.push(x);
        if (byEdge.has(edgeKey(x, y))) out.push(...along(x, y));
      });
      faces.push(out);
      sources.push(fi);
    } else {
      faces.push(face);
      sources.push(fi);
    }
  });
  // Wire edges on the ring are split too.
  const wires = wireEdges(m).flatMap(([x, y]) => {
    if (!byEdge.has(edgeKey(x, y))) return [[x, y] as const];
    const chain = [x, ...along(x, y), y];
    return chain.slice(1).map((v, i) => [chain[i]!, v] as const);
  });
  const mesh = rebuild(verts, faces, wires, smoothFrom(m, sources));
  const t = new MeshTopology(mesh);
  const newEdges = newLoopPairs.map(([a, b]) => t.findEdge(a, b)!).filter((e) => e !== undefined);
  return { mesh, newEdges };
}
