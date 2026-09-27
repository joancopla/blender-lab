/**
 * 3D Viewport navigation keymap (Blender default keymap, left click select).
 * Pure functions: DOM events are reduced to plain inputs before reaching here.
 */
import type { SelectAllAction } from '../operators/select';
import type { TransformKind } from '../operators/transform';
import type { NavAction } from '../viewport/navigator';

/** Preferences > Input. Both off by default, as in Blender. */
export interface InputPrefs {
  readonly emulate3ButtonMouse: boolean;
  readonly emulateNumpad: boolean;
}

export const DEFAULT_INPUT_PREFS: InputPrefs = { emulate3ButtonMouse: false, emulateNumpad: false };

export interface Modifiers {
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

/** A key press. `code` is KeyboardEvent.code (layout and Num Lock independent). */
export interface KeyInput extends Modifiers {
  readonly code: string;
}

interface KeymapItem<A> {
  readonly code: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly action: A;
}

/**
 * Keymap items match modifiers exactly, as Blender does (Shift+Numpad 1 is a
 * different operator, not "Numpad 1").
 * Not bound on purpose (FIDELITY? pending decision): Numpad 9, Ctrl+Numpad 2/4/6/8,
 * Numpad +/-, Shift+Numpad views.
 */
export const VIEW3D_NAVIGATION_KEYMAP: readonly KeymapItem<NavAction>[] = [
  { code: 'Numpad1', action: { type: 'axisView', axis: 'front' } },
  { code: 'Numpad1', ctrl: true, action: { type: 'axisView', axis: 'back' } },
  { code: 'Numpad3', action: { type: 'axisView', axis: 'right' } },
  { code: 'Numpad3', ctrl: true, action: { type: 'axisView', axis: 'left' } },
  { code: 'Numpad7', action: { type: 'axisView', axis: 'top' } },
  { code: 'Numpad7', ctrl: true, action: { type: 'axisView', axis: 'bottom' } },
  { code: 'Numpad5', action: { type: 'toggleProjection' } },
  { code: 'Numpad0', action: { type: 'toggleCamera' } },
  { code: 'NumpadDecimal', action: { type: 'frameSelected' } },
  { code: 'Home', action: { type: 'frameAll' } },
  { code: 'Numpad4', action: { type: 'orbitStep', step: 'left' } },
  { code: 'Numpad6', action: { type: 'orbitStep', step: 'right' } },
  { code: 'Numpad8', action: { type: 'orbitStep', step: 'up' } },
  { code: 'Numpad2', action: { type: 'orbitStep', step: 'down' } },
];

/**
 * Emulate Numpad: the main 1..0 keys act as the numpad ones.
 * FIDELITY? Whether other keys (period, minus, plus) are emulated too.
 */
export function applyNumpadEmulation(code: string, prefs: InputPrefs): string {
  if (!prefs.emulateNumpad) return code;
  const m = /^Digit([0-9])$/.exec(code);
  return m ? `Numpad${m[1]}` : code;
}

export type ObjectModeAction =
  | { readonly type: 'selectAll'; readonly action: SelectAllAction }
  | { readonly type: 'boxSelectModal' }
  | { readonly type: 'transform'; readonly kind: TransformKind }
  | { readonly type: 'clear'; readonly field: 'location' | 'rotation' | 'scale' }
  | { readonly type: 'toggleSidebar' }
  | { readonly type: 'toggleEditMode' }
  | { readonly type: 'toggleXray' };

/** Object Mode keymap (3D Viewport). */
export const OBJECT_MODE_KEYMAP: readonly KeymapItem<ObjectModeAction>[] = [
  { code: 'KeyA', action: { type: 'selectAll', action: 'select' } },
  { code: 'KeyA', alt: true, action: { type: 'selectAll', action: 'deselect' } },
  { code: 'KeyI', ctrl: true, action: { type: 'selectAll', action: 'invert' } },
  { code: 'KeyB', action: { type: 'boxSelectModal' } },
  { code: 'KeyG', action: { type: 'transform', kind: 'translate' } },
  { code: 'KeyR', action: { type: 'transform', kind: 'rotate' } },
  { code: 'KeyS', action: { type: 'transform', kind: 'resize' } },
  { code: 'KeyG', alt: true, action: { type: 'clear', field: 'location' } },
  { code: 'KeyR', alt: true, action: { type: 'clear', field: 'rotation' } },
  { code: 'KeyS', alt: true, action: { type: 'clear', field: 'scale' } },
  { code: 'KeyN', action: { type: 'toggleSidebar' } },
  { code: 'Tab', action: { type: 'toggleEditMode' } },
  { code: 'KeyZ', alt: true, action: { type: 'toggleXray' } },
];

export type EditModeAction =
  | { readonly type: 'selectMode'; readonly kind: 'vert' | 'edge' | 'face'; readonly extend: boolean }
  | { readonly type: 'selectAll'; readonly action: SelectAllAction }
  | { readonly type: 'boxSelectModal' }
  | { readonly type: 'selectLinkedPick' }
  | { readonly type: 'selectLinked' }
  | { readonly type: 'selectMoreLess'; readonly more: boolean }
  | { readonly type: 'transform'; readonly kind: TransformKind }
  | { readonly type: 'extrude' }
  | { readonly type: 'inset' }
  | { readonly type: 'deleteMenu' }
  | { readonly type: 'mergeMenu' }
  | { readonly type: 'fill' }
  | { readonly type: 'loopCut' }
  | { readonly type: 'bevel'; readonly vertices: boolean }
  | { readonly type: 'toggleSidebar' }
  | { readonly type: 'toggleEditMode' }
  | { readonly type: 'toggleXray' };

/**
 * Edit Mode (Mesh) keymap. With Emulate Numpad on, the number row is taken by
 * the views first, so 1 / 2 / 3 do not change the select mode (as in Blender).
 */
export const EDIT_MODE_KEYMAP: readonly KeymapItem<EditModeAction>[] = [
  { code: 'Digit1', action: { type: 'selectMode', kind: 'vert', extend: false } },
  { code: 'Digit2', action: { type: 'selectMode', kind: 'edge', extend: false } },
  { code: 'Digit3', action: { type: 'selectMode', kind: 'face', extend: false } },
  { code: 'Digit1', shift: true, action: { type: 'selectMode', kind: 'vert', extend: true } },
  { code: 'Digit2', shift: true, action: { type: 'selectMode', kind: 'edge', extend: true } },
  { code: 'Digit3', shift: true, action: { type: 'selectMode', kind: 'face', extend: true } },
  { code: 'KeyA', action: { type: 'selectAll', action: 'select' } },
  { code: 'KeyA', alt: true, action: { type: 'selectAll', action: 'deselect' } },
  { code: 'KeyI', ctrl: true, action: { type: 'selectAll', action: 'invert' } },
  { code: 'KeyB', action: { type: 'boxSelectModal' } },
  { code: 'KeyL', action: { type: 'selectLinkedPick' } },
  { code: 'KeyL', ctrl: true, action: { type: 'selectLinked' } },
  { code: 'NumpadAdd', ctrl: true, action: { type: 'selectMoreLess', more: true } },
  { code: 'NumpadSubtract', ctrl: true, action: { type: 'selectMoreLess', more: false } },
  { code: 'KeyG', action: { type: 'transform', kind: 'translate' } },
  { code: 'KeyR', action: { type: 'transform', kind: 'rotate' } },
  { code: 'KeyS', action: { type: 'transform', kind: 'resize' } },
  { code: 'KeyE', action: { type: 'extrude' } },
  { code: 'KeyI', action: { type: 'inset' } },
  { code: 'KeyX', action: { type: 'deleteMenu' } },
  { code: 'Delete', action: { type: 'deleteMenu' } },
  { code: 'KeyM', action: { type: 'mergeMenu' } },
  { code: 'KeyF', action: { type: 'fill' } },
  { code: 'KeyR', ctrl: true, action: { type: 'loopCut' } },
  { code: 'KeyB', ctrl: true, action: { type: 'bevel', vertices: false } },
  { code: 'KeyB', ctrl: true, shift: true, action: { type: 'bevel', vertices: true } },
  { code: 'KeyN', action: { type: 'toggleSidebar' } },
  { code: 'Tab', action: { type: 'toggleEditMode' } },
  { code: 'KeyZ', alt: true, action: { type: 'toggleXray' } },
];

export type ScreenAction = { readonly type: 'undo' } | { readonly type: 'redo' };

/** Screen keymap: works wherever the mouse is. */
export const SCREEN_KEYMAP: readonly KeymapItem<ScreenAction>[] = [
  { code: 'KeyZ', ctrl: true, action: { type: 'undo' } },
  { code: 'KeyZ', ctrl: true, shift: true, action: { type: 'redo' } },
];

export function resolveKey<A>(keymap: readonly KeymapItem<A>[], input: KeyInput, prefs: InputPrefs): A | null {
  const code = applyNumpadEmulation(input.code, prefs);
  const item = keymap.find(
    (k) =>
      k.code === code &&
      !!k.ctrl === input.ctrl &&
      !!k.shift === input.shift &&
      !!k.alt === input.alt,
  );
  return item ? item.action : null;
}

export const resolveNavKey = (input: KeyInput, prefs: InputPrefs): NavAction | null =>
  resolveKey(VIEW3D_NAVIGATION_KEYMAP, input, prefs);

export type DragMode = 'orbit' | 'pan' | 'zoom';

/** MouseEvent.button: 0 left, 1 middle, 2 right. */
export interface ButtonInput extends Modifiers {
  readonly button: number;
}

/**
 * Which navigation a mouse press starts, if any.
 *   MMB: orbit, Shift+MMB: pan, Ctrl+MMB: zoom.
 *   Emulate 3 Button Mouse: Alt+LMB acts as MMB (with the same Shift/Ctrl variants).
 */
export function resolveNavDrag(input: ButtonInput, prefs: InputPrefs): DragMode | null {
  let mods: Modifiers;
  if (input.button === 1) {
    mods = input;
  } else if (input.button === 0 && prefs.emulate3ButtonMouse && input.alt) {
    mods = { ...input, alt: false };
  } else {
    return null;
  }
  if (mods.alt) return null;
  if (!mods.ctrl && !mods.shift) return 'orbit';
  if (mods.shift && !mods.ctrl) return 'pan';
  if (mods.ctrl && !mods.shift) return 'zoom';
  return null;
}

/**
 * Converts wheel events into zoom steps (positive = zoom in, i.e. wheel up).
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
