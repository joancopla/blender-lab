import { describe, expect, it } from 'vitest';
import { describeKey, describeMouse } from './key-names';

const NO = { ctrl: false, shift: false, alt: false };

describe('key overlay names', () => {
  it('uses Blender key names', () => {
    expect(describeKey('KeyG', NO)).toBe('G');
    expect(describeKey('Numpad1', { ...NO, ctrl: true })).toBe('Ctrl + Numpad 1');
    expect(describeKey('NumpadDecimal', NO)).toBe('Numpad .');
    expect(describeKey('KeyZ', { ctrl: true, shift: true, alt: false })).toBe('Ctrl + Shift + Z');
    expect(describeKey('Escape', NO)).toBe('Esc');
  });

  it('shows modifiers pressed alone without repeating them', () => {
    expect(describeKey('ShiftLeft', { ...NO, shift: true })).toBe('Shift');
    expect(describeKey('ControlLeft', { ctrl: true, shift: true, alt: false })).toBe('Shift + Ctrl');
  });

  it('ignores keys without a name', () => {
    expect(describeKey('CapsLock', NO)).toBeNull();
  });

  it('describes mouse actions in Catalan', () => {
    expect(describeMouse('middle', NO)).toBe('Botó del mig');
    expect(describeMouse('left', { ...NO, alt: true })).toBe('Alt + Clic esquerre');
  });
});
