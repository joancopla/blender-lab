/**
 * Cuts a mesh with a plane and removes what lies on one side, like
 * BM_mesh_bisect_plane followed by killing the vertices across the plane
 * (what the Mirror modifier's Bisect does).
 */
import { type Vec3, dot, lerp, scale, sub } from '../math/vec3';
import { type Face, type MeshData, edgeKey } from '../mesh/mesh-data';
import { compact, looseVerts, rebuild, wireEdges } from '../mesh/ops/common';

/**
 * Keeps the part of the mesh on the side opposite to `killNormal` (unit).
 * Vertices closer to the plane than `eps` are snapped onto it.
 *
 * FIDELITY? A concave n-gon crossed by the plane more than twice is clipped
 * into one polygon here; Blender splits it into several faces.
 */
export function bisectMesh(m: MeshData, point: Vec3, killNormal: Vec3, eps: number): MeshData {
  const verts = [...m.verts];
  const d = m.verts.map((v, i) => {
    const dist = dot(sub(v, point), killNormal);
    if (Math.abs(dist) < eps) {
      verts[i] = sub(v, scale(killNormal, dist));
      return 0;
    }
    return dist;
  });
  if (d.every((x) => x <= 0)) return m;

  const cuts = new Map<string, number>();
  const cutVert = (a: number, b: number): number => {
    const k = edgeKey(a, b);
    let i = cuts.get(k);
    if (i === undefined) {
      const t = d[a]! / (d[a]! - d[b]!);
      i = verts.length;
      verts.push(lerp(verts[a]!, verts[b]!, t));
      cuts.set(k, i);
    }
    return i;
  };
  const crosses = (a: number, b: number) => (d[a]! < 0 && d[b]! > 0) || (d[a]! > 0 && d[b]! < 0);

  const faces: Face[] = [];
  for (const f of m.faces) {
    if (f.every((v) => d[v]! <= 0)) {
      faces.push(f);
      continue;
    }
    const out: number[] = [];
    f.forEach((v, i) => {
      const next = f[(i + 1) % f.length]!;
      if (d[v]! <= 0) out.push(v);
      if (crosses(v, next)) out.push(cutVert(v, next));
    });
    if (out.length >= 3) faces.push(out);
  }

  const wires: [number, number][] = [];
  for (const [a, b] of wireEdges(m)) {
    if (d[a]! <= 0 && d[b]! <= 0) wires.push([a, b]);
    else if (crosses(a, b)) wires.push(d[a]! < 0 ? [a, cutVert(a, b)] : [cutVert(a, b), b]);
  }
  const keep = new Set([...looseVerts(m)].filter((v) => d[v]! <= 0));
  return compact(rebuild(verts, faces, wires), keep).mesh;
}

