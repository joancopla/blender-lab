/**
 * Face geometry: normals (Newell's method, robust for non-planar n-gons),
 * centres, areas and triangulation for drawing (ear clipping).
 */
import { type Vec3, add, cross, dot, length, normalize, scale, sub, vec3 } from '../math/vec3';
import type { Face, MeshData } from './mesh-data';

/** Unnormalised Newell normal: its length is twice the polygon's area. */
function newell(verts: readonly Vec3[], face: Face): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < face.length; i++) {
    const a = verts[face[i]!]!;
    const b = verts[face[(i + 1) % face.length]!]!;
    x += (a.y - b.y) * (a.z + b.z);
    y += (a.z - b.z) * (a.x + b.x);
    z += (a.x - b.x) * (a.y + b.y);
  }
  return vec3(x, y, z);
}

/** Unit normal (right-hand rule on the vertex order); zero for degenerate faces. */
export function faceNormal(m: MeshData, f: number): Vec3 {
  return normalize(newell(m.verts, m.faces[f]!));
}

export function faceArea(m: MeshData, f: number): number {
  return length(newell(m.verts, m.faces[f]!)) / 2;
}

/** Average of the face's vertices (Blender's "median" face centre). */
export function faceCenter(m: MeshData, f: number): Vec3 {
  const face = m.faces[f]!;
  let c = vec3(0, 0, 0);
  for (const v of face) c = add(c, m.verts[v]!);
  return scale(c, 1 / face.length);
}

/**
 * Triangulates one face into triples of vertex indices with the same winding.
 * Ear clipping on the face projected onto its plane, so concave n-gons work.
 * Falls back to a fan if the polygon is self-intersecting.
 */
export function triangulateFace(m: MeshData, f: number): [number, number, number][] {
  const face = m.faces[f]!;
  if (face.length < 3) return [];
  if (face.length === 3) return [[face[0]!, face[1]!, face[2]!]];

  const n = newell(m.verts, face);
  // 2D basis on the face plane, oriented so the polygon is counter-clockwise.
  const normal = normalize(n);
  const ref = Math.abs(normal.x) < 0.9 ? vec3(1, 0, 0) : vec3(0, 1, 0);
  const u = normalize(cross(ref, normal));
  const w = cross(normal, u);
  const pts = face.map((v) => ({ v, x: dot(m.verts[v]!, u), y: dot(m.verts[v]!, w) }));

  const area2 = (a: (typeof pts)[0], b: (typeof pts)[0], c: (typeof pts)[0]) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const inside = (p: (typeof pts)[0], a: (typeof pts)[0], b: (typeof pts)[0], c: (typeof pts)[0]) =>
    area2(a, b, p) >= 0 && area2(b, c, p) >= 0 && area2(c, a, p) >= 0;

  const ring = [...pts];
  const tris: [number, number, number][] = [];
  let guard = ring.length * ring.length;
  while (ring.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[(i + ring.length - 1) % ring.length]!;
      const b = ring[i]!;
      const c = ring[(i + 1) % ring.length]!;
      if (area2(a, b, c) <= 1e-12) continue; // reflex or flat corner
      if (ring.some((p) => p !== a && p !== b && p !== c && inside(p, a, b, c))) continue;
      tris.push([a.v, b.v, c.v]);
      ring.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (ring.length === 3) {
    tris.push([ring[0]!.v, ring[1]!.v, ring[2]!.v]);
    return tris;
  }
  // Degenerate or self-intersecting: fan over what is left.
  for (let i = 1; i < ring.length - 1; i++) tris.push([ring[0]!.v, ring[i]!.v, ring[i + 1]!.v]);
  return tris;
}

/** Distance between two vertices. */
export const vertDistance = (m: MeshData, a: number, b: number): number => length(sub(m.verts[a]!, m.verts[b]!));
