/**
 * Merge (M): At Center, Collapse and By Distance. At Cursor is disabled in this lab.
 */
import { type Vec3, add, length, scale, sub, vec3 } from '../../math/vec3';
import type { MeshData } from '../mesh-data';
import { MeshTopology } from '../topology';
import { remapVerts } from './common';

export type MergeType = 'center' | 'collapse' | 'distance';

/** Default Merge Distance in Blender. */
export const MERGE_DISTANCE = 0.0001;

function median(m: MeshData, verts: readonly number[]): Vec3 {
  let c = vec3(0, 0, 0);
  for (const v of verts) c = add(c, m.verts[v]!);
  return scale(c, 1 / verts.length);
}

/** Moves each group onto one vertex placed at `position(group)` and remaps. */
function mergeGroups(
  m: MeshData,
  groups: readonly (readonly number[])[],
  position: (g: readonly number[]) => Vec3,
): { mesh: MeshData; removed: number; kept: number[] } {
  const target = m.verts.map((_, i) => i);
  const verts = [...m.verts];
  let removed = 0;
  const keptOld: number[] = [];
  for (const g of groups) {
    if (g.length === 0) continue;
    const keep = g[0]!;
    verts[keep] = position(g);
    for (const v of g.slice(1)) target[v] = keep;
    removed += g.length - 1;
    keptOld.push(keep);
  }
  const { mesh, map } = remapVerts({ ...m, verts }, target);
  return { mesh, removed, kept: keptOld.map((v) => map[v]!).filter((v) => v >= 0) };
}

export interface MergeResult {
  readonly mesh: MeshData;
  /** Vertices removed (Blender reports "Removed N vertex(es)"). */
  readonly removed: number;
  /** Surviving merged vertices, to keep selected. */
  readonly selectVerts: readonly number[];
}

export function merge(m: MeshData, selected: readonly number[], type: MergeType, distance = MERGE_DISTANCE): MergeResult {
  if (selected.length === 0) return { mesh: m, removed: 0, selectVerts: [] };
  let groups: number[][];
  if (type === 'center') {
    groups = [[...selected]];
  } else if (type === 'collapse') {
    // Each island of selected vertices connected by edges collapses to its centre.
    const topo = new MeshTopology(m);
    const sel = new Set(selected);
    const seen = new Set<number>();
    groups = [];
    for (const v of selected) {
      if (seen.has(v)) continue;
      const group: number[] = [];
      const stack = [v];
      seen.add(v);
      while (stack.length) {
        const x = stack.pop()!;
        group.push(x);
        for (const n of topo.vertNeighbours(x)) {
          if (sel.has(n) && !seen.has(n)) {
            seen.add(n);
            stack.push(n);
          }
        }
      }
      groups.push(group);
    }
  } else {
    // By Distance: greedy clusters within the distance; the first vertex stays in place.
    const left = [...selected];
    groups = [];
    const taken = new Set<number>();
    for (const v of left) {
      if (taken.has(v)) continue;
      const g = [v];
      taken.add(v);
      for (const w of left) {
        if (!taken.has(w) && length(sub(m.verts[v]!, m.verts[w]!)) <= distance) {
          g.push(w);
          taken.add(w);
        }
      }
      groups.push(g);
    }
  }
  const r = mergeGroups(m, groups, (g) => (type === 'distance' ? m.verts[g[0]!]! : median(m, g)));
  return { mesh: r.mesh, removed: r.removed, selectVerts: r.kept };
}
