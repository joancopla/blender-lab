/**
 * Shapes Blender draws for non-mesh objects, in object local space (Blender
 * coordinates). Shared by the renderer and by picking, so both always agree.
 */
import { type Vec3, vec3 } from '../math/vec3';
import type { CameraObject } from './scene';

export interface CameraDisplay {
  /** Line segments as pairs of points: pyramid, frame and the "up" triangle outline. */
  readonly segments: readonly (readonly [Vec3, Vec3])[];
  /** The "up" triangle, filled for the scene camera. */
  readonly triangle: readonly [Vec3, Vec3, Vec3];
}

/**
 * Camera with Display Size 1 m: drawsize = 0.5, sensor fit Auto on the render size.
 * FIDELITY? Proportions of the triangle (from Blender's camera drawing code).
 */
export function cameraDisplay(cam: CameraObject, renderAspect: number): CameraDisplay {
  const s = 0.5;
  const halfW = renderAspect >= 1 ? s : s * renderAspect;
  const halfH = renderAspect >= 1 ? s / renderAspect : s;
  const depth = (s * cam.lens) / (cam.sensorWidth / 2);
  const c = [vec3(-halfW, -halfH, -depth), vec3(halfW, -halfH, -depth), vec3(halfW, halfH, -depth), vec3(-halfW, halfH, -depth)];
  const o = vec3(0, 0, 0);
  const segments: [Vec3, Vec3][] = [];
  for (let i = 0; i < 4; i++) {
    segments.push([o, c[i]!], [c[i]!, c[(i + 1) % 4]!]);
  }
  const ty = s * (halfH / s + 0.1);
  const tTop = 1.1 * s * (halfH / s + 0.7);
  const t0 = vec3(-0.7 * s, ty, -depth);
  const t1 = vec3(0.7 * s, ty, -depth);
  const t2 = vec3(0, tTop, -depth);
  segments.push([t0, t1], [t1, t2], [t2, t0]);
  return { segments, triangle: [t0, t1, t2] };
}

/** Point light icon: circle radii in screen pixels. FIDELITY? */
export const LIGHT_ICON_RADII_PX = [9, 3] as const;
