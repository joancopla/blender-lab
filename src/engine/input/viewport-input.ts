/**
 * Connects DOM events on the 3D viewport to the navigator. Like Blender, keys
 * go to the editor under the mouse pointer.
 */
import type { Navigator } from '../viewport/navigator';
import { type DragMode, type InputPrefs, WheelAccumulator, resolveNavDrag, resolveNavKey } from './keymap';

export interface ViewportInputOptions {
  readonly element: HTMLElement;
  readonly navigator: Navigator;
  readonly prefs: () => InputPrefs;
}

const modsOf = (e: MouseEvent | KeyboardEvent) => ({ ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey });

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export class ViewportInput {
  private hovered = false;
  private drag: { mode: DragMode; pointerId: number; x: number; y: number } | null = null;
  private readonly wheel = new WheelAccumulator();

  constructor(private readonly opts: ViewportInputOptions) {
    const el = opts.element;
    el.addEventListener('pointerenter', () => (this.hovered = true));
    el.addEventListener('pointerleave', () => (this.hovered = false));
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    // Middle click would start the browser's autoscroll; right click its menu.
    el.addEventListener('mousedown', (e) => e.button === 1 && e.preventDefault());
    el.addEventListener('auxclick', (e) => e.preventDefault());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    // Not passive: Ctrl+wheel would zoom the whole page.
    el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    // Firefox focuses its menu bar on a lone Alt release.
    window.addEventListener('keyup', (e) => this.hovered && e.key === 'Alt' && e.preventDefault());
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.hovered = true;
    const mode = resolveNavDrag({ button: e.button, ...modsOf(e) }, this.opts.prefs());
    if (e.button === 1 || mode) e.preventDefault();
    if (!mode || this.drag) return;
    this.drag = { mode, pointerId: e.pointerId, x: e.clientX, y: e.clientY };
    this.opts.element.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    if (dx === 0 && dy === 0) return;
    const nav = this.opts.navigator;
    if (d.mode === 'orbit') nav.dragOrbit(dx, dy);
    else if (d.mode === 'pan') nav.dragPan(dx, dy);
    else nav.dragZoom(dy);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.drag = null;
    if (this.opts.element.hasPointerCapture(e.pointerId)) this.opts.element.releasePointerCapture(e.pointerId);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const noMods = !e.ctrlKey && !e.shiftKey && !e.altKey;
    const steps = this.wheel.push(e.deltaY, e.deltaMode, noMods);
    if (steps !== 0) this.opts.navigator.apply({ type: 'zoomSteps', steps });
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.hovered || isTextField(e.target)) return;
    const action = resolveNavKey({ code: e.code, ...modsOf(e) }, this.opts.prefs());
    if (!action) return;
    e.preventDefault();
    if (e.repeat && action.type !== 'orbitStep') return;
    this.opts.navigator.apply(action);
  };
}
