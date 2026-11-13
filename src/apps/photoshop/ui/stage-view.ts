/**
 * The document window: the canvas with the composed layers, and over it the
 * transform box with its handles and the lab's targets. It turns pointer input
 * into moves of the box (transform/transform.ts decides what each drag does).
 */
import type { PsController } from '../photoshop-app';
import { type Point, type Quad, dist, pointInQuad, pt, sub } from '../geometry';
import type { Compositor } from '../render/compositor';
import { type Handle, type Modifiers, dragAction, dragQuad, handlePoint } from '../transform/transform';
import { ROTATE_CURSOR } from './icons';

const SVG = 'http://www.w3.org/2000/svg';
/** Room around the document, so there is space to rotate from outside the box. */
const MARGIN = 56;
/** Distance in screen pixels within which a handle is grabbed. */
const GRAB = 8;
const HANDLE = 7;
const HANDLES: readonly Handle[] = ['tl', 'tr', 'br', 'bl', 't', 'r', 'b', 'l'];
const RESIZE_CURSORS = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'] as const;

interface Drag {
  readonly kind: 'box' | 'move';
  readonly handle: Handle;
  readonly from: Point;
  readonly base: Quad | null;
  to: Point;
  moved: boolean;
}

export class StageView {
  readonly element: HTMLElement;
  /** Screen pixels per document pixel. */
  zoom = 1;
  private canvas = document.createElement('canvas');
  private overlay = document.createElementNS(SVG, 'svg');
  private observer: ResizeObserver;
  private origin = pt(0, 0);
  private targets: readonly Quad[] = [];
  private drag: Drag | null = null;
  private mods: Modifiers = { shift: false, alt: false, ctrl: false };
  private frame = 0;
  private docSize = '';
  private readonly onKeys = (e: KeyboardEvent) => this.keys(e);

  constructor(
    private readonly app: PsController,
    private readonly compositor: Compositor,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'ps-stage';
    this.canvas.className = 'ps-canvas';
    this.overlay.classList.add('ps-overlay');
    this.element.append(this.canvas, this.overlay);
    this.observer = new ResizeObserver(() => this.render());
    this.observer.observe(this.element);

    this.element.addEventListener('pointerdown', (e) => this.down(e));
    this.element.addEventListener('pointermove', (e) => this.move(e));
    this.element.addEventListener('pointerup', (e) => this.up(e));
    this.element.addEventListener('pointercancel', (e) => this.up(e));
    this.element.addEventListener('dblclick', (e) => {
      // FIDELITY? Double click inside the box applies the transform.
      if (this.app.session() && this.hit(this.toDoc(e)) === 'inside') this.app.commit();
    });
    this.element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const box = this.app.box();
      if (!box || !pointInQuad(this.toDoc(e), box)) return;
      const root = this.element.closest('.ps')!.getBoundingClientRect();
      this.app.contextMenu(e.clientX - root.left, e.clientY - root.top);
    });
    window.addEventListener('keydown', this.onKeys);
    window.addEventListener('keyup', this.onKeys);
  }

  dispose(): void {
    this.observer.disconnect();
    window.removeEventListener('keydown', this.onKeys);
    window.removeEventListener('keyup', this.onKeys);
    cancelAnimationFrame(this.frame);
  }

  setTargets(targets: readonly Quad[]): void {
    this.targets = targets;
    this.drawOverlay();
  }

  /** Lays the document out and schedules a redraw. */
  render(): void {
    const s = this.app.state();
    const size = `${s.width}x${s.height}`;
    if (size !== this.docSize) {
      this.docSize = size;
      this.canvas.width = s.width;
      this.canvas.height = s.height;
    }
    const area = this.element.getBoundingClientRect();
    const zoom = Math.max(0.05, Math.min(1, (area.width - 2 * MARGIN) / s.width, (area.height - 2 * MARGIN) / s.height));
    const changed = zoom !== this.zoom;
    this.zoom = zoom;
    this.origin = pt(Math.round((area.width - s.width * zoom) / 2), Math.round((area.height - s.height * zoom) / 2));
    Object.assign(this.canvas.style, { left: `${this.origin.x}px`, top: `${this.origin.y}px`, width: `${s.width * zoom}px`, height: `${s.height * zoom}px` });
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const ctx = this.canvas.getContext('2d');
      if (ctx) this.compositor.draw(ctx, s.width, s.height, this.app.state().layers);
    });
    this.drawOverlay();
    if (changed) this.element.dispatchEvent(new CustomEvent('ps-zoom', { bubbles: true }));
  }

  // --- Coordinates -----------------------------------------------------------------

  private toDoc(e: MouseEvent): Point {
    const r = this.element.getBoundingClientRect();
    return pt((e.clientX - r.left - this.origin.x) / this.zoom, (e.clientY - r.top - this.origin.y) / this.zoom);
  }

  private toScreen(p: Point): Point {
    return pt(this.origin.x + p.x * this.zoom, this.origin.y + p.y * this.zoom);
  }

  /** What is under a document point: a handle, the inside of the box or the outside. */
  private hit(p: Point): Handle {
    const box = this.app.box();
    if (!box) return 'outside';
    for (const h of HANDLES) if (dist(handlePoint(box, h), p) * this.zoom <= GRAB) return h;
    return pointInQuad(p, box) ? 'inside' : 'outside';
  }

  // --- Pointer ---------------------------------------------------------------------

  private readMods(e: MouseEvent | KeyboardEvent): void {
    this.mods = { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.readMods(e);
    const p = this.toDoc(e);
    const session = this.app.session();
    if (session) {
      const handle = this.hit(p);
      if (dragAction(session.mode, handle, this.mods) === 'none') return;
      this.drag = { kind: 'box', handle, from: p, to: p, base: session.box, moved: false };
    } else {
      // Move tool: drags the selected layer. FIDELITY? On "Fondo" Photoshop shows a warning.
      const s = this.app.state();
      const active = s.layers.find((l) => l.id === s.activeLayerId);
      if (!active || active.background) return;
      this.drag = { kind: 'move', handle: 'inside', from: p, to: p, base: null, moved: false };
    }
    this.element.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  private move(e: PointerEvent): void {
    this.readMods(e);
    const p = this.toDoc(e);
    if (!this.drag) return this.setCursor(p);
    this.drag.to = p;
    this.drag.moved = true;
    this.applyDrag();
  }

  /** Shows the drag as it is now (also when a modifier key changes mid-drag). */
  private applyDrag(): void {
    const d = this.drag;
    if (!d?.moved) return;
    const session = this.app.session();
    if (d.kind === 'box' && session && d.base) this.app.previewBox(dragQuad(d.base, session.mode, d.handle, d.from, d.to, this.mods));
    else if (d.kind === 'move') this.app.previewMove(this.moveDelta(d));
  }

  /** Shift keeps the Move tool horizontal, vertical or at 45°. */
  private moveDelta(d: Drag): Point {
    const delta = sub(d.to, d.from);
    if (!this.mods.shift) return pt(Math.round(delta.x), Math.round(delta.y));
    const ax = Math.abs(delta.x);
    const ay = Math.abs(delta.y);
    if (ax > 2 * ay) return pt(Math.round(delta.x), 0);
    if (ay > 2 * ax) return pt(0, Math.round(delta.y));
    const m = Math.round((ax + ay) / 2);
    return pt(Math.sign(delta.x) * m, Math.sign(delta.y) * m);
  }

  private up(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (this.element.hasPointerCapture(e.pointerId)) this.element.releasePointerCapture(e.pointerId);
    const session = this.app.session();
    if (d.kind === 'box' && session && d.base) {
      const box = d.moved ? dragQuad(d.base, session.mode, d.handle, d.from, d.to, this.mods) : d.base;
      if (box === d.base) this.app.previewBox(null);
      else this.app.adjustBox(box);
    } else if (d.kind === 'move') {
      const delta = this.moveDelta(d);
      if (d.moved && (delta.x !== 0 || delta.y !== 0)) this.app.commitMove(delta);
      else this.app.previewMove(null);
    }
    this.setCursor(this.toDoc(e));
  }

  private keys(e: KeyboardEvent): void {
    if (e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Control' && e.key !== 'Meta') return;
    this.readMods(e);
    this.applyDrag();
  }

  private setCursor(p: Point): void {
    const session = this.app.session();
    const box = this.app.box();
    if (!session || !box) {
      this.element.style.cursor = 'default';
      return;
    }
    const handle = this.hit(p);
    const action = dragAction(session.mode, handle, this.mods);
    let cursor = 'default';
    if (action === 'rotate') cursor = ROTATE_CURSOR;
    else if (action === 'scale') {
      // The resize arrow that best follows the direction from the centre to the handle.
      const c = handlePoint(box, 'inside');
      const h = handlePoint(box, handle);
      const turn = Math.atan2(h.y - c.y, h.x - c.x);
      cursor = RESIZE_CURSORS[((Math.round(turn / (Math.PI / 4)) % 4) + 4) % 4]!;
    }
    this.element.style.cursor = cursor;
  }

  // --- Overlay ---------------------------------------------------------------------

  private drawOverlay(): void {
    const parts: string[] = [];
    const path = (q: Quad) => q.map((p) => this.toScreen(p)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    // Lab targets (lab style, not Photoshop's).
    for (const q of this.targets) parts.push(`<polygon class="ps-target" points="${path(q)}"/>`);
    const box = this.app.box();
    if (box) {
      parts.push(`<polygon class="ps-box-under" points="${path(box)}"/><polygon class="ps-box" points="${path(box)}"/>`);
      for (const h of HANDLES) {
        const p = this.toScreen(handlePoint(box, h));
        parts.push(`<rect class="ps-handle" x="${(p.x - HANDLE / 2).toFixed(1)}" y="${(p.y - HANDLE / 2).toFixed(1)}" width="${HANDLE}" height="${HANDLE}"/>`);
      }
    }
    this.overlay.innerHTML = parts.join('');
  }
}
