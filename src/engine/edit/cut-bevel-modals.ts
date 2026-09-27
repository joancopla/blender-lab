/**
 * Modal Loop Cut and Slide (Ctrl+R) and Bevel (Ctrl+B / Ctrl+Shift+B).
 * FIDELITY? Header texts, mouse mapping of the bevel width and of the slide.
 */
import { rotate } from '../math/quat';
import { type Vec3, add, dot, mul, scale, sub, vec3 } from '../math/vec3';
import { loopCutPreview, orientedRing } from '../mesh/ops/loopcut';
import { selectionOf } from '../operators/edit-mode';
import { bevelScene, loopCutScene } from '../operators/edit-tools';
import { NumericInput } from '../operators/numeric-input';
import type { GuideLine, Guides, ModalResult } from '../operators/transform';
import { type MeshObject, type SceneState, meshOf, objectRotation } from '../scene/scene';
import type { ModalOperator } from '../transform-session';
import { type PickContext, pickEdge } from '../viewport/component-picking';
import { worldToScreen } from '../viewport/screen';

const PREVIEW_COLOR = '#ffff00';

const toWorld = (o: MeshObject, p: Vec3) => add(o.location, rotate(objectRotation(o), mul(p, o.scale)));

export interface LoopCutValues {
  readonly objectId: string;
  readonly edge: number;
  readonly cuts: number;
  readonly factor: number;
}

/**
 * Loop Cut and Slide: hover an edge to see the cut (yellow), the wheel changes
 * the number of cuts, a click makes the cut and starts sliding it; a second click
 * confirms, right click leaves the cut centred.
 */
export class LoopCutModal implements ModalOperator {
  readonly operatorName = 'Loop Cut and Slide';
  readonly statusMode = 'loopcut' as const;
  private hover: { objectId: string; edge: number } | null = null;
  private cuts = 1;
  private sliding = false;
  private factor = 0;
  private slide: { x: number; y: number; ux: number; uy: number; half: number } | null = null;

  constructor(
    private readonly ctx: PickContext,
    mouse: { x: number; y: number },
    private readonly onDone?: (v: LoopCutValues) => void,
  ) {
    this.mouseMove(mouse.x, mouse.y);
  }

  private object(): MeshObject | null {
    const o = this.hover && this.ctx.scene.objects.find((x) => x.id === this.hover!.objectId);
    return o?.type === 'mesh' ? o : null;
  }

  get values(): LoopCutValues | null {
    return this.hover ? { ...this.hover, cuts: this.cuts, factor: this.factor } : null;
  }

  get preview(): SceneState {
    const v = this.values;
    if (!this.sliding || !v) return this.ctx.scene;
    return loopCutScene(this.ctx.scene, v.objectId, v.edge, v.cuts, v.factor);
  }

  get header(): string {
    return this.sliding ? `Factor: ${this.factor.toFixed(3)}` : `Number of Cuts: ${this.cuts}`;
  }

  get guides(): Guides | null {
    const o = this.object();
    if (this.sliding || !o || !this.hover) return null;
    const lines: GuideLine[] = loopCutPreview(meshOf(o), this.hover.edge, this.cuts).map(([a, b]) => ({
      a: toWorld(o, a),
      b: toWorld(o, b),
      axis: 0,
      color: PREVIEW_COLOR,
    }));
    return { lines, dashed: null };
  }

  mouseMove(x: number, y: number): void {
    if (!this.sliding) {
      const hit = pickEdge(this.ctx, x, y, 30);
      this.hover = hit ? { objectId: hit.objectId, edge: hit.ref.index } : null;
      return;
    }
    const s = this.slide;
    if (!s || s.half < 1) return;
    const along = (x - s.x) * s.ux + (y - s.y) * s.uy;
    this.factor = Math.max(-1, Math.min(1, along / s.half));
  }

  setModifiers(): void {}

  wheel(steps: number): void {
    if (!this.sliding) this.cuts = Math.max(1, Math.min(100, this.cuts + steps));
  }

  key(code: string): ModalResult {
    if (code === 'Escape') return this.sliding ? this.finish(0) : 'cancel';
    if ((code === 'Enter' || code === 'NumpadEnter') && this.sliding) return this.finish(this.factor);
    return null;
  }

  button(button: number): ModalResult {
    if (button === 2) return this.sliding ? this.finish(0) : 'cancel';
    if (button !== 0) return null;
    if (this.sliding) return this.finish(this.factor);
    if (!this.hover) return null;
    this.startSlide();
    return null;
  }

  private startSlide(): void {
    const o = this.object()!;
    const m = meshOf(o);
    const ring = orientedRing(m, this.hover!.edge);
    const r = ring[0]!;
    const a = worldToScreen(this.ctx.projection, this.ctx.size, toWorld(o, m.verts[r.start]!));
    const b = worldToScreen(this.ctx.projection, this.ctx.size, toWorld(o, m.verts[r.end]!));
    this.sliding = true;
    if (!a || !b) return;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.slide = { x: mid.x, y: mid.y, ux: (b.x - a.x) / (len || 1), uy: (b.y - a.y) / (len || 1), half: len / 2 };
  }

  private finish(factor: number): ModalResult {
    this.factor = factor;
    const v = this.values;
    if (v) this.onDone?.(v);
    return 'confirm';
  }
}

export interface BevelValues {
  readonly width: number;
  readonly segments: number;
  readonly vertices: boolean;
}

/** Centre of the selected vertices (world). */
function selectionCentre(s: SceneState): Vec3 {
  const ids = new Set(s.editObjectIds ?? []);
  let c = vec3(0, 0, 0);
  let n = 0;
  for (const o of s.objects) {
    if (o.type !== 'mesh' || !ids.has(o.id)) continue;
    const m = meshOf(o);
    for (const v of selectionOf(o).verts) {
      c = add(c, toWorld(o, m.verts[v]!));
      n++;
    }
  }
  return n ? scale(c, 1 / n) : c;
}

/**
 * Bevel: moving the mouse towards the selection's centre widens the bevel, the
 * wheel changes the segments, numbers type the width.
 */
export class BevelModal implements ModalOperator {
  readonly operatorName = 'Bevel';
  readonly statusMode = 'bevel' as const;
  private readonly centre: { x: number; y: number };
  private readonly startDist: number;
  private readonly mpp: number;
  private effDist: number;
  private last: { x: number; y: number };
  private segments = 1;
  private shift = false;
  private readonly num = new NumericInput(1);
  /** Last attempt could not bevel the selection. */
  unsupported = false;

  constructor(
    private readonly scene: SceneState,
    ctx: PickContext,
    mouse: { x: number; y: number },
    private readonly vertices: boolean,
    private readonly onDone?: (v: BevelValues) => void,
  ) {
    const c = selectionCentre(scene);
    const sc = worldToScreen(ctx.projection, ctx.size, c);
    this.centre = sc ? { x: sc.x, y: sc.y } : { x: ctx.size.width / 2, y: ctx.size.height / 2 };
    this.startDist = Math.hypot(mouse.x - this.centre.x, mouse.y - this.centre.y);
    this.effDist = this.startDist;
    this.last = { ...mouse };
    const vp = ctx.projection;
    const forward = rotate(vp.rotation, vec3(0, 0, -1));
    const perPixel = (vp.right - vp.left) / ctx.size.width;
    this.mpp = vp.orthographic ? perPixel : perPixel * Math.max(0.01, dot(sub(c, vp.eye), forward));
  }

  static canStart(s: SceneState, vertices: boolean): boolean {
    const ids = new Set(s.editObjectIds ?? []);
    return s.objects.some(
      (o) => o.type === 'mesh' && ids.has(o.id) && (vertices ? selectionOf(o).verts : selectionOf(o).edges).length > 0,
    );
  }

  get values(): BevelValues {
    const width = this.num.active ? this.num.value(0) : Math.max(0, (this.startDist - this.effDist) * this.mpp);
    return { width, segments: this.segments, vertices: this.vertices };
  }

  get preview(): SceneState {
    const v = this.values;
    const r = bevelScene(this.scene, v.width, v.segments, v.vertices);
    this.unsupported = r.unsupported;
    return r.scene;
  }

  get header(): string {
    const v = this.values;
    const w = this.num.active ? this.num.display(0) : `${v.width.toFixed(4)} m`;
    return `Width: ${w}  Segments: ${v.segments}  Profile: 0.500`;
  }

  get guides(): Guides {
    return { lines: [], dashed: { from: this.centre, to: this.last } };
  }

  mouseMove(x: number, y: number): void {
    const d = Math.hypot(x - this.centre.x, y - this.centre.y);
    const prev = Math.hypot(this.last.x - this.centre.x, this.last.y - this.centre.y);
    this.effDist += (d - prev) * (this.shift ? 0.1 : 1);
    this.last = { x, y };
  }

  setModifiers(_ctrl: boolean, shift: boolean): void {
    this.shift = shift;
  }

  wheel(steps: number): void {
    if (!this.vertices) this.segments = Math.max(1, Math.min(100, this.segments + steps));
  }

  key(code: string): ModalResult {
    if (code === 'Enter' || code === 'NumpadEnter') return this.confirm();
    if (code === 'Escape') return 'cancel';
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
