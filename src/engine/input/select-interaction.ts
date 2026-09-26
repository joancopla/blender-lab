/**
 * Selection interaction in the 3D viewport (left click select, Select Box tool):
 *  - LMB click: select (Shift: extend/toggle).
 *  - LMB drag: box select. None: new selection; Shift: extend; Ctrl: subtract.
 *  - B: modal box select. LMB drag: extend; Shift+LMB or MMB drag: subtract;
 *    Esc or RMB: cancel.
 * Pure state machine: it returns commands, the caller runs the operators.
 */
import type { BoxMode } from '../operators/select';
import type { Modifiers } from './keymap';

/** Preferences > Input > Drag Threshold (mouse), in px. */
export const DRAG_THRESHOLD_PX = 3;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type SelectCommand =
  | { readonly type: 'click'; readonly x: number; readonly y: number; readonly extend: boolean }
  | { readonly type: 'box'; readonly rect: Rect; readonly mode: BoxMode };

type State =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pressed'; readonly x0: number; readonly y0: number; readonly mods: Modifiers }
  | {
      readonly kind: 'boxing';
      readonly x0: number;
      readonly y0: number;
      readonly x: number;
      readonly y: number;
      readonly mode: BoxMode;
      readonly button: number;
      readonly modal: boolean;
    }
  | { readonly kind: 'modalWaiting' };

const rectOf = (x0: number, y0: number, x1: number, y1: number): Rect => ({
  x: Math.min(x0, x1),
  y: Math.min(y0, y1),
  width: Math.abs(x1 - x0),
  height: Math.abs(y1 - y0),
});

export class SelectInteraction {
  private state: State = { kind: 'idle' };

  /** True while this interaction owns the mouse (navigation must not start). */
  get busy(): boolean {
    return this.state.kind !== 'idle';
  }

  /** Waiting for the drag after pressing B. */
  get modalWaiting(): boolean {
    return this.state.kind === 'modalWaiting';
  }

  get isModal(): boolean {
    return this.state.kind === 'modalWaiting' || (this.state.kind === 'boxing' && this.state.modal);
  }

  /** Current box rectangle, for drawing. */
  get box(): Rect | null {
    const s = this.state;
    return s.kind === 'boxing' ? rectOf(s.x0, s.y0, s.x, s.y) : null;
  }

  /** B key. */
  startModal(): void {
    if (this.state.kind === 'idle') this.state = { kind: 'modalWaiting' };
  }

  /** Returns true if the press was consumed by the selection interaction. */
  pointerDown(button: number, mods: Modifiers, x: number, y: number): boolean {
    const s = this.state;
    if (s.kind === 'modalWaiting') {
      if (button === 2) {
        this.state = { kind: 'idle' };
        return true;
      }
      if (button === 0 || button === 1) {
        const mode: BoxMode = button === 1 || mods.shift ? 'sub' : 'add';
        this.state = { kind: 'boxing', x0: x, y0: y, x, y, mode, button, modal: true };
        return true;
      }
      return true;
    }
    if (s.kind === 'boxing') {
      if (button === 2) this.state = { kind: 'idle' };
      return true;
    }
    if (s.kind === 'idle' && button === 0) {
      this.state = { kind: 'pressed', x0: x, y0: y, mods };
      return true;
    }
    return false;
  }

  pointerMove(x: number, y: number): void {
    const s = this.state;
    if (s.kind === 'pressed') {
      if (Math.hypot(x - s.x0, y - s.y0) < DRAG_THRESHOLD_PX) return;
      const mode: BoxMode = s.mods.ctrl && !s.mods.shift ? 'sub' : s.mods.shift && !s.mods.ctrl ? 'add' : 'set';
      this.state = { kind: 'boxing', x0: s.x0, y0: s.y0, x, y, mode, button: 0, modal: false };
    } else if (s.kind === 'boxing') {
      this.state = { ...s, x, y };
    }
  }

  pointerUp(button: number): SelectCommand | null {
    const s = this.state;
    if (s.kind === 'pressed' && button === 0) {
      this.state = { kind: 'idle' };
      // FIDELITY? Ctrl+click does nothing here.
      if (s.mods.ctrl || s.mods.alt) return null;
      return { type: 'click', x: s.x0, y: s.y0, extend: s.mods.shift };
    }
    if (s.kind === 'boxing' && button === s.button) {
      this.state = { kind: 'idle' };
      return { type: 'box', rect: rectOf(s.x0, s.y0, s.x, s.y), mode: s.mode };
    }
    return null;
  }

  /** Esc. Returns true if something was cancelled. */
  cancel(): boolean {
    if (this.state.kind === 'idle') return false;
    this.state = { kind: 'idle' };
    return true;
  }
}
