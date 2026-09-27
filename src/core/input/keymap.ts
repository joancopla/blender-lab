/**
 * Program-independent input primitives: modifier state, keymaps declared as
 * data, and mouse wheel normalisation. Each replicated program declares its own
 * keymaps with these types.
 */

export interface Modifiers {
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

/** A key press. `code` is KeyboardEvent.code (layout and Num Lock independent). */
export interface KeyInput extends Modifiers {
  readonly code: string;
}

/** MouseEvent.button: 0 left, 1 middle, 2 right. */
export interface ButtonInput extends Modifiers {
  readonly button: number;
}

/** One keymap entry: a key with exact modifiers and the action it triggers. */
export interface KeymapItem<A> {
  readonly code: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly action: A;
}

/**
 * Finds the action for a key. Modifiers must match exactly (Shift+A is a
 * different entry from A).
 */
export function matchKey<A>(keymap: readonly KeymapItem<A>[], input: KeyInput): A | null {
  const item = keymap.find(
    (k) => k.code === input.code && !!k.ctrl === input.ctrl && !!k.shift === input.shift && !!k.alt === input.alt,
  );
  return item ? item.action : null;
}

/**
 * Converts wheel events into steps (positive = wheel up).
 * A notch of a regular mouse wheel is one step; small trackpad deltas accumulate.
 */
export class WheelAccumulator {
  private acc = 0;
  static readonly PIXELS_PER_STEP = 100;

  /** deltaMode: 0 pixels, 1 lines, 2 pages (WheelEvent.deltaMode). */
  push(deltaY: number, deltaMode: number, noModifiers: boolean): number {
    if (!noModifiers || deltaY === 0) return 0;
    if (deltaMode !== 0 || Math.abs(deltaY) >= WheelAccumulator.PIXELS_PER_STEP / 2) {
      this.acc = 0;
      return -Math.sign(deltaY);
    }
    this.acc += deltaY;
    const steps = Math.trunc(this.acc / WheelAccumulator.PIXELS_PER_STEP);
    this.acc -= steps * WheelAccumulator.PIXELS_PER_STEP;
    return -steps;
  }
}
