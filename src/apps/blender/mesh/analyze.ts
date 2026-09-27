/**
 * Topology analyser (a lab tool, not part of Blender): n-gons, triangles,
 * duplicated vertices, non-manifold edges and flipped faces.
 */
import { cross, dot, length, sub } from '../math/vec3';
import { triangulateFace } from './geometry';
import type { MeshData } from './mesh-data';
import { MeshTopology } from './topology';

export interface TopologyReport {
  readonly ngons: readonly number[];
  readonly triangles: readonly number[];
  /** Groups of vertices closer than the threshold (Merge by Distance would join them). */
  readonly duplicates: readonly (readonly number[])[];
  readonly nonManifoldEdges: readonly number[];
  /** Faces whose normal points the wrong way (Recalculate Normals would fix them). */
  readonly flippedFaces: readonly number[];
}

/** Same default as Merge by Distance. */
export const DUPLICATE_THRESHOLD = 0.0001;

export function analyzeMesh(m: MeshData, threshold = DUPLICATE_THRESHOLD): TopologyReport {
  const t = new MeshTopology(m);
  const ngons = m.faces.map((f, i) => ({ f, i })).filter(({ f }) => f.length > 4).map(({ i }) => i);
  const triangles = m.faces.map((f, i) => ({ f, i })).filter(({ f }) => f.length === 3).map(({ i }) => i);

  const duplicates: number[][] = [];
  const taken = new Set<number>();
  for (let a = 0; a < m.verts.length; a++) {
    if (taken.has(a)) continue;
    const group = [a];
    for (let b = a + 1; b < m.verts.length; b++) {
      if (!taken.has(b) && length(sub(m.verts[a]!, m.verts[b]!)) <= threshold) {
        group.push(b);
        taken.add(b);
      }
    }
    if (group.length > 1) duplicates.push(group);
  }

  return { ngons, triangles, duplicates, nonManifoldEdges: t.nonManifoldEdges(), flippedFaces: flippedFaces(m, t) };
}

/**
 * Faces pointing against their neighbours: orientation is propagated across
 * manifold edges from a seed in each connected part; the minority is flipped.
 * A closed part whose majority points inwards (negative volume) is all flipped.
 */
function flippedFaces(m: MeshData, t: MeshTopology): number[] {
  const parity = new Array<number>(m.faces.length).fill(0); // 0 unknown, 1 same as seed, -1 flipped
  const out: number[] = [];
  const direction = (f: number, a: number, b: number) => {
    const face = m.faces[f]!;
    const i = face.indexOf(a);
    return face[(i + 1) % face.length] === b ? 1 : -1;
  };
  for (let seed = 0; seed < m.faces.length; seed++) {
    if (parity[seed] !== 0) continue;
    parity[seed] = 1;
    const part = [seed];
    const stack = [seed];
    while (stack.length) {
      const f = stack.pop()!;
      for (const e of t.faceEdges[f]!) {
        if (e < 0 || t.edgeFaces[e]!.length !== 2) continue;
        const g = t.edgeFaces[e]!.find((x) => x !== f)!;
        if (parity[g] !== 0) continue;
        const [a, b] = m.edges[e]!;
        // Consistent neighbours go through the shared edge in opposite directions.
        const same = direction(f, a, b) !== direction(g, a, b);
        parity[g] = same ? parity[f]! : -parity[f]!;
        part.push(g);
        stack.push(g);
      }
    }
    const plus = part.filter((f) => parity[f] === 1);
    const minus = part.filter((f) => parity[f] === -1);
    let [majority, minority] = plus.length >= minus.length ? [plus, minus] : [minus, plus];
    const closed = part.every((f) => t.faceEdges[f]!.every((e) => e >= 0 && t.edgeFaces[e]!.length === 2));
    if (closed) {
      // Signed volume with the majority orientation: negative means inside out.
      const sign = majority === plus ? 1 : -1;
      let volume = 0;
      for (const f of part) {
        for (const [a, b, c] of triangulateFace(m, f)) {
          const v = dot(m.verts[a]!, cross(m.verts[b]!, m.verts[c]!)) / 6;
          volume += (parity[f] === sign ? 1 : -1) * v;
        }
      }
      if (volume < 0) [majority, minority] = [minority, majority];
    }
    out.push(...minority);
  }
  return out.sort((a, b) => a - b);
}
