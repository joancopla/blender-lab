/**
 * MeshData -> three.js geometry, for drawing only. Faces are triangulated here
 * and nowhere else. Normals come from mesh/normals.ts (flat or smooth per face).
 * The geometry stays in Blender local coordinates (see coords.ts).
 */
import * as THREE from 'three';
import { triangulateFace } from '../mesh/geometry';
import type { MeshData } from '../mesh/mesh-data';
import { cornerNormals } from '../mesh/normals';
import type { Vec3 } from '../math/vec3';

/** A box in object space: the texture space of Generated coordinates. */
export interface TextureSpace {
  readonly min: Vec3;
  readonly max: Vec3;
}

/**
 * Generated coordinates (0..1 across the texture space), as Blender's auto texture
 * space: the box of the base mesh, with a flat side counted as 2 m (BKE_mesh_texspace_calc
 * sets a zero half-size to 1). FIDELITY? Blender maps modified meshes through their
 * original coordinates; here the drawn vertices are placed in the base mesh's box.
 */
function generatedAxis(v: number, lo: number, hi: number): number {
  const half = (hi - lo) / 2 || 1;
  return (v - (lo + hi) / 2) / (2 * half) + 0.5;
}

export interface MeshGeometry {
  readonly geometry: THREE.BufferGeometry;
  /** Face index of each triangle, to map picks back to faces. */
  readonly triangleFace: Int32Array;
}

/** `autoSmoothDeg`: the object's Auto Smooth angle, or null when it is off. */
export function meshToGeometry(m: MeshData, autoSmoothDeg: number | null = null, texSpace?: TextureSpace): MeshGeometry {
  const corner = cornerNormals(m, autoSmoothDeg === null ? undefined : { angleDeg: autoSmoothDeg });
  const tris = m.faces.map((_, f) => ({ f, tris: triangulateFace(m, f) }));
  const count = tris.reduce((n, t) => n + t.tris.length, 0);
  const positions = new Float32Array(count * 9);
  const normals = new Float32Array(count * 9);
  const orco = new Float32Array(count * 9);
  const box = texSpace ?? boundsOf(m);
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
        orco[o] = generatedAxis(p.x, box.min.x, box.max.x);
        orco[o + 1] = generatedAxis(p.y, box.min.y, box.max.y);
        orco[o + 2] = generatedAxis(p.z, box.min.z, box.max.z);
      }
      triangleFace[t] = f;
      t++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('blOrco', new THREE.BufferAttribute(orco, 3));
  geometry.computeBoundingSphere();
  return { geometry, triangleFace };
}

function boundsOf(m: MeshData): TextureSpace {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const v of m.verts) {
    min.x = Math.min(min.x, v.x); min.y = Math.min(min.y, v.y); min.z = Math.min(min.z, v.z);
    max.x = Math.max(max.x, v.x); max.y = Math.max(max.y, v.y); max.z = Math.max(max.z, v.z);
  }
  return m.verts.length ? { min, max } : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
}
