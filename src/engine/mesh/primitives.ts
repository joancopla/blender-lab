/**
 * Blender's mesh primitives with default Add settings, as MeshData, with the
 * same vertex, edge and face counts as Blender.
 * FIDELITY? Vertex order and the angle of the first vertex of circles; counts
 * are what the lab and the Statistics overlay rely on.
 */
import { type Vec3, vec3 } from '../math/vec3';
import type { PrimitiveKind } from '../scene/scene';
import { type Face, type MeshData, meshFromFaces } from './mesh-data';

/** Point on a circle of radius r, starting at +Y and going counter-clockwise seen from +Z. */
function ringPoint(j: number, segments: number, r: number, z: number): Vec3 {
  const a = (2 * Math.PI * j) / segments;
  return vec3(-r * Math.sin(a), r * Math.cos(a), z);
}

/** Cube, size 2: 8 vertices, 12 edges, 6 quads. */
export function cubeMesh(size = 2): MeshData {
  const h = size / 2;
  const verts: Vec3[] = [];
  for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) verts.push(vec3(x, y, z));
  // Index = 4*ix + 2*iy + iz.
  const faces: Face[] = [
    [0, 1, 3, 2], // -X
    [4, 6, 7, 5], // +X
    [0, 4, 5, 1], // -Y
    [2, 3, 7, 6], // +Y
    [0, 2, 6, 4], // -Z
    [1, 5, 7, 3], // +Z
  ];
  return meshFromFaces(verts, faces);
}

/** Plane, size 2: 4 vertices, 4 edges, 1 quad facing +Z. */
export function planeMesh(size = 2): MeshData {
  const h = size / 2;
  return meshFromFaces([vec3(-h, -h, 0), vec3(h, -h, 0), vec3(h, h, 0), vec3(-h, h, 0)], [[0, 1, 2, 3]]);
}

/** UV Sphere, 32 segments, 16 rings, radius 1: 482 vertices, 992 edges, 512 faces. */
export function uvSphereMesh(segments = 32, rings = 16, radius = 1): MeshData {
  const verts: Vec3[] = [vec3(0, 0, radius)];
  for (let i = 1; i < rings; i++) {
    const theta = (Math.PI * i) / rings;
    for (let j = 0; j < segments; j++) verts.push(ringPoint(j, segments, radius * Math.sin(theta), radius * Math.cos(theta)));
  }
  const bottom = verts.length;
  verts.push(vec3(0, 0, -radius));
  const ring = (i: number, j: number) => 1 + (i - 1) * segments + (j % segments);
  const faces: Face[] = [];
  for (let j = 0; j < segments; j++) faces.push([0, ring(1, j), ring(1, j + 1)]);
  for (let i = 1; i < rings - 1; i++) {
    for (let j = 0; j < segments; j++) faces.push([ring(i, j), ring(i + 1, j), ring(i + 1, j + 1), ring(i, j + 1)]);
  }
  for (let j = 0; j < segments; j++) faces.push([ring(rings - 1, j), bottom, ring(rings - 1, j + 1)]);
  return meshFromFaces(verts, faces);
}

/** Cylinder, 32 vertices, radius 1, depth 2, n-gon caps: 64 vertices, 96 edges, 34 faces. */
export function cylinderMesh(segments = 32, radius = 1, depth = 2): MeshData {
  const h = depth / 2;
  const verts: Vec3[] = [];
  for (let j = 0; j < segments; j++) verts.push(ringPoint(j, segments, radius, -h));
  for (let j = 0; j < segments; j++) verts.push(ringPoint(j, segments, radius, h));
  const b = (j: number) => j % segments;
  const t = (j: number) => segments + (j % segments);
  const faces: Face[] = [];
  for (let j = 0; j < segments; j++) faces.push([b(j), b(j + 1), t(j + 1), t(j)]);
  faces.push(Array.from({ length: segments }, (_, j) => t(j)));
  faces.push(Array.from({ length: segments }, (_, j) => b(segments - 1 - j)));
  return meshFromFaces(verts, faces);
}

/** Cone, 32 vertices, radius 1, depth 2, n-gon base: 33 vertices, 64 edges, 33 faces. */
export function coneMesh(segments = 32, radius = 1, depth = 2): MeshData {
  const h = depth / 2;
  const verts: Vec3[] = [];
  for (let j = 0; j < segments; j++) verts.push(ringPoint(j, segments, radius, -h));
  const tip = verts.length;
  verts.push(vec3(0, 0, h));
  const faces: Face[] = [];
  for (let j = 0; j < segments; j++) faces.push([j, (j + 1) % segments, tip]);
  faces.push(Array.from({ length: segments }, (_, j) => segments - 1 - j));
  return meshFromFaces(verts, faces);
}

/** Torus, 48 × 12 segments, major radius 1, minor 0.25: 576 vertices, 1152 edges, 576 faces. */
export function torusMesh(major = 48, minor = 12, majorRadius = 1, minorRadius = 0.25): MeshData {
  const verts: Vec3[] = [];
  for (let i = 0; i < major; i++) {
    const u = (2 * Math.PI * i) / major;
    for (let j = 0; j < minor; j++) {
      const v = (2 * Math.PI * j) / minor;
      const r = majorRadius + minorRadius * Math.cos(v);
      verts.push(vec3(r * Math.cos(u), r * Math.sin(u), minorRadius * Math.sin(v)));
    }
  }
  const at = (i: number, j: number) => (i % major) * minor + (j % minor);
  const faces: Face[] = [];
  for (let i = 0; i < major; i++) {
    for (let j = 0; j < minor; j++) faces.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
  }
  return meshFromFaces(verts, faces);
}

export function primitiveMesh(kind: PrimitiveKind): MeshData {
  switch (kind) {
    case 'cube':
      return cubeMesh();
    case 'plane':
      return planeMesh();
    case 'uvSphere':
      return uvSphereMesh();
    case 'cylinder':
      return cylinderMesh();
    case 'cone':
      return coneMesh();
    case 'torus':
      return torusMesh();
  }
}
