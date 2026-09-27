/**
 * Inset Faces (I) as a modal operator: the mouse sets the thickness (moving
 * towards the selection's centre makes it thicker), numbers make it exact, I
 * toggles Individual. Confirm with LMB/Enter, cancel with RMB/Esc.
 * FIDELITY? Mouse direction and speed, and Blender's full header text (Outset,
 * Boundary, Even Thickness are not replicated).
 */
import { rotate } from '../math/quat';
import { type Vec3, add, dot, mul, scale, sub, vec3 } from '../math/vec3';
import { NumericInput } from '../../../core/input/numeric-input';
import { selectionOf } from '../operators/edit-mode';
import { insetScene } from '../operators/edit-tools';
import type { ModalResult } from '../operators/transform';
import { type SceneState, meshOf, objectRotation } from '../scene/scene';
import type { ModalOperator } from '../transform-session';
import type { ViewportSize } from '../viewport/projection';
import { type ViewProjection, worldToScreen } from '../viewport/screen';

export interface InsetValues {
  readonly thickness: number;
  readonly depth: number;
  readonly individual: boolean;
}

/** Centre of the selected faces (world space). */
function selectionCentre(s: SceneState): Vec3 {
  const ids = new Set(s.editObjectIds ?? []);
  let c = vec3(0, 0, 0);
  let n = 0;
  for (const o of s.objects) {
    if (o.type !== 'mesh' || !ids.has(o.id)) continue;
    const m = meshOf(o);
    const q = objectRotation(o);
    for (const f of selectionOf(o).faces) {
      for (const v of m.faces[f]!) {
        c = add(c, add(o.location, rotate(q, mul(m.verts[v]!, o.scale))));
        n++;
      }
    }
  }
  return n ? scale(c, 1 / n) : c;
}

export class InsetModal implements ModalOperator {
  readonly operatorName = 'Inset Faces';
  readonly statusMode = 'inset' as const;
  readonly guides = null;
  private readonly centre: { x: number; y: number };
  private readonly startDist: number;
  private readonly metresPerPixel: number;
  private individual = false;
  private readonly num = new NumericInput(1);
  private shift = false;
  private lastRaw: { x: number; y: number };
  private effDist: number;

  constructor(
    private readonly scene: SceneState,
    vp: ViewProjection,
    size: ViewportSize,
    mouse: { x: number; y: number },
    private readonly onDone?: (values: InsetValues) => void,
  ) {
    const c = selectionCentre(scene);
    const sc = worldToScreen(vp, size, c);
    this.centre = sc ? { x: sc.x, y: sc.y } : { x: size.width / 2, y: size.height / 2 };
    this.startDist = Math.hypot(mouse.x - this.centre.x, mouse.y - this.centre.y);
    this.effDist = this.startDist;
    this.lastRaw = { ...mouse };
    const forward = rotate(vp.rotation, vec3(0, 0, -1));
    const perPixel = (vp.right - vp.left) / size.width;
    this.metresPerPixel = vp.orthographic ? perPixel : perPixel * Math.max(0.01, dot(sub(c, vp.eye), forward));
  }

  /** Inset needs selected faces. */
  static canStart(s: SceneState): boolean {
    const ids = new Set(s.editObjectIds ?? []);
    return s.objects.some((o) => o.type === 'mesh' && ids.has(o.id) && selectionOf(o).faces.length > 0);
  }

  get values(): InsetValues {
    const thickness = this.num.active ? this.num.value(0) : Math.max(0, (this.startDist - this.effDist) * this.metresPerPixel);
    return { thickness, depth: 0, individual: this.individual };
  }

  get preview(): SceneState {
    return insetScene(this.scene, this.values);
  }

  get header(): string {
    const v = this.values;
    const t = this.num.active ? this.num.display(0) : v.thickness.toFixed(4);
    return `Thickness: ${t}  Depth: ${v.depth.toFixed(4)}  Individual (I): ${v.individual ? 'On' : 'Off'}`;
  }

  mouseMove(x: number, y: number): void {
    const d = Math.hypot(x - this.centre.x, y - this.centre.y);
    const delta = d - Math.hypot(this.lastRaw.x - this.centre.x, this.lastRaw.y - this.centre.y);
    this.effDist += delta * (this.shift ? 0.1 : 1);
    this.lastRaw = { x, y };
  }

  setModifiers(_ctrl: boolean, shift: boolean): void {
    this.shift = shift;
  }

  key(code: string): ModalResult {
    if (code === 'Enter' || code === 'NumpadEnter') return this.confirm();
    if (code === 'Escape') return 'cancel';
    if (code === 'KeyI') {
      this.individual = !this.individual;
      return null;
    }
    this.num.key(code);
    return null;
  }

  button(button: number): ModalResult {
    if (button === 0) return this.confirm();
    if (button === 2) return 'cancel';
    return null;
  }

  private confirm(): ModalResult {
    this.onDone?.(this.values);
    return 'confirm';
  }
}
