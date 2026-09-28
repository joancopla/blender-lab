/**
 * Shared shapes of the Blender labs: the course's stool and boxes split by
 * given coordinates.
 */
import { type Vec3, add, vec3 } from '../../apps/blender/math/vec3';
import { type MeshData, meshFromFaces } from '../../apps/blender/mesh/mesh-data';
import { extrudeRegion } from '../../apps/blender/mesh/ops/extrude';
import { loopCut } from '../../apps/blender/mesh/ops/loopcut';
import { faceCenter, faceNormal } from '../../apps/blender/mesh/geometry';

/**
 * A box whose faces are split by the given coordinates along each axis (sorted,
 * first and last are the sides). Quads facing outwards, shared vertices.
 */
export function gridBox(xs: readonly number[], ys: readonly number[], zs: readonly number[]): MeshData {
  const verts: Vec3[] = [];
  const index = new Map<string, number>();
  const at = (p: Vec3) => {
    const k = `${p.x},${p.y},${p.z}`;
    let i = index.get(k);
    if (i === undefined) {
      i = verts.length;
      verts.push(p);
      index.set(k, i);
    }
    return i;
  };
  const axes = [xs, ys, zs];
  const faces: number[][] = [];
  for (let a = 0; a < 3; a++) {
    // u x v = a (cyclic axes), so this order faces +a.
    const u = (a + 1) % 3;
    const v = (a + 2) % 3;
    for (const side of [0, 1]) {
      const coord = side ? axes[a]!.at(-1)! : axes[a]![0]!;
      const point = (i: number, j: number) => {
        const c = [0, 0, 0];
        c[a] = coord;
        c[u] = axes[u]![i]!;
        c[v] = axes[v]![j]!;
        return at(vec3(c[0]!, c[1]!, c[2]!));
      };
      for (let i = 0; i < axes[u]!.length - 1; i++) {
        for (let j = 0; j < axes[v]!.length - 1; j++) {
          const quad = [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)];
          faces.push(side ? quad : quad.reverse());
        }
      }
    }
  }
  return meshFromFaces(verts, faces);
}

function facesWhere(m: MeshData, n: Vec3, where: (c: Vec3) => boolean): number[] {
  return m.faces
    .map((_, f) => f)
    .filter((f) => {
      const k = faceNormal(m, f);
      return k.x * n.x + k.y * n.y + k.z * n.z > 0.99 && where(faceCenter(m, f));
    });
}

/** The Lab 02 stool: a 2 x 2 x 0.4 seat on four legs, 1.6 m long. */
export function stool(): MeshData {
  const cube = gridBox([-1, 1], [-1, 1], [-1, 1]);
  let m: MeshData = { ...cube, verts: cube.verts.map((p) => vec3(p.x, p.y, p.z * 0.2)) };
  const alongX = m.edges.findIndex(([a, b]) => m.verts[a]!.y === m.verts[b]!.y && m.verts[a]!.z === m.verts[b]!.z);
  m = loopCut(m, alongX, 2).mesh;
  const alongY = m.edges.findIndex(
    ([a, b]) => m.verts[a]!.x === m.verts[b]!.x && m.verts[a]!.z === m.verts[b]!.z && Math.abs(m.verts[a]!.x) === 1,
  );
  m = loopCut(m, alongY, 2).mesh;
  const corners = facesWhere(m, vec3(0, 0, -1), (c) => Math.abs(c.x) > 0.5 && Math.abs(c.y) > 0.5);
  const r = extrudeRegion(m, corners);
  const legVerts = new Set(corners.flatMap((f) => [...r.mesh.faces[f]!]));
  return { ...r.mesh, verts: r.mesh.verts.map((p, i) => (legVerts.has(i) ? add(p, vec3(0, 0, -1.6)) : p)) };
}
