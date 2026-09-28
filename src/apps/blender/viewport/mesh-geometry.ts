/**
 * MeshData -> three.js geometry, for drawing only. Faces are triangulated here
 * and nowhere else. Normals come from mesh/normals.ts (flat or smooth per face).
 * The geometry stays in Blender local coordinates (see coords.ts).
 */
import * as THREE from 'three';
import { triangulateFace } from '../mesh/geometry';
import type { MeshData } from '../mesh/mesh-data';
import { cornerNormals } from '../mesh/normals';

export interface MeshGeometry {
  readonly geometry: THREE.BufferGeometry;
  /** Face index of each triangle, to map picks back to faces. */
  readonly triangleFace: Int32Array;
}

export function meshToGeometry(m: MeshData): MeshGeometry {
  const corner = cornerNormals(m);
  const tris = m.faces.map((_, f) => ({ f, tris: triangulateFace(m, f) }));
  const count = tris.reduce((n, t) => n + t.tris.length, 0);
  const positions = new Float32Array(count * 9);
  const normals = new Float32Array(count * 9);
  const triangleFace = new Int32Array(count);
  let t = 0;
  for (const { f, tris: list } of tris) {
    const face = m.faces[f]!;
    for (const tri of list) {
      for (let k = 0; k < 3; k++) {
        const p = m.verts[tri[k]!]!;
        const n = corner[f]![face.indexOf(tri[k]!)]!;
        const o = t * 9 + k * 3;
        positions[o] = p.x;
        positions[o + 1] = p.y;
        positions[o + 2] = p.z;
        normals[o] = n.x;
        normals[o + 1] = n.y;
        normals[o + 2] = n.z;
      }
      triangleFace[t] = f;
      t++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return { geometry, triangleFace };
}
