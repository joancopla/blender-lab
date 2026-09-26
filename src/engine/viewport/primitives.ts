/**
 * Geometry of Blender's primitives with default Add settings, in Blender local
 * space. Used for drawing and for picking.
 */
import * as THREE from 'three';
import { yUpGeometryToBlender } from '../coords';
import type { PrimitiveKind } from '../scene/scene';

export function primitiveGeometry(kind: PrimitiveKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(2, 2, 2);
    case 'uvSphere':
      // 32 segments, 16 rings, radius 1. three.js spheres are Y-up.
      return yUpGeometryToBlender(new THREE.SphereGeometry(1, 32, 16));
    case 'cylinder':
      return yUpGeometryToBlender(new THREE.CylinderGeometry(1, 1, 2, 32));
    case 'cone':
      return yUpGeometryToBlender(new THREE.CylinderGeometry(0, 1, 2, 32));
    case 'torus':
      // Major radius 1, minor 0.25, 48 x 12 segments. three.js tori lie in the XY plane already.
      return new THREE.TorusGeometry(1, 0.25, 12, 48);
    case 'plane':
      return new THREE.PlaneGeometry(2, 2);
  }
}


/** Flat list of triangle vertices (x, y, z per vertex, 3 vertices per triangle). */
