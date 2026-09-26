/**
 * Screen <-> world maths for the current view, in Blender space.
 * Screen coordinates are CSS pixels, origin at the viewport's top-left.
 */
import { type Quat, conjugate, rotate } from '../math/quat';
import { type Vec3, add, normalize, sub, vec3 } from '../math/vec3';
import type { DisplayedView } from './navigator';
import { type ViewportSize, CLIP_START, halfTangents } from './projection';
import { type SceneCameraData, cameraViewFrustum } from './view-state';

export interface ViewProjection {
  readonly eye: Vec3;
  readonly rotation: Quat;
  readonly orthographic: boolean;
  /** View-plane bounds: tangents (perspective) or metres (orthographic). */
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export function viewProjection(
  view: DisplayedView,
  size: ViewportSize,
  camData: SceneCameraData | null,
): ViewProjection {
  const eye = add(view.target, rotate(view.rotation, vec3(0, 0, view.distance)));
  if (view.camera && camData) {
    const f = cameraViewFrustum(view.camera, camData, size);
    return { eye, rotation: view.rotation, orthographic: false, ...f };
  }
  const t = halfTangents(size);
  if (view.projection === 'orthographic') {
    const d = view.distance;
    return { eye, rotation: view.rotation, orthographic: true, left: -t.x * d, right: t.x * d, top: t.y * d, bottom: -t.y * d };
  }
  return { eye, rotation: view.rotation, orthographic: false, left: -t.x, right: t.x, top: t.y, bottom: -t.y };
}

export interface Ray {
  readonly origin: Vec3;
  /** Unit direction. */
  readonly direction: Vec3;
}

export function screenRay(vp: ViewProjection, size: ViewportSize, x: number, y: number): Ray {
  const u = vp.left + (x / size.width) * (vp.right - vp.left);
  const v = vp.top - (y / size.height) * (vp.top - vp.bottom);
  if (vp.orthographic) {
    return { origin: add(vp.eye, rotate(vp.rotation, vec3(u, v, 0))), direction: rotate(vp.rotation, vec3(0, 0, -1)) };
  }
  return { origin: vp.eye, direction: normalize(rotate(vp.rotation, vec3(u, v, -1))) };
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
  /** Distance along the view direction. */
  readonly depth: number;
}

/** Projects a point; null if it is behind the near plane (perspective). */
export function worldToScreen(vp: ViewProjection, size: ViewportSize, p: Vec3): ScreenPoint | null {
  const local = rotate(conjugate(vp.rotation), sub(p, vp.eye));
  const depth = -local.z;
  let u: number;
  let v: number;
  if (vp.orthographic) {
    u = local.x;
    v = local.y;
  } else {
    if (depth <= CLIP_START) return null;
    u = local.x / depth;
    v = local.y / depth;
  }
  return {
    x: ((u - vp.left) / (vp.right - vp.left)) * size.width,
    y: ((vp.top - v) / (vp.top - vp.bottom)) * size.height,
    depth,
  };
}
