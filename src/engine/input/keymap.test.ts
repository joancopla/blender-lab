import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INPUT_PREFS,
  type InputPrefs,
  WheelAccumulator,
  resolveNavDrag,
  resolveNavKey,
} from './keymap';

const key = (code: string, mods: Partial<{ ctrl: boolean; shift: boolean; alt: boolean }> = {}) => ({
  code,
  ctrl: false,
  shift: false,
  alt: false,
  ...mods,
});
const btn = (button: number, mods: Partial<{ ctrl: boolean; shift: boolean; alt: boolean }> = {}) => ({
  button,
  ctrl: false,
  shift: false,
  alt: false,
  ...mods,
});
const EMU: InputPrefs = { emulate3ButtonMouse: true, emulateNumpad: true };

describe('navigation keys', () => {
  it('numpad views, Ctrl for the opposite side', () => {
    expect(resolveNavKey(key('Numpad1'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'axisView', axis: 'front' });
    expect(resolveNavKey(key('Numpad1', { ctrl: true }), DEFAULT_INPUT_PREFS)).toEqual({
      type: 'axisView',
      axis: 'back',
    });
    expect(resolveNavKey(key('Numpad3'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'axisView', axis: 'right' });
    expect(resolveNavKey(key('Numpad7', { ctrl: true }), DEFAULT_INPUT_PREFS)).toEqual({
      type: 'axisView',
      axis: 'bottom',
    });
  });

  it('other navigation keys', () => {
    expect(resolveNavKey(key('Numpad5'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'toggleProjection' });
    expect(resolveNavKey(key('Numpad0'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'toggleCamera' });
    expect(resolveNavKey(key('NumpadDecimal'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'frameSelected' });
    expect(resolveNavKey(key('Home'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'frameAll' });
    expect(resolveNavKey(key('Numpad8'), DEFAULT_INPUT_PREFS)).toEqual({ type: 'orbitStep', step: 'up' });
  });

  it('modifiers must match exactly', () => {
    expect(resolveNavKey(key('Numpad1', { shift: true }), DEFAULT_INPUT_PREFS)).toBeNull();
    expect(resolveNavKey(key('Home', { alt: true }), DEFAULT_INPUT_PREFS)).toBeNull();
  });

  it('number row does nothing unless Emulate Numpad is on', () => {
    expect(resolveNavKey(key('Digit1'), DEFAULT_INPUT_PREFS)).toBeNull();
    expect(resolveNavKey(key('Digit1'), EMU)).toEqual({ type: 'axisView', axis: 'front' });
    expect(resolveNavKey(key('Digit7', { ctrl: true }), EMU)).toEqual({ type: 'axisView', axis: 'bottom' });
    expect(resolveNavKey(key('Digit5'), EMU)).toEqual({ type: 'toggleProjection' });
    // The real numpad keeps working with the emulation on.
    expect(resolveNavKey(key('Numpad3'), EMU)).toEqual({ type: 'axisView', axis: 'right' });
  });
});

describe('navigation drags', () => {
  it('middle mouse button', () => {
    expect(resolveNavDrag(btn(1), DEFAULT_INPUT_PREFS)).toBe('orbit');
    expect(resolveNavDrag(btn(1, { shift: true }), DEFAULT_INPUT_PREFS)).toBe('pan');
    expect(resolveNavDrag(btn(1, { ctrl: true }), DEFAULT_INPUT_PREFS)).toBe('zoom');
    expect(resolveNavDrag(btn(1, { ctrl: true, shift: true }), DEFAULT_INPUT_PREFS)).toBeNull();
  });

  it('Alt+LMB only navigates with Emulate 3 Button Mouse', () => {
    expect(resolveNavDrag(btn(0, { alt: true }), DEFAULT_INPUT_PREFS)).toBeNull();
    expect(resolveNavDrag(btn(0, { alt: true }), EMU)).toBe('orbit');
    expect(resolveNavDrag(btn(0, { alt: true, shift: true }), EMU)).toBe('pan');
    expect(resolveNavDrag(btn(0, { alt: true, ctrl: true }), EMU)).toBe('zoom');
    expect(resolveNavDrag(btn(0), EMU)).toBeNull();
    expect(resolveNavDrag(btn(2, { alt: true }), EMU)).toBeNull();
  });
});

describe('wheel', () => {
  it('one mouse notch is one step; wheel up zooms in', () => {
    const w = new WheelAccumulator();
    expect(w.push(-100, 0, true)).toBe(1);
    expect(w.push(100, 0, true)).toBe(-1);
    expect(w.push(3, 1, true)).toBe(-1);
  });

  it('accumulates small trackpad deltas', () => {
    const w = new WheelAccumulator();
    expect(w.push(-30, 0, true)).toBe(0);
    expect(w.push(-30, 0, true)).toBe(0);
    expect(w.push(-45, 0, true)).toBe(1);
  });

  it('ignores the wheel with modifiers', () => {
    expect(new WheelAccumulator().push(-100, 0, false)).toBe(0);
  });
});
