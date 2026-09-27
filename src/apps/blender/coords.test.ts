import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BLENDER_TO_THREE,
  blenderToThree,
  createBlenderSpaceRoot,
  threeToBlender,
  yUpGeometryToBlender,
} from './coords';
import { type Vec3, vec3 } from './math/vec3';
import { rotate } from './math/quat';

const expectClose = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x, 12);
  expect(a.y).toBeCloseTo(b.y, 12);
  expect(a.z).toBeCloseTo(b.z, 12);
};

describe('coords', () => {
  it('maps Blender Z up to three.js Y up', () => {
    expectClose(blenderToThree(vec3(0, 0, 1)), vec3(0, 1, 0));
    expectClose(blenderToThree(vec3(1, 0, 0)), vec3(1, 0, 0));
    // Blender +Y (away from the Front view) is three.js -Z (away from a default camera).
    expectClose(blenderToThree(vec3(0, 1, 0)), vec3(0, 0, -1));
  });

  it('round-trips points', () => {
    const p = vec3(1.5, -2.25, 3.75);
    expect(threeToBlender(blenderToThree(p))).toEqual(p);
    expect(blenderToThree(threeToBlender(p))).toEqual(p);
  });

  it('BLENDER_TO_THREE quaternion matches the point mapping', () => {
    for (const p of [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1), vec3(1, 2, 3)]) {
      const r = rotate(BLENDER_TO_THREE, p);
      const e = blenderToThree(p);
      expect(r.x).toBeCloseTo(e.x, 12);
      expect(r.y).toBeCloseTo(e.y, 12);
      expect(r.z).toBeCloseTo(e.z, 12);
    }
  });

  it('root group places Blender coordinates correctly in three.js world', () => {
    const root = createBlenderSpaceRoot();
    const child = new THREE.Object3D();
    child.position.set(1, 2, 3); // Blender coordinates
    root.add(child);
    root.updateMatrixWorld(true);
    const world = child.getWorldPosition(new THREE.Vector3());
    const expected = blenderToThree(vec3(1, 2, 3));
    expect(world.x).toBeCloseTo(expected.x, 12);
    expect(world.y).toBeCloseTo(expected.y, 12);
    expect(world.z).toBeCloseTo(expected.z, 12);
  });

  it('converts Y-up primitive geometry to Z-up', () => {
    const g = yUpGeometryToBlender(new THREE.CylinderGeometry(1, 1, 2, 8));
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect(bb.min.z).toBeCloseTo(-1, 6);
    expect(bb.max.z).toBeCloseTo(1, 6);
  });
});
