/**
 * Viewport projection maths, mirroring how Blender builds the 3D viewport
 * frustum (BKE_camera_params_from_view3d / compute_viewplane).
 */

/** Blender's viewport lens (View > Focal Length) in mm. */
export const VIEWPORT_LENS = 50;
/** DEFAULT_SENSOR_WIDTH in Blender. */
export const DEFAULT_SENSOR = 36;
/**
 * CAMERA_PARAM_ZOOM_INIT_PERSP: non-camera views use twice the sensor, so the
 * effective 3D viewport field of view is wider than a 50 mm camera.
 * FIDELITY? Taken from Blender's source as remembered; to be validated visually.
 */
export const VIEWPORT_ZOOM = 2;
/** Default View > Clip Start / Clip End. */
export const CLIP_START = 0.01;
export const CLIP_END = 1000;

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Half-extent of the view plane per unit of distance, for each viewport axis.
 * Sensor fit AUTO: the sensor covers the larger dimension of the viewport.
 */
export function halfTangents(
  size: ViewportSize,
  lens = VIEWPORT_LENS,
  sensor = DEFAULT_SENSOR,
  zoom = VIEWPORT_ZOOM,
): { x: number; y: number } {
  const halfLarge = ((sensor / 2) * zoom) / lens;
  const w = Math.max(1, size.width);
  const h = Math.max(1, size.height);
  return w >= h ? { x: halfLarge, y: (halfLarge * h) / w } : { x: (halfLarge * w) / h, y: halfLarge };
}

/** Tangent of half the field of view along the smaller viewport dimension. */
export function minHalfTangent(size: ViewportSize): number {
  const t = halfTangents(size);
  return Math.min(t.x, t.y);
}

/** Distance range Blender allows for the view (ED_view3d_dist_range_get). */
export const MIN_DISTANCE = CLIP_START * 1.5;
export const MAX_DISTANCE = CLIP_END * 10;

export const clampDistance = (d: number): number => Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d));
