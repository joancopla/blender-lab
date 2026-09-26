/**
 * Does an object sit on its ghost silhouette? Compares what you see, not the raw
 * numbers: a cube rotated 90° matches a cube at 0°, a sphere's rotation does not
 * matter, a cylinder can be upside down.
 */
import { DEG, fromEulerXYZ, rotate } from '../math/quat';
import { type Vec3, add, length, mul, sub, vec3 } from '../math/vec3';
import type { MeshObject, PrimitiveKind } from '../scene/scene';

/** A lab silhouette: where an object must end up. Not a scene object. */
export interface Ghost {
  readonly id: string;
  /** The scene object that has to match it. */
  readonly objectId: string;
  readonly primitive: PrimitiveKind;
  readonly location: Vec3;
  readonly rotationDeg: Vec3;
  readonly scale: Vec3;
}

type Pose = Pick<MeshObject, 'primitive' | 'location' | 'rotationDeg' | 'scale'>;

/**
 * Characteristic points in local space, whether their order matters, and the
 * radius (in local units) of shapes that are round around their Z axis. For
 * round shapes the rotation around their own axis cannot be seen, so only the
 * axis ends and the radius are compared.
 */
function signature(kind: PrimitiveKind): { points: Vec3[]; ordered: boolean; radius: number } {
  switch (kind) {
    case 'cube': {
      const pts: Vec3[] = [];
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(vec3(x, y, z));
      return { points: pts, ordered: false, radius: 0 };
    }
    case 'uvSphere':
      // Uniformly scaled spheres look the same in any rotation: centre + radius.
      return { points: [vec3(0, 0, 0)], ordered: true, radius: 1 };
    case 'cylinder':
      return { points: [vec3(0, 0, 1), vec3(0, 0, -1)], ordered: false, radius: 1 };
    case 'cone':
      // The tip must be the tip.
      return { points: [vec3(0, 0, 1), vec3(0, 0, -1)], ordered: true, radius: 1 };
    case 'torus':
      return { points: [vec3(0, 0, 0.25), vec3(0, 0, -0.25)], ordered: false, radius: 1.25 };
    case 'plane':
      return { points: [vec3(1, 1, 0), vec3(-1, 1, 0), vec3(1, -1, 0), vec3(-1, -1, 0)], ordered: false, radius: 0 };
  }
}

function worldPoints(p: Pose): Vec3[] {
  const q = fromEulerXYZ(vec3(p.rotationDeg.x * DEG, p.rotationDeg.y * DEG, p.rotationDeg.z * DEG));
  return signature(p.primitive).points.map((v) => add(p.location, rotate(q, mul(v, p.scale))));
}

/** Radius in metres of a round shape (assumes near-uniform X/Y scale). */
function worldRadius(p: Pose): number {
  const r = signature(p.primitive).radius;
  if (p.primitive === 'uvSphere') {
    return (r * (Math.abs(p.scale.x) + Math.abs(p.scale.y) + Math.abs(p.scale.z))) / 3;
  }
  return (r * (Math.abs(p.scale.x) + Math.abs(p.scale.y))) / 2;
}

/**
 * Largest distance between matching characteristic points (metres), or Infinity
 * for different primitives. Unordered points are matched greedily to the nearest.
 */
export function ghostDistance(o: Pose, g: Pose): number {
  if (o.primitive !== g.primitive) return Infinity;
  const a = worldPoints(o);
  const b = worldPoints(g);
  let worst = Math.abs(worldRadius(o) - worldRadius(g));
  if (signature(o.primitive).ordered) {
    return Math.max(worst, ...a.map((p, i) => length(sub(p, b[i]!))));
  }
  const left = [...b];
  for (const p of a) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (length(sub(p, left[i]!)) < length(sub(p, left[best]!))) best = i;
    }
    worst = Math.max(worst, length(sub(p, left[best]!)));
    left.splice(best, 1);
  }
  return worst;
}

/** Visual match within a tolerance in metres (0.1 m by default). */
export function matchesGhost(o: Pose, g: Pose, tolerance = 0.1): boolean {
  return ghostDistance(o, g) <= tolerance;
}
