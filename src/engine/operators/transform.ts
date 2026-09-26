/**
 * Modal transform operators: Grab/Move (G), Rotate (R) and Resize/Scale (S),
 * applied to every selected object around the Median Point.
 *
 * Pure state machine: it is fed mouse positions, modifier state and keys, and
 * exposes the preview scene, the header text and the guides to draw. Confirming
 * returns the final scene; the caller records it as one undo step.
 */
import { quatToEulerXYZ } from '../math/euler';
import { DEG, type Quat, fromAxisAngle, mulQuat, rotate } from '../math/quat';
import { type Vec3, add, dot, length, scale, sub, vec3 } from '../math/vec3';
import { type SceneObject, type SceneState, objectRotation, selectedObjects } from '../scene/scene';
import type { ViewportSize } from '../viewport/projection';
import { type ViewProjection, worldToScreen } from '../viewport/screen';
import { NumericInput } from './numeric-input';

export type TransformKind = 'translate' | 'rotate' | 'resize';
export type AxisIndex = 0 | 1 | 2;

export interface Constraint {
  readonly space: 'global' | 'local';
  /** 'axis': move along one axis. 'plane': exclude one axis (Shift+X/Y/Z). */
  readonly kind: 'axis' | 'plane';
  readonly axis: AxisIndex;
}

export interface GuideLine {
  /** World-space segment (long enough to cross the view). */
  readonly a: Vec3;
  readonly b: Vec3;
  readonly axis: AxisIndex;
}

export interface Guides {
  readonly lines: readonly GuideLine[];
  /** Dashed line from the pivot to the mouse (Rotate and Resize), screen px. */
  readonly dashed: { readonly from: { x: number; y: number }; readonly to: { x: number; y: number } } | null;
}

export type ModalResult = 'confirm' | 'cancel' | null;

/**
 * Increments with Ctrl (and finer ones with Ctrl+Shift).
 * FIDELITY? Blender's translation increment depends on the grid scale of the view.
 */
export const SNAP = {
  translate: { normal: 1, fine: 0.1 },
  rotate: { normal: 5, fine: 1 },
  resize: { normal: 0.1, fine: 0.01 },
} as const;

/** Shift slows the mouse down to this fraction (precision mode). */
export const PRECISION_FACTOR = 0.1;

export const OPERATOR_NAMES: Record<TransformKind, string> = {
  translate: 'Move',
  rotate: 'Rotate',
  resize: 'Resize',
};

const AXES: readonly Vec3[] = [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)];
const AXIS_LETTER = ['X', 'Y', 'Z'] as const;
const GUIDE_HALF_LENGTH = 10000;

const snapTo = (v: number, step: number) => Math.round(v / step) * step;
const fmt4 = (v: number) => (Object.is(v, -0) ? 0 : v).toFixed(4);

/** Median Point: average of the selected objects' origins. */
export function medianPoint(objects: readonly SceneObject[]): Vec3 {
  let p = vec3(0, 0, 0);
  for (const o of objects) p = add(p, o.location);
  return scale(p, 1 / Math.max(1, objects.length));
}

function withRotation(o: SceneObject, delta: Quat): Vec3 {
  const q = mulQuat(delta, objectRotation(o));
  const old = vec3(o.rotationDeg.x * DEG, o.rotationDeg.y * DEG, o.rotationDeg.z * DEG);
  const e = quatToEulerXYZ(q, old);
  return vec3(e.x / DEG, e.y / DEG, e.z / DEG);
}

export class TransformModal {
  readonly operatorName: string;
  private readonly objects: readonly SceneObject[];
  private readonly pivot: Vec3;
  private readonly pivotScreen: { x: number; y: number };
  private readonly start: { x: number; y: number };
  private raw: { x: number; y: number };
  private eff: { x: number; y: number };
  private ctrl = false;
  private shift = false;
  private constraintState: Constraint | null = null;
  private num = new NumericInput(3);
  /** Rotate: accumulated mouse angle around the pivot (radians, counter-clockwise on screen). */
  private angle = 0;

  constructor(
    readonly kind: TransformKind,
    private readonly scene: SceneState,
    private readonly vp: ViewProjection,
    private readonly size: ViewportSize,
    mouse: { x: number; y: number },
  ) {
    this.operatorName = OPERATOR_NAMES[kind];
    this.objects = selectedObjects(scene);
    this.pivot = medianPoint(this.objects);
    const ps = worldToScreen(vp, size, this.pivot);
    this.pivotScreen = ps ? { x: ps.x, y: ps.y } : { x: size.width / 2, y: size.height / 2 };
    this.start = { ...mouse };
    this.raw = { ...mouse };
    this.eff = { ...mouse };
  }

  /** G/R/S do nothing without a selection. */
  static canStart(scene: SceneState): boolean {
    return scene.selectedIds.length > 0;
  }

  get constraint(): Constraint | null {
    return this.constraintState;
  }

  // -------------------------------------------------------------------------
  // Input

  mouseMove(x: number, y: number): void {
    const k = this.shift ? PRECISION_FACTOR : 1;
    const dx = (x - this.raw.x) * k;
    const dy = (y - this.raw.y) * k;
    const prev = this.eff;
    this.raw = { x, y };
    this.eff = { x: prev.x + dx, y: prev.y + dy };
    if (this.kind === 'rotate') {
      const a0 = Math.atan2(-(prev.y - this.pivotScreen.y), prev.x - this.pivotScreen.x);
      const a1 = Math.atan2(-(this.eff.y - this.pivotScreen.y), this.eff.x - this.pivotScreen.x);
      let d = a1 - a0;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      this.angle += d;
    }
  }

  setModifiers(ctrl: boolean, shift: boolean): void {
    this.ctrl = ctrl;
    this.shift = shift;
  }

  /** Keyboard. Returns 'confirm' / 'cancel' when the operator ends. */
  key(code: string, shift: boolean): ModalResult {
    if (code === 'Enter' || code === 'NumpadEnter') return 'confirm';
    if (code === 'Escape') return 'cancel';
    const axis = code === 'KeyX' ? 0 : code === 'KeyY' ? 1 : code === 'KeyZ' ? 2 : null;
    if (axis !== null) {
      this.toggleConstraint(axis, shift ? 'plane' : 'axis');
      return null;
    }
    this.num.key(code);
    return null;
  }

  /** Mouse button pressed during the operator. */
  button(button: number): ModalResult {
    if (button === 0) return 'confirm';
    if (button === 2) return 'cancel';
    if (button === 1) this.autoConstraint();
    return null;
  }

  /**
   * X, X, X: global axis -> local axis -> no constraint (same for Shift+X planes).
   * Changing to another axis starts again at global.
   */
  private toggleConstraint(axis: AxisIndex, kind: 'axis' | 'plane'): void {
    const c = this.constraintState;
    if (c && c.axis === axis && c.kind === kind) {
      this.constraintState = c.space === 'global' ? { ...c, space: 'local' } : null;
    } else {
      this.constraintState = { space: 'global', kind, axis };
    }
  }

  /**
   * Middle click: constrain to the global axis closest to the mouse movement on screen.
   * FIDELITY? Blender picks the axis while the middle button is held.
   */
  private autoConstraint(): void {
    const mx = this.eff.x - this.start.x;
    const my = this.eff.y - this.start.y;
    const len = Math.hypot(mx, my);
    if (len < 1) return;
    let best: AxisIndex = 0;
    let bestCos = -1;
    for (const i of [0, 1, 2] as const) {
      const s = this.screenDir(this.pivot, AXES[i]!);
      const sl = Math.hypot(s.x, s.y);
      if (sl < 1e-6) continue;
      const c = Math.abs((s.x * mx + s.y * my) / (sl * len));
      if (c > bestCos) {
        bestCos = c;
        best = i;
      }
    }
    this.constraintState = { space: 'global', kind: 'axis', axis: best };
  }

  // -------------------------------------------------------------------------
  // Maths helpers

  /** Screen movement (px) produced by moving 1 m along `dir` from `p`. */
  private screenDir(p: Vec3, dir: Vec3): { x: number; y: number } {
    const a = worldToScreen(this.vp, this.size, p);
    const b = worldToScreen(this.vp, this.size, add(p, dir));
    if (!a || !b) return { x: 0, y: 0 };
    return { x: b.x - a.x, y: b.y - a.y };
  }

  private metresPerPixelAtPivot(): number {
    const perPixel = (this.vp.right - this.vp.left) / this.size.width;
    if (this.vp.orthographic) return perPixel;
    const forward = rotate(this.vp.rotation, vec3(0, 0, -1));
    return perPixel * Math.max(0.01, dot(sub(this.pivot, this.vp.eye), forward));
  }

  private axisFor(o: SceneObject, i: AxisIndex): Vec3 {
    const c = this.constraintState;
    return c?.space === 'local' ? rotate(objectRotation(o), AXES[i]!) : AXES[i]!;
  }

  private get towardViewer(): Vec3 {
    return rotate(this.vp.rotation, vec3(0, 0, 1));
  }

  private freeAxes(): [AxisIndex, AxisIndex] {
    const n = this.constraintState!.axis;
    return n === 0 ? [1, 2] : n === 1 ? [0, 2] : [0, 1];
  }

  // -------------------------------------------------------------------------
  // Translate

  /** Translation of one object, in world space. */
  private translation(o: SceneObject): Vec3 {
    const c = this.constraintState;
    const step = this.shift ? SNAP.translate.fine : SNAP.translate.normal;
    if (this.num.active) {
      if (!c) return vec3(this.num.value(0), this.num.value(1), this.num.value(2));
      if (c.kind === 'axis') return scale(this.axisFor(o, c.axis), this.num.value(0));
      const [a, b] = this.freeAxes();
      return add(scale(this.axisFor(o, a), this.num.value(0)), scale(this.axisFor(o, b), this.num.value(1)));
    }
    const dx = this.eff.x - this.start.x;
    const dy = this.eff.y - this.start.y;
    const mpp = this.metresPerPixelAtPivot();
    const right = rotate(this.vp.rotation, vec3(1, 0, 0));
    const up = rotate(this.vp.rotation, vec3(0, 1, 0));
    const inView = add(scale(right, dx * mpp), scale(up, -dy * mpp));

    if (c?.kind === 'axis') {
      const axis = this.axisFor(o, c.axis);
      const s = this.screenDir(this.pivot, axis);
      const s2 = s.x * s.x + s.y * s.y;
      // Axis pointing at the viewer: fall back to vertical mouse movement.
      let d = s2 > 1e-6 ? (dx * s.x + dy * s.y) / s2 : -dy * mpp;
      if (this.ctrl) d = snapTo(d, step);
      return scale(axis, d);
    }

    let t = inView;
    if (c?.kind === 'plane') {
      // Project the view-plane movement onto the plane, along the view direction.
      const n = this.axisFor(o, c.axis);
      const f = this.towardViewer;
      const fn = dot(f, n);
      t = Math.abs(fn) > 1e-3 ? sub(t, scale(f, dot(t, n) / fn)) : sub(t, scale(n, dot(t, n)));
    }
    if (this.ctrl) t = vec3(snapTo(t.x, step), snapTo(t.y, step), snapTo(t.z, step));
    return t;
  }

  // -------------------------------------------------------------------------
  // Rotate

  /** Rotation angle in degrees as typed or from the mouse (before the axis sign). */
  private rotationDegrees(): number {
    if (this.num.active) return this.num.value(0);
    let deg = this.angle / DEG;
    if (this.ctrl) deg = snapTo(deg, this.shift ? SNAP.rotate.fine : SNAP.rotate.normal);
    return deg;
  }

  private rotationFor(o: SceneObject): Quat {
    const c = this.constraintState;
    const deg = this.rotationDegrees();
    // Shift+X during rotate behaves like X: rotation around the plane's normal. FIDELITY?
    if (!c) return fromAxisAngle(this.towardViewer, deg * DEG);
    const axis = this.axisFor(o, c.axis);
    if (this.num.active) return fromAxisAngle(axis, deg * DEG);
    // With the mouse, the object follows the mouse around the pivot on screen.
    const sign = dot(axis, this.towardViewer) < 0 ? -1 : 1;
    return fromAxisAngle(axis, sign * deg * DEG);
  }

  // -------------------------------------------------------------------------
  // Resize

  private resizeFactor(): number {
    if (this.num.active) return this.num.value(0, 1);
    const p = this.pivotScreen;
    const v0 = { x: this.start.x - p.x, y: this.start.y - p.y };
    const v1 = { x: this.eff.x - p.x, y: this.eff.y - p.y };
    const l0 = Math.hypot(v0.x, v0.y);
    if (l0 < 1) return 1;
    let f = Math.hypot(v1.x, v1.y) / l0;
    // Crossing over the pivot flips the scale. FIDELITY?
    if (v0.x * v1.x + v0.y * v1.y < 0) f = -f;
    if (this.ctrl) f = snapTo(f, this.shift ? SNAP.resize.fine : SNAP.resize.normal);
    return f;
  }

  /** Applies the resize to a vector expressed relative to the pivot. */
  private resizeVector(o: SceneObject, v: Vec3, f: number): Vec3 {
    const c = this.constraintState;
    if (!c) return scale(v, f);
    const scaleAlong = (vec: Vec3, axis: Vec3) => add(vec, scale(axis, (f - 1) * dot(vec, axis)));
    if (c.kind === 'axis') return scaleAlong(v, this.axisFor(o, c.axis));
    const [a, b] = this.freeAxes();
    return scaleAlong(scaleAlong(v, this.axisFor(o, a)), this.axisFor(o, b));
  }

  private resizedScale(o: SceneObject, f: number): Vec3 {
    const c = this.constraintState;
    const s = [o.scale.x, o.scale.y, o.scale.z];
    if (c?.space === 'local') {
      const hit = c.kind === 'axis' ? [c.axis] : this.freeAxes();
      for (const i of hit) s[i] = s[i]! * f;
      return vec3(s[0]!, s[1]!, s[2]!);
    }
    // Global: scale of each local axis after the global resize (shear is dropped, as in Blender).
    const q = objectRotation(o);
    const out = AXES.map((e, i) => {
      const axis = rotate(q, e);
      const v = this.resizeVector(o, axis, f);
      const sign = dot(v, axis) < 0 ? -1 : 1;
      return s[i]! * length(v) * sign;
    });
    return vec3(out[0]!, out[1]!, out[2]!);
  }

  // -------------------------------------------------------------------------
  // Output

  /** Scene with the current transform applied (not recorded in the undo history). */
  get preview(): SceneState {
    const byId = new Map<string, SceneObject>();
    const f = this.kind === 'resize' ? this.resizeFactor() : 1;
    for (const o of this.objects) {
      let next: SceneObject;
      if (this.kind === 'translate') {
        next = { ...o, location: add(o.location, this.translation(o)) };
      } else if (this.kind === 'rotate') {
        const r = this.rotationFor(o);
        next = {
          ...o,
          location: add(this.pivot, rotate(r, sub(o.location, this.pivot))),
          rotationDeg: withRotation(o, r),
        };
      } else {
        next = {
          ...o,
          location: add(this.pivot, this.resizeVector(o, sub(o.location, this.pivot), f)),
          scale: this.resizedScale(o, f),
        };
      }
      byId.set(o.id, next);
    }
    return { ...this.scene, objects: this.scene.objects.map((o) => byId.get(o.id) ?? o) };
  }

  /** Original scene, restored exactly on cancel. */
  get original(): SceneState {
    return this.scene;
  }

  /**
   * Viewport header text while the operator runs.
   * FIDELITY? Exact wording, spacing and number format of Blender 5.2.
   */
  get header(): string {
    const c = this.constraintState;
    const where = c
      ? c.kind === 'axis'
        ? ` along ${c.space} ${AXIS_LETTER[c.axis]}`
        : ` locking ${c.space} ${AXIS_LETTER[c.axis]}`
      : '';
    const n = this.num;
    const first = this.objects[0];
    if (this.kind === 'translate') {
      const t = first ? this.translation(first) : vec3(0, 0, 0);
      const len = length(t);
      if (c?.kind === 'axis') {
        const d = first ? dot(t, this.axisFor(first, c.axis)) : 0;
        const shown = n.active ? n.display(0) : `${fmt4(d)} m`;
        return `D: ${shown} (${fmt4(len)} m)${where}`;
      }
      if (c?.kind === 'plane') {
        const [a, b] = this.freeAxes();
        const da = first ? dot(t, this.axisFor(first, a)) : 0;
        const db = first ? dot(t, this.axisFor(first, b)) : 0;
        const sa = n.active ? n.display(0) : `${fmt4(da)} m`;
        const sb = n.active ? n.display(1) : `${fmt4(db)} m`;
        return `D${AXIS_LETTER[a].toLowerCase()}: ${sa}  D${AXIS_LETTER[b].toLowerCase()}: ${sb} (${fmt4(len)} m)${where}`;
      }
      const comp = (i: number, v: number) => (n.active ? n.display(i) : `${fmt4(v)} m`);
      return `Dx: ${comp(0, t.x)}  Dy: ${comp(1, t.y)}  Dz: ${comp(2, t.z)} (${fmt4(len)} m)`;
    }
    if (this.kind === 'rotate') {
      const shown = n.active ? n.display(0) : `${this.rotationDegrees().toFixed(2)}°`;
      return `Rot: ${shown}${where}`;
    }
    const f = this.resizeFactor();
    if (c?.kind === 'axis') return `Scale: ${n.active ? n.display(0) : fmt4(f)}${where}`;
    const shown = n.active ? n.display(0) : fmt4(f);
    const comps = [0, 1, 2].map((i) => (!c || i !== c.axis ? shown : fmt4(1)));
    return `Scale X: ${comps[0]}  Y: ${comps[1]}  Z: ${comps[2]}${where}`;
  }

  get guides(): Guides {
    const c = this.constraintState;
    const lines: GuideLine[] = [];
    if (c) {
      const axes: AxisIndex[] = c.kind === 'axis' ? [c.axis] : this.freeAxes();
      const origins = c.space === 'local' ? this.objects.map((o) => ({ o, p: o.location })) : [{ o: this.objects[0]!, p: this.pivot }];
      for (const { o, p } of origins) {
        if (!o) continue;
        for (const i of axes) {
          const d = scale(this.axisFor(o, i), GUIDE_HALF_LENGTH);
          lines.push({ a: sub(p, d), b: add(p, d), axis: i });
        }
      }
    }
    const dashed = this.kind === 'translate' ? null : { from: this.pivotScreen, to: this.raw };
    return { lines, dashed };
  }
}
