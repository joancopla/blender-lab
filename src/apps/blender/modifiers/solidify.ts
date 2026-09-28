/**
 * Solidify modifier, Simple mode (after Blender's MOD_solidify_extrude): the
 * surface is copied twice along the vertex normals and, with Fill Rim, the
 * open borders are closed with quads.
 *
 * - Offsets along the normal: the first copy at -(1 - offset) / 2 * thickness,
 *   the second at (1 + offset) / 2 * thickness. Offset -1 (the default) keeps
 *   the second copy on the original surface and grows the shell behind it.
 * - The copy further along the normals is the outside and keeps the face
 *   order; the other one is flipped, so the shell's normals point out.
 * - Even Thickness: each vertex moves further where its faces are tilted
 *   against its normal (1 / cos of the angle, averaged over the corners by
 *   their angles), so the walls keep the thickness.
 * - Rim faces are shaded like the face of their border edge.
 *
 * Vertex order: first copy, second copy. Faces: first copy, second copy, rim.
 * FIDELITY? Element order compared with Blender (visible after Apply).
 */
import { type Vec3, add, dot, scale } from '../math/vec3';
import { faceNormal } from '../mesh/geometry';
import { type Face, type MeshData, smoothFrom } from '../mesh/mesh-data';
import { cornerAngle, vertexNormals } from '../mesh/normals';
import { rebuild, wireEdges } from '../mesh/ops/common';
import { MeshTopology } from '../mesh/topology';
import type { SolidifyModifier } from './types';

/** Even Thickness factor of every vertex. */
function evenFactors(m: MeshData, normals: readonly Vec3[]): number[] {
  const sum = m.verts.map(() => 0);
  const weight = m.verts.map(() => 0);
  m.faces.forEach((face, f) => {
    const n = faceNormal(m, f);
    face.forEach((v, i) => {
      const angle = cornerAngle(m, face, i);
      const cos = Math.abs(dot(n, normals[v]!));
      sum[v]! += angle * (cos < 1e-6 ? 1 : 1 / cos);
      weight[v]! += angle;
    });
  });
  return sum.map((s, v) => (weight[v]! > 0 ? s / weight[v]! : 1));
}

const flip = (f: Face): Face => [f[0]!, ...f.slice(1).reverse()];

export function applySolidify(m: MeshData, mod: SolidifyModifier): MeshData {
  if (m.faces.length === 0) return m;
  const normals = vertexNormals(m);
  const even = mod.useEvenOffset ? evenFactors(m, normals) : null;
  const ofsFirst = -((1 - mod.offset) / 2) * mod.thickness;
  const ofsSecond = mod.thickness + ofsFirst;
  const n = m.verts.length;
  const moved = (ofs: number) => m.verts.map((p, v) => add(p, scale(normals[v]!, ofs * (even ? even[v]! : 1))));
  const verts = [...moved(ofsFirst), ...moved(ofsSecond)];

  // The second copy is the outside when it is further along the normals.
  const secondOutside = ofsSecond >= ofsFirst;
  const first = m.faces.map((f) => (secondOutside ? flip(f) : f));
  const second = m.faces.map((f) => {
    const shifted = f.map((v) => v + n);
    return secondOutside ? shifted : flip(shifted);
  });
  const faces: Face[] = [...first, ...second];
  const sources = [...m.faces.keys(), ...m.faces.keys()];

  if (mod.useRim) {
    const t = new MeshTopology(m);
    const [outer, inner] = secondOutside ? [n, 0] : [0, n];
    t.edgeFaces.forEach((fs, e) => {
      if (fs.length !== 1) return;
      const face = m.faces[fs[0]!]!;
      const [x, y] = m.edges[e]!;
      // The border edge as its face goes through it: a -> b.
      const [a, b] = face[(face.indexOf(x) + 1) % face.length] === y ? [x, y] : [y, x];
      faces.push([b + outer, a + outer, a + inner, b + inner]);
      sources.push(fs[0]!);
    });
  }

  const wires = wireEdges(m);
  const allWires = [...wires, ...wires.map(([a, b]) => [a + n, b + n] as const)];
  return rebuild(verts, faces, allWires, smoothFrom(m, sources));
}
