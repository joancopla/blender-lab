/**
 * Click picking in Blender space: which objects are under a screen point.
 * Meshes: ray against the primitive's triangles. Cameras and lights: distance
 * on screen to their drawn lines/icon.
 */
import { conjugate, rotate } from '../math/quat';
import { type Vec3, add, cross, dot, mul, sub, vec3 } from '../math/vec3';
import { LIGHT_ICON_RADII_PX, cameraDisplay } from '../scene/object-display';
import { type SceneState, objectRotation } from '../scene/scene';
import type { ViewportSize } from './projection';
import { primitiveTriangles } from './primitives';
import { type ViewProjection, screenRay, worldToScreen } from './screen';

/** Pick radius around wires, in px. FIDELITY? */
export const WIRE_PICK_RADIUS_PX = 5;

export interface PickHit {
  readonly id: string;
  /** Distance along the view direction; smaller is closer. */
  readonly depth: number;
}

/** Möller–Trumbore, two-sided. Returns the ray parameter or null. */
export function rayTriangle(o: Vec3, d: Vec3, a: Vec3, b: Vec3, c: Vec3): number | null {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const tv = sub(o, a);
  const u = dot(tv, p) * inv;
  if (u < 0 || u > 1) return null;
  const q = cross(tv, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = dot(e2, q) * inv;
  return t > 0 ? t : null;
}

function distanceToSegment2D(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export interface PickOptions {
  /** Objects that are not drawn (e.g. the camera we are looking through). */
  readonly hiddenIds?: ReadonlySet<string>;
}

/** All objects under (x, y), closest first. */
export function pickAt(
  scene: SceneState,
  vp: ViewProjection,
  size: ViewportSize,
  x: number,
  y: number,
  opts: PickOptions = {},
): PickHit[] {
  const ray = screenRay(vp, size, x, y);
  const forward = rotate(vp.rotation, vec3(0, 0, -1));
  const aspect = scene.render.resolutionX / scene.render.resolutionY;
  const hits: PickHit[] = [];

  for (const o of scene.objects) {
    if (opts.hiddenIds?.has(o.id)) continue;
    const q = objectRotation(o);
    const toWorld = (p: Vec3) => add(o.location, rotate(q, mul(p, o.scale)));

    if (o.type === 'mesh') {
      // Ray in object space; the ray parameter t is the same as in world space.
      const inv = conjugate(q);
      const invScale = vec3(1 / o.scale.x, 1 / o.scale.y, 1 / o.scale.z);
      const lo = mul(rotate(inv, sub(ray.origin, o.location)), invScale);
      const ld = mul(rotate(inv, ray.direction), invScale);
      const tris = primitiveTriangles(o.primitive);
      let best = Infinity;
      for (let i = 0; i < tris.length; i += 9) {
        const t = rayTriangle(
          lo,
          ld,
          vec3(tris[i]!, tris[i + 1]!, tris[i + 2]!),
          vec3(tris[i + 3]!, tris[i + 4]!, tris[i + 5]!),
          vec3(tris[i + 6]!, tris[i + 7]!, tris[i + 8]!),
        );
        if (t !== null && t < best) best = t;
      }
      if (best < Infinity) {
        const hit = add(ray.origin, vec3(ray.direction.x * best, ray.direction.y * best, ray.direction.z * best));
        hits.push({ id: o.id, depth: dot(sub(hit, vp.eye), forward) });
      }
    } else if (o.type === 'camera') {
      let bestDepth = Infinity;
      for (const [a, b] of cameraDisplay(o, aspect).segments) {
        const sa = worldToScreen(vp, size, toWorld(a));
        const sb = worldToScreen(vp, size, toWorld(b));
        if (!sa || !sb) continue;
        if (distanceToSegment2D(x, y, sa.x, sa.y, sb.x, sb.y) <= WIRE_PICK_RADIUS_PX) {
          bestDepth = Math.min(bestDepth, (sa.depth + sb.depth) / 2);
        }
      }
      if (bestDepth < Infinity) hits.push({ id: o.id, depth: bestDepth });
    } else {
      const s = worldToScreen(vp, size, o.location);
      if (s && Math.hypot(x - s.x, y - s.y) <= LIGHT_ICON_RADII_PX[0] + 2) {
        hits.push({ id: o.id, depth: s.depth });
      }
    }
  }
  return hits.sort((a, b) => a.depth - b.depth);
}

/**
 * Picks the object to select on click. Clicking again where the active object
 * is under the cursor selects the next object behind it (cycling).
 * FIDELITY? Blender's cycling rules.
 */
export function chooseClickTarget(hits: readonly PickHit[], scene: SceneState): string | null {
  if (hits.length === 0) return null;
  const i = hits.findIndex((h) => h.id === scene.activeId && scene.selectedIds.includes(h.id));
  if (i < 0 || hits.length === 1) return hits[0]!.id;
  return hits[(i + 1) % hits.length]!.id;
}
