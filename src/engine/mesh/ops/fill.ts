/**
 * Fill / Make Edge-Face (F).
 * - Two selected vertices without an edge: a new edge.
 * - Selected edges forming one closed loop: a face along the loop.
 * - Three or more loose selected vertices: a face through them (ordered around their centre).
 * FIDELITY? Blender's rules for ambiguous selections; here anything else does nothing.
 */
import { type Vec3, add, cross, dot, length, normalize, scale, sub, vec3 } from '../../math/vec3';
import { type MeshData, faceEdgePairs } from '../mesh-data';
import { MeshTopology } from '../topology';
import { rebuild, wireEdges } from './common';

export interface FillResult {
  readonly mesh: MeshData;
  readonly created: 'edge' | 'face';
}

export function fill(
  m: MeshData,
  sel: { verts: readonly number[]; edges: readonly number[] },
): FillResult | null {
  const topo = new MeshTopology(m);
  if (sel.verts.length === 2 && sel.edges.length === 0) {
    const [a, b] = sel.verts as [number, number];
    if (topo.findEdge(a, b) !== undefined) return null;
    return { mesh: rebuild(m.verts, m.faces, [...wireEdges(m), [a, b]]), created: 'edge' };
  }
  if (sel.edges.length >= 3) {
    const loop = closedLoop(m, sel.edges);
    if (!loop) return null;
    // Orient against an existing face on the loop, so normals stay consistent.
    const existing = new Set<string>();
    for (const f of m.faces) for (const [a, b] of faceEdgePairs(f)) existing.add(`${a}>${b}`);
    const forwardTaken = loop.some((v, i) => existing.has(`${v}>${loop[(i + 1) % loop.length]}`));
    const face = forwardTaken ? [...loop].reverse() : loop;
    return { mesh: rebuild(m.verts, [...m.faces, face], wireEdges(m)), created: 'face' };
  }
  if (sel.verts.length >= 3 && sel.edges.length === 0) {
    const ordered = orderAroundCentre(m, sel.verts);
    return { mesh: rebuild(m.verts, [...m.faces, ordered], wireEdges(m)), created: 'face' };
  }
  return null;
}

/** The selected edges as one ordered closed loop of vertices, or null. */
function closedLoop(m: MeshData, edges: readonly number[]): number[] | null {
  const adj = new Map<number, number[]>();
  for (const e of edges) {
    const [a, b] = m.edges[e]!;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  if ([...adj.values()].some((n) => n.length !== 2)) return null;
  const start = edges.length ? m.edges[edges[0]!]![0] : -1;
  const loop = [start];
  let prev = start;
  let cur = adj.get(start)![0]!;
  while (cur !== start) {
    loop.push(cur);
    const next = adj.get(cur)!.find((n) => n !== prev)!;
    prev = cur;
    cur = next;
    if (loop.length > edges.length) return null;
  }
  return loop.length === edges.length ? loop : null;
}

function orderAroundCentre(m: MeshData, verts: readonly number[]): number[] {
  let c = vec3(0, 0, 0);
  for (const v of verts) c = add(c, m.verts[v]!);
  c = scale(c, 1 / verts.length);
  // Best-fit normal: Newell over the points in their given order is unreliable, so use
  // the largest cross product between spokes.
  let n = vec3(0, 0, 1);
  let best = 0;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const k = cross(sub(m.verts[verts[i]!]!, c), sub(m.verts[verts[j]!]!, c));
      if (length(k) > best) {
        best = length(k);
        n = normalize(k);
      }
    }
  }
  const u = normalize(sub(m.verts[verts[0]!]!, c));
  const w = cross(n, u);
  const angle = (p: Vec3) => Math.atan2(dot(sub(p, c), w), dot(sub(p, c), u));
  return [...verts].sort((a, b) => angle(m.verts[a]!) - angle(m.verts[b]!));
}
