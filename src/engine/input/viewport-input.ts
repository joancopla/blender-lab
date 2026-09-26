/**
 * Connects DOM events on the 3D viewport to navigation and selection. Like
 * Blender, viewport keys go to the editor under the mouse pointer; screen keys
 * (undo/redo) work anywhere.
 */
import type { Navigator } from '../viewport/navigator';
import {
  type DragMode,
  type InputPrefs,
  type ObjectModeAction,
  type ScreenAction,
  OBJECT_MODE_KEYMAP,
  SCREEN_KEYMAP,
  VIEW3D_NAVIGATION_KEYMAP,
  WheelAccumulator,
  resolveKey,
  resolveNavDrag,
} from './keymap';
import { type SelectCommand, SelectInteraction } from './select-interaction';

export interface ViewportInputOptions {
  readonly element: HTMLElement;
  readonly navigator: Navigator;
  readonly prefs: () => InputPrefs;
  readonly select: SelectInteraction;
  onSelect(cmd: SelectCommand): void;
  onObjectModeAction(action: ObjectModeAction): void;
  onScreenAction(action: ScreenAction): void;
  /** The selection interaction changed (box, modal state): redraw overlays. */
  onInteractionChange(): void;
}

const modsOf = (e: MouseEvent | KeyboardEvent) => ({ ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey });

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export class ViewportInput {
  private hovered = false;
  private navDrag: { mode: DragMode; pointerId: number; x: number; y: number } | null = null;
  private readonly wheel = new WheelAccumulator();

  constructor(private readonly opts: ViewportInputOptions) {
    const el = opts.element;
    el.addEventListener('pointerenter', () => (this.hovered = true));
    el.addEventListener('pointerleave', () => (this.hovered = false));
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerCancel);
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

  private local(e: MouseEvent): { x: number; y: number } {
    const r = this.opts.element.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private changed(): void {
    this.opts.element.classList.toggle('is-box-modal', this.opts.select.modalWaiting);
    this.opts.onInteractionChange();
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.hovered = true;
    if (e.button === 1) e.preventDefault();
    if (this.navDrag) return;
    const { select } = this.opts;
    const p = this.local(e);
    const mods = modsOf(e);

    // A running selection interaction (e.g. B) owns every button.
    if (!select.busy) {
      const mode = resolveNavDrag({ button: e.button, ...mods }, this.opts.prefs());
      if (mode) {
        e.preventDefault();
        this.navDrag = { mode, pointerId: e.pointerId, x: e.clientX, y: e.clientY };
        this.opts.element.setPointerCapture(e.pointerId);
        return;
      }
    }
    if (select.pointerDown(e.button, mods, p.x, p.y)) {
      e.preventDefault();
      this.opts.element.setPointerCapture(e.pointerId);
      this.changed();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const d = this.navDrag;
    if (d) {
      if (e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      if (dx === 0 && dy === 0) return;
      const nav = this.opts.navigator;
      if (d.mode === 'orbit') nav.dragOrbit(dx, dy);
      else if (d.mode === 'pan') nav.dragPan(dx, dy);
      else nav.dragZoom(dy);
      return;
    }
    if (this.opts.select.busy) {
      const p = this.local(e);
      this.opts.select.pointerMove(p.x, p.y);
      this.changed();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.navDrag) {
      if (e.pointerId !== this.navDrag.pointerId) return;
      this.navDrag = null;
    } else {
      const cmd = this.opts.select.pointerUp(e.button);
      if (cmd) this.opts.onSelect(cmd);
      this.changed();
    }
    if (this.opts.element.hasPointerCapture(e.pointerId)) this.opts.element.releasePointerCapture(e.pointerId);
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.navDrag = null;
    if (this.opts.select.cancel()) this.changed();
    if (this.opts.element.hasPointerCapture(e.pointerId)) this.opts.element.releasePointerCapture(e.pointerId);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.opts.select.busy) return;
    const noMods = !e.ctrlKey && !e.shiftKey && !e.altKey;
    const steps = this.wheel.push(e.deltaY, e.deltaMode, noMods);
    if (steps !== 0) this.opts.navigator.apply({ type: 'zoomSteps', steps });
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTextField(e.target)) return;
    const input = { code: e.code, ...modsOf(e) };
    const prefs = this.opts.prefs();
    const { select } = this.opts;

    if (select.busy) {
      // Modal interactions only listen to Esc (FIDELITY? other keys are ignored).
      if (e.code === 'Escape' && select.cancel()) this.changed();
      e.preventDefault();
      return;
    }

    const screen = resolveKey(SCREEN_KEYMAP, input, prefs);
    if (screen) {
      e.preventDefault();
      this.opts.onScreenAction(screen);
      return;
    }
    if (!this.hovered) return;

    const nav = resolveKey(VIEW3D_NAVIGATION_KEYMAP, input, prefs);
    if (nav) {
      e.preventDefault();
      if (e.repeat && nav.type !== 'orbitStep') return;
      this.opts.navigator.apply(nav);
      return;
    }
    const obj = resolveKey(OBJECT_MODE_KEYMAP, input, prefs);
    if (obj) {
      e.preventDefault();
      if (e.repeat) return;
      if (obj.type === 'boxSelectModal') {
        select.startModal();
        this.changed();
      } else {
        this.opts.onObjectModeAction(obj);
      }
    }
  };
}
