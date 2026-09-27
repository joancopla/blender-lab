/**
 * Array modifier (Fit Type: Fixed Count), after Blender's MOD_array: copies of
 * the input one after another, each moved by the offset from the previous one.
 * The relative offset is measured on the input mesh's bounding box.
 */
import { type Vec3, add, length, scale, sub, vec3 } from '../math/vec3';
import type { Face, MeshData } from '../mesh/mesh-data';
import { rebuild, remapVerts, wireEdges } from '../mesh/ops/common';
import type { ArrayModifier } from './types';

/** Offset between consecutive copies, in object local space. */
export function arrayOffset(m: MeshData, mod: ArrayModifier): Vec3 {
  let offset = vec3(0, 0, 0);
  if (mod.useRelativeOffset && m.verts.length > 0) {
    let lo = vec3(Infinity, Infinity, Infinity);
    let hi = vec3(-Infinity, -Infinity, -Infinity);
    for (const v of m.verts) {
      lo = vec3(Math.min(lo.x, v.x), Math.min(lo.y, v.y), Math.min(lo.z, v.z));
      hi = vec3(Math.max(hi.x, v.x), Math.max(hi.y, v.y), Math.max(hi.z, v.z));
    }
    const size = sub(hi, lo);
    const r = mod.relativeOffsetDisplace;
    offset = add(offset, vec3(r.x * size.x, r.y * size.y, r.z * size.z));
  }
  if (mod.useConstantOffset) offset = add(offset, mod.constantOffsetDisplace);
  return offset;
}

export function applyArray(m: MeshData, mod: ArrayModifier): MeshData {
  const count = Math.max(1, Math.floor(mod.count));
  if (count === 1) return m;
  const offset = arrayOffset(m, mod);
  const n = m.verts.length;

  const verts: Vec3[] = [];
  const faces: Face[] = [];
  const wires: (readonly [number, number])[] = [];
  const srcWires = wireEdges(m);
  for (let c = 0; c < count; c++) {
    const shift = scale(offset, c);
    const base = c * n;
    for (const v of m.verts) verts.push(add(v, shift));
    for (const f of m.faces) faces.push(f.map((v) => v + base));
    for (const [a, b] of srcWires) wires.push([a + base, b + base]);
  }
  const joined = rebuild(verts, faces, wires);
  if (!mod.useMergeVertices) return joined;

  // Each copy merges into the previous one (and the last into the first with
  // First Last); merged vertices keep the earlier copy's position.
  const target = verts.map((_, i) => i);
  const root = (i: number): number => {
    while (target[i] !== i) i = target[i]!;
    return i;
  };
  const mapChunk = (from: number, into: number) => {
    const near = nearestWithin(verts, into * n, n, mod.mergeThreshold);
    for (let i = 0; i < n; i++) {
      const v = from * n + i;
      const t = near(verts[v]!);
      if (t >= 0 && root(t) !== root(v)) target[v] = root(t);
    }
  };
  for (let c = 1; c < count; c++) mapChunk(c, c - 1);
  if (mod.useMergeVerticesCap) mapChunk(count - 1, 0);
  for (let i = 0; i < target.length; i++) target[i] = root(i);
  return remapVerts(joined, target).mesh;
}

/**
 * Finder for the nearest of `verts[start .. start + n)` closer than `dist` to a
 * point (-1 if none), over a uniform grid.
 */
function nearestWithin(verts: readonly Vec3[], start: number, n: number, dist: number): (p: Vec3) => number {
  const cell = Math.max(dist, 1e-6);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const grid = new Map<string, number[]>();
  for (let i = start; i < start + n; i++) {
    const v = verts[i]!;
    const k = key(Math.floor(v.x / cell), Math.floor(v.y / cell), Math.floor(v.z / cell));
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  return (p) => {
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    const cz = Math.floor(p.z / cell);
    let best = -1;
    let bestD = dist;
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (let z = cz - 1; z <= cz + 1; z++) {
          for (const i of grid.get(key(x, y, z)) ?? []) {
            const d = length(sub(verts[i]!, p));
            if (d <= bestD) {
              bestD = d;
              best = i;
            }
          }
        }
      }
    }
    return best;
  };
}
