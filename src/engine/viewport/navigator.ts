/**
 * Viewport navigation controller: owns the ViewState, applies navigation
 * actions and runs Smooth View transitions. No DOM and no three.js here.
 */
import { type Quat, nearlyEqualQuat, rotate, slerp } from '../math/quat';
import { type Vec3, add, lerp, nearlyEqual, scale, vec3 } from '../math/vec3';
import type { ViewportSize } from './projection';
import {
  type AxisView,
  type Bounds,
  type CameraFraming,
  type CameraPose,
  type OrbitStep,
  type Projection,
  type SceneCameraData,
  type ViewState,
  defaultViewState,
  fitCameraFrame,
  frameBounds,
  orbit,
  orbitStep,
  pan,
  setAxisView,
  toggleCameraView,
  toggleProjection,
  zoomDrag,
  zoomSteps,
} from './view-state';

/** Preferences > Navigation > Smooth View, in ms. FIDELITY? */
export const SMOOTH_VIEW_MS = 200;

export type NavAction =
  | { type: 'axisView'; axis: AxisView }
  | { type: 'toggleProjection' }
  | { type: 'frameSelected' }
  | { type: 'frameAll' }
  | { type: 'toggleCamera' }
  | { type: 'orbitStep'; step: OrbitStep }
  | { type: 'zoomSteps'; steps: number };

/** What the scene provides to the navigator. */
export interface NavContext {
  size(): ViewportSize;
  cameraPose(): CameraPose | null;
  cameraData(): SceneCameraData | null;
  selectedBounds(): Bounds | null;
  allBounds(): Bounds | null;
  reducedMotion(): boolean;
  now(): number;
}

/** Everything the renderer needs to draw one frame. */
export interface DisplayedView {
  readonly rotation: Quat;
  readonly target: Vec3;
  readonly distance: number;
  readonly projection: Projection;
  readonly camera: CameraFraming | null;
}

interface Pose {
  rotation: Quat;
  target: Vec3;
  distance: number;
}

interface Transition {
  from: Pose;
  to: Pose;
  start: number;
  final: ViewState;
}

function posesEqual(a: Pose, b: Pose): boolean {
  return (
    a.distance === b.distance &&
    nearlyEqual(a.target, b.target, 0) &&
    nearlyEqualQuat(a.rotation, b.rotation, 0)
  );
}

/** Smoothstep easing used by Blender's smooth view. */
export const easeSmoothView = (t: number): number => 3 * t * t - 2 * t * t * t;

export class Navigator {
  private current: ViewState;
  private transition: Transition | null = null;
  private listeners = new Set<() => void>();

  constructor(
    private readonly ctx: NavContext,
    initial: ViewState = defaultViewState(),
  ) {
    this.current = initial;
  }

  /** Logical state (the end state of any running transition). */
  get state(): ViewState {
    return this.current;
  }

  get animating(): boolean {
    return this.transition !== null;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Replaces the state without animation (e.g. when loading a stage). */
  reset(state: ViewState): void {
    this.transition = null;
    this.current = state;
    this.emit();
  }

  apply(action: NavAction): void {
    const s = this.current;
    const cam = this.ctx.cameraPose();
    const size = this.ctx.size();
    switch (action.type) {
      case 'axisView':
        return this.animateTo(setAxisView(s, action.axis));
      case 'toggleProjection':
        return this.jumpTo(toggleProjection(s));
      case 'orbitStep':
        return this.animateTo(orbitStep(s, action.step, s.camera ? cam : null));
      case 'zoomSteps':
        return this.jumpTo(zoomSteps(s, action.steps));
      case 'toggleCamera':
        return this.animateTo(toggleCameraView(s, cam !== null));
      case 'frameSelected': {
        const b = this.ctx.selectedBounds();
        if (!b) return;
        return this.animateTo(frameBounds(s, b, size, s.camera ? cam : null));
      }
      case 'frameAll': {
        const data = this.ctx.cameraData();
        if (s.camera && data) return this.animateTo(fitCameraFrame(s, data, size));
        const b = this.ctx.allBounds();
        if (!b) return;
        return this.animateTo(frameBounds(s, b, size, null));
      }
    }
  }

  /** Continuous mouse navigation: applied immediately, cancelling any transition. */
  dragOrbit(dx: number, dy: number): void {
    const s = this.current;
    this.jumpTo(orbit(s, dx, dy, s.camera ? this.ctx.cameraPose() : null));
  }

  dragPan(dx: number, dy: number): void {
    this.jumpTo(pan(this.current, dx, dy, this.ctx.size(), this.ctx.cameraData()));
  }

  dragZoom(dy: number): void {
    this.jumpTo(zoomDrag(this.current, dy));
  }

  /** Advances the transition. Returns true while more frames are needed. */
  tick(): boolean {
    if (!this.transition) return false;
    if (this.ctx.now() - this.transition.start >= SMOOTH_VIEW_MS) {
      this.transition = null;
      this.emit();
      return false;
    }
    return true;
  }

  /** The view once any transition has ended (what stage checks look at). */
  settled(): DisplayedView {
    return this.poseOf(this.current);
  }

  /** View to draw now, including an in-progress Smooth View transition. */
  displayed(): DisplayedView {
    const tr = this.transition;
    if (!tr) return this.poseOf(this.current);
    const t = Math.min(1, Math.max(0, (this.ctx.now() - tr.start) / SMOOTH_VIEW_MS));
    const k = easeSmoothView(t);
    const final = tr.final;
    return {
      rotation: slerp(tr.from.rotation, tr.to.rotation, k),
      target: lerp(tr.from.target, tr.to.target, k),
      distance: tr.from.distance + (tr.to.distance - tr.from.distance) * k,
      // Entering the camera view happens when the transition ends.
      // FIDELITY? Blender also interpolates the lens.
      projection: final.camera ? 'perspective' : final.projection,
      camera: null,
    };
  }

  private poseOf(s: ViewState): DisplayedView {
    if (s.camera) {
      const cam = this.ctx.cameraPose();
      if (cam) {
        const forward = rotate(cam.rotation, vec3(0, 0, -1));
        return {
          rotation: cam.rotation,
          target: add(cam.location, scale(forward, s.distance)),
          distance: s.distance,
          projection: 'perspective',
          camera: s.camera,
        };
      }
    }
    return { rotation: s.rotation, target: s.target, distance: s.distance, projection: s.projection, camera: null };
  }

  private jumpTo(next: ViewState): void {
    this.transition = null;
    this.current = next;
    this.emit();
  }

  private animateTo(next: ViewState): void {
    const from = this.displayed();
    this.current = next;
    const to = this.poseOf(next);
    // Nothing to animate if the pose does not move, or if only the camera framing changes.
    const bothCamera = from.camera !== null && to.camera !== null;
    if (this.ctx.reducedMotion() || bothCamera || posesEqual(from, to)) {
      this.transition = null;
    } else {
      this.transition = { from, to, start: this.ctx.now(), final: next };
    }
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
