/**
 * State of the 3D viewport's view (Blender's RegionView3D), in Blender space.
 *
 * All functions here are pure: they take a state and return a new one. The
 * three.js camera is derived from this state and never read back.
 */
import {
  type Quat,
  DEG,
  IDENTITY,
  angleBetween,
  fromAxisAngle,
  mulQuat,
  normalizeQuat,
  rotate,
} from '../math/quat';
import { type Vec3, AXIS_X, AXIS_Z, add, scale, sub, vec3 } from '../math/vec3';
import {
  type ViewportSize,
  clampDistance,
  halfTangents,
  minHalfTangent,
} from './projection';

export type AxisView = 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom';
export type Projection = 'perspective' | 'orthographic';

/** Camera view (Numpad 0) framing: Blender's camzoom and camdx/camdy. */
export interface CameraFraming {
  /** Blender camzoom, range -30..600. 0 shows the camera frame at half the viewport. */
  readonly zoom: number;
  /** Pan of the camera frame, in view-plane units (tangent of the view angle). */
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface ViewState {
  /** Orientation of the view (view space -> world). The view looks along its local -Z, up is local +Y. */
  readonly rotation: Quat;
  /** Point the view orbits around and zooms towards. */
  readonly target: Vec3;
  /** Distance from the eye to the target, in metres. */
  readonly distance: number;
  readonly projection: Projection;
  /** Aligned axis view, or null for a free ("User") view. */
  readonly axisView: AxisView | null;
  /** Auto Perspective: projection to restore when orbiting out of an axis view. */
  readonly projectionBeforeAxis: Projection | null;
  /**
   * Non-null while looking through the scene camera. The rest of the state keeps
   * the previous view, so Numpad 0 can toggle back to it.
   */
  readonly camera: CameraFraming | null;
}

/** Pose of the scene camera object, needed for the camera view. */
export interface CameraPose {
  readonly location: Vec3;
  readonly rotation: Quat;
}

/**
 * Navigation preferences, with Blender's defaults (Preferences > Navigation).
 * FIDELITY? All values to be validated against Blender 5.2.
 */
export const NAV_PREFS = {
  /** Orbit Sensitivity (turntable), degrees per pixel. */
  orbitSensitivityDeg: 0.4,
  /** Rotation Angle used by Numpad 4/6/8/2, degrees. */
  rotationAngleDeg: 15,
  /** Auto Perspective. */
  autoPerspective: true,
  /** Zoom factor per mouse wheel step. */
  wheelZoomFactor: 1.2,
  /** Pixels of vertical drag that double/halve the distance with Ctrl+MMB. */
  dragZoomPixelsPerDoubling: 200,
} as const;

// Orientations of the axis views (view -> world).
const Q_X90 = fromAxisAngle(AXIS_X, 90 * DEG);
export const AXIS_VIEW_ROTATIONS: Record<AxisView, Quat> = {
  top: IDENTITY,
  bottom: fromAxisAngle(AXIS_X, 180 * DEG),
  front: Q_X90,
  back: mulQuat(fromAxisAngle(AXIS_Z, 180 * DEG), Q_X90),
  right: mulQuat(fromAxisAngle(AXIS_Z, 90 * DEG), Q_X90),
  left: mulQuat(fromAxisAngle(AXIS_Z, -90 * DEG), Q_X90),
};

export const OPPOSITE_AXIS_VIEW: Record<AxisView, AxisView> = {
  front: 'back',
  back: 'front',
  right: 'left',
  left: 'right',
  top: 'bottom',
  bottom: 'top',
};

const AXIS_VIEW_LABEL: Record<AxisView, string> = {
  front: 'Front',
  back: 'Back',
  right: 'Right',
  left: 'Left',
  top: 'Top',
  bottom: 'Bottom',
};

/**
 * Initial view of the default startup file.
 * FIDELITY? Approximation of Blender's default view: turntable angles and distance
 * chosen by eye, to be adjusted against Blender. The azimuth differs from the
 * camera's so the camera does not sit in front of the scene centre.
 */
export function defaultViewState(): ViewState {
  const tilt = fromAxisAngle(AXIS_X, 62 * DEG);
  const turn = fromAxisAngle(AXIS_Z, 30 * DEG);
  return {
    rotation: mulQuat(turn, tilt),
    target: vec3(0, 0, 0),
    distance: 17.8,
    projection: 'perspective',
    axisView: null,
    projectionBeforeAxis: null,
    camera: null,
  };
}

// ---------------------------------------------------------------------------
// Derived values

/** Direction the view looks at (world space). */
export const viewForward = (s: { rotation: Quat }): Vec3 => rotate(s.rotation, vec3(0, 0, -1));
export const viewRight = (s: { rotation: Quat }): Vec3 => rotate(s.rotation, AXIS_X);
export const viewUp = (s: { rotation: Quat }): Vec3 => rotate(s.rotation, vec3(0, 1, 0));

/** Eye position of the free view (ignores the camera view). */
export function viewEye(s: { rotation: Quat; target: Vec3; distance: number }): Vec3 {
  return add(s.target, rotate(s.rotation, vec3(0, 0, s.distance)));
}

/** Text shown at the top left of the viewport, e.g. "User Perspective". */
export function viewName(s: ViewState): string {
  if (s.camera) return 'Camera Perspective';
  const place = s.axisView ? AXIS_VIEW_LABEL[s.axisView] : 'User';
  return `${place} ${s.projection === 'perspective' ? 'Perspective' : 'Orthographic'}`;
}

/** Returns the axis view whose orientation matches `rotation`, if any. */
export function matchAxisView(rotation: Quat, toleranceRad = 1e-4): AxisView | null {
  for (const [axis, q] of Object.entries(AXIS_VIEW_ROTATIONS) as [AxisView, Quat][]) {
    if (angleBetween(rotation, q) < toleranceRad) return axis;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers for leaving special modes

/**
 * Leaves the camera view keeping the camera's point of view, as Blender does when
 * you orbit, pan or zoom out of it with the view (ED_view3d_from_object).
 */
export function exitCameraFromPose(s: ViewState, cam: CameraPose): ViewState {
  if (!s.camera) return s;
  const forward = rotate(cam.rotation, vec3(0, 0, -1));
  return {
    ...s,
    camera: null,
    rotation: cam.rotation,
    target: add(cam.location, scale(forward, s.distance)),
    axisView: null,
  };
}

/** Auto Perspective: going back to the stored projection when leaving an axis view. */
function leaveAxisView(s: ViewState): ViewState {
  if (s.axisView === null) return s;
  const restore =
    NAV_PREFS.autoPerspective && s.projection === 'orthographic' && s.projectionBeforeAxis
      ? s.projectionBeforeAxis
      : s.projection;
  return { ...s, axisView: null, projection: restore, projectionBeforeAxis: null };
}

/** Auto Perspective: axis views switch to orthographic, remembering the previous projection. */
function enterAxisView(s: ViewState, axis: AxisView): ViewState {
  const wasAxis = s.axisView !== null;
  if (!NAV_PREFS.autoPerspective) return { ...s, axisView: axis };
  return {
    ...s,
    axisView: axis,
    projection: 'orthographic',
    projectionBeforeAxis: wasAxis ? s.projectionBeforeAxis : s.projection,
  };
}

// ---------------------------------------------------------------------------
// Navigation operations

/**
 * Turntable orbit by a mouse delta in CSS pixels (x right, y down).
 * FIDELITY? Direction: the scene follows the mouse ("grab" metaphor) on both axes.
 */
export function orbit(s: ViewState, dx: number, dy: number, cam: CameraPose | null): ViewState {
  const k = NAV_PREFS.orbitSensitivityDeg * DEG;
  return turntable(s, -dx * k, -dy * k, cam, false);
}

export type OrbitStep = 'left' | 'right' | 'up' | 'down';

/**
 * Numpad 4/6/8/2. Same direction as dragging the mouse left/right/up/down.
 * If the result lines up with an axis view, it becomes that axis view.
 * FIDELITY? Direction and the axis snapping.
 */
export function orbitStep(s: ViewState, step: OrbitStep, cam: CameraPose | null): ViewState {
  const a = NAV_PREFS.rotationAngleDeg * DEG;
  const [yaw, pitch] =
    step === 'left' ? [a, 0] : step === 'right' ? [-a, 0] : step === 'up' ? [0, a] : [0, -a];
  return turntable(s, yaw, pitch, cam, true);
}

function turntable(
  s: ViewState,
  yaw: number,
  pitch: number,
  cam: CameraPose | null,
  snapToAxis: boolean,
): ViewState {
  let base = cam ? exitCameraFromPose(s, cam) : s;
  // Yaw around the global Z axis, pitch around the view's own horizontal axis.
  const rotation = normalizeQuat(
    mulQuat(fromAxisAngle(AXIS_Z, yaw), mulQuat(base.rotation, fromAxisAngle(AXIS_X, pitch))),
  );
  const matched = snapToAxis ? matchAxisView(rotation) : null;
  if (matched) {
    return enterAxisView({ ...base, rotation: AXIS_VIEW_ROTATIONS[matched] }, matched);
  }
  base = leaveAxisView(base);
  return { ...base, rotation };
}

/** Numpad 1/3/7 (and Ctrl for the opposite side). */
export function setAxisView(s: ViewState, axis: AxisView): ViewState {
  const base: ViewState = { ...s, camera: null };
  return enterAxisView({ ...base, rotation: AXIS_VIEW_ROTATIONS[axis] }, axis);
}

/** Numpad 5. FIDELITY? Does nothing in the camera view. */
export function toggleProjection(s: ViewState): ViewState {
  if (s.camera) return s;
  return { ...s, projection: s.projection === 'perspective' ? 'orthographic' : 'perspective' };
}

/** World metres per CSS pixel at the target distance. */
export function metresPerPixel(s: ViewState, size: ViewportSize): number {
  const t = halfTangents(size);
  return (2 * t.x * s.distance) / Math.max(1, size.width);
}

/**
 * Shift + MMB. The point under the cursor at the target depth follows the mouse.
 * In the camera view, pans the camera frame instead.
 */
export function pan(
  s: ViewState,
  dx: number,
  dy: number,
  size: ViewportSize,
  camData: SceneCameraData | null,
): ViewState {
  if (s.camera && camData) {
    const k = cameraTangentPerPixel(s.camera, camData, size);
    return {
      ...s,
      camera: { ...s.camera, offsetX: s.camera.offsetX - dx * k, offsetY: s.camera.offsetY + dy * k },
    };
  }
  const k = metresPerPixel(s, size);
  const delta = add(scale(viewRight(s), -dx * k), scale(viewUp(s), dy * k));
  return { ...s, target: add(s.target, delta) };
}

/** Mouse wheel. `steps` > 0 zooms in. In the camera view, zooms the camera frame. */
export function zoomSteps(s: ViewState, steps: number): ViewState {
  const factor = Math.pow(NAV_PREFS.wheelZoomFactor, steps);
  if (s.camera) return { ...s, camera: zoomCameraFrame(s.camera, factor) };
  return { ...s, distance: clampDistance(s.distance / factor) };
}

/**
 * Ctrl + MMB drag, dy in CSS pixels (down positive).
 * FIDELITY? Dragging up zooms in; speed chosen by feel.
 */
export function zoomDrag(s: ViewState, dy: number): ViewState {
  const factor = Math.pow(2, -dy / NAV_PREFS.dragZoomPixelsPerDoubling);
  if (s.camera) return { ...s, camera: zoomCameraFrame(s.camera, factor) };
  return { ...s, distance: clampDistance(s.distance / factor) };
}

// ---------------------------------------------------------------------------
// Framing (Numpad . / Home)

export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/** VIEW3D_MARGIN in Blender. */
const VIEW_MARGIN = 1.4;

/**
 * Centres the view on a bounding box and sets the distance so that it fits
 * (view3d_from_minmax). Leaves the camera view, keeps the orientation.
 * FIDELITY? Fit uses the field of view of the smaller viewport dimension.
 */
export function frameBounds(
  s: ViewState,
  bounds: Bounds,
  size: ViewportSize,
  cam: CameraPose | null,
): ViewState {
  const base = cam ? exitCameraFromPose(s, cam) : { ...s, camera: null };
  const extent = sub(bounds.max, bounds.min);
  const center = scale(add(bounds.min, bounds.max), 0.5);
  const largest = Math.max(extent.x, extent.y, extent.z);
  // A single point (or empty-sized selection) only re-centres the view.
  if (largest <= 0) return { ...base, target: center };
  const radius = (largest / 2) * VIEW_MARGIN;
  const distance = clampDistance(radius / minHalfTangent(size));
  return { ...base, target: center, distance };
}

// ---------------------------------------------------------------------------
// Camera view (Numpad 0)

/** BKE_screen_view3d_zoom_to_fac. */
export function cameraZoomToFactor(camzoom: number): number {
  return Math.pow(Math.SQRT2 + camzoom / 50, 2) / 4;
}

/** BKE_screen_view3d_zoom_from_fac. */
export function cameraZoomFromFactor(factor: number): number {
  return (Math.sqrt(4 * factor) - Math.SQRT2) * 50;
}

const CAMZOOM_MIN = -30;
const CAMZOOM_MAX = 600;

function zoomCameraFrame(c: CameraFraming, factor: number): CameraFraming {
  const fac = cameraZoomToFactor(c.zoom) * factor;
  const zoom = Math.min(CAMZOOM_MAX, Math.max(CAMZOOM_MIN, cameraZoomFromFactor(fac)));
  return { ...c, zoom };
}

/** Numpad 0 toggles between the scene camera and the previous view. */
export function toggleCameraView(s: ViewState, hasCamera: boolean): ViewState {
  if (s.camera) return { ...s, camera: null };
  if (!hasCamera) return s;
  return { ...s, camera: { zoom: 0, offsetX: 0, offsetY: 0 } };
}

export interface SceneCameraData {
  /** Focal length in mm. */
  readonly lens: number;
  /** Sensor width in mm (sensor fit Auto). */
  readonly sensorWidth: number;
  /** Render resolution. */
  readonly resolutionX: number;
  readonly resolutionY: number;
}

/** Half tangents of the camera's own frame (sensor fit Auto on the render size). */
export function cameraFrameHalfTangents(data: SceneCameraData): { x: number; y: number } {
  const half = data.sensorWidth / 2 / data.lens;
  return data.resolutionX >= data.resolutionY
    ? { x: half, y: (half * data.resolutionY) / data.resolutionX }
    : { x: (half * data.resolutionX) / data.resolutionY, y: half };
}

/**
 * Viewport frustum (at unit distance) while looking through the camera. The
 * viewport shows the camera's view plane enlarged by 1 / zoom factor.
 */
export function cameraViewFrustum(
  framing: CameraFraming,
  data: SceneCameraData,
  size: ViewportSize,
): { left: number; right: number; top: number; bottom: number } {
  const t = halfTangents(size, data.lens, data.sensorWidth, 1 / cameraZoomToFactor(framing.zoom));
  return {
    left: -t.x + framing.offsetX,
    right: t.x + framing.offsetX,
    top: t.y + framing.offsetY,
    bottom: -t.y + framing.offsetY,
  };
}

function cameraTangentPerPixel(framing: CameraFraming, data: SceneCameraData, size: ViewportSize): number {
  const t = halfTangents(size, data.lens, data.sensorWidth, 1 / cameraZoomToFactor(framing.zoom));
  return (2 * t.x) / Math.max(1, size.width);
}

/** Camera frame rectangle in CSS pixels (origin top-left). */
export function cameraFrameRect(
  framing: CameraFraming,
  data: SceneCameraData,
  size: ViewportSize,
): { x: number; y: number; width: number; height: number } {
  const f = cameraViewFrustum(framing, data, size);
  const c = cameraFrameHalfTangents(data);
  const toX = (t: number) => ((t - f.left) / (f.right - f.left)) * size.width;
  const toY = (t: number) => ((f.top - t) / (f.top - f.bottom)) * size.height;
  const x0 = toX(-c.x);
  const x1 = toX(c.x);
  const y0 = toY(c.y);
  const y1 = toY(-c.y);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Home in the camera view: fit the camera frame to the viewport (view_center_camera,
 * scale = window / (frame + 4 px) on the tighter side).
 */
export function fitCameraFrame(s: ViewState, data: SceneCameraData, size: ViewportSize): ViewState {
  if (!s.camera) return s;
  const unit: CameraFraming = { zoom: 0, offsetX: 0, offsetY: 0 };
  const r = cameraFrameRect(unit, data, size);
  const fac0 = cameraZoomToFactor(0);
  const xfac = size.width / (r.width + 4);
  const yfac = size.height / (r.height + 4);
  const fac = fac0 * Math.min(xfac, yfac);
  const zoom = Math.min(CAMZOOM_MAX, Math.max(CAMZOOM_MIN, cameraZoomFromFactor(fac)));
  return { ...s, camera: { zoom, offsetX: 0, offsetY: 0 } };
}

