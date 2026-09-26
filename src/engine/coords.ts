/**
 * The ONLY place where Blender space (Z up) meets three.js space (Y up).
 *
 * Strategy: the three.js scene has a single root group (`createBlenderSpaceRoot`)
 * rotated so that everything inside it can use Blender coordinates directly:
 * object locations, rotations, the viewport camera and the grid. Nothing outside
 * this file should swap axes by hand.
 *
 * Blender (x, y, z) -> three.js (x, z, -y). This is a rotation of -90° around X.
 */
import * as THREE from 'three';
import { type Vec3, vec3 } from './math/vec3';
import { type Quat } from './math/quat';

/** Blender space -> three.js world space, as a quaternion (w, x, y, z). */
const HALF_SQRT2 = Math.SQRT1_2;
export const BLENDER_TO_THREE: Quat = { w: HALF_SQRT2, x: -HALF_SQRT2, y: 0, z: 0 };

export function blenderToThree(v: Vec3): Vec3 {
  return vec3(v.x, v.z, -v.y);
}

export function threeToBlender(v: Vec3): Vec3 {
  return vec3(v.x, -v.z, v.y);
}

/** Root group whose children live in Blender coordinates. */
export function createBlenderSpaceRoot(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'BlenderSpace';
  root.quaternion.set(BLENDER_TO_THREE.x, BLENDER_TO_THREE.y, BLENDER_TO_THREE.z, BLENDER_TO_THREE.w);
  return root;
}

/** Copies a Blender-space position into a three.js object that lives inside the root. */
export function setObjectLocation(obj: THREE.Object3D, v: Vec3): void {
  obj.position.set(v.x, v.y, v.z);
}

/** Copies a Blender-space orientation into a three.js object that lives inside the root. */
export function setObjectRotation(obj: THREE.Object3D, q: Quat): void {
  obj.quaternion.set(q.x, q.y, q.z, q.w);
}

/**
 * three.js primitive geometries are built Y-up (e.g. a cylinder's axis is +Y).
 * Blender primitives are Z-up. Rotating the geometry +90° around X maps +Y to +Z,
 * so the result can be used as Blender local-space mesh data.
 */
export function yUpGeometryToBlender<T extends THREE.BufferGeometry>(geometry: T): T {
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
