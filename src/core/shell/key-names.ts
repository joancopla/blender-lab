/**
 * Names for the key overlay. Keys use Blender's names (what the student will
 * read in Blender and in tutorials); mouse actions are lab texts in Catalan.
 */
import { t } from '../i18n';

export interface Mods {
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

const SPECIAL: Record<string, string> = {
  Escape: 'Esc',
  Enter: 'Enter',
  NumpadEnter: 'Numpad Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Space: 'Space',
  Home: 'Home',
  Delete: 'Delete',
  Minus: '-',
  Period: '.',
  Comma: ',',
  NumpadDecimal: 'Numpad .',
  NumpadSubtract: 'Numpad -',
  NumpadAdd: 'Numpad +',
  NumpadMultiply: 'Numpad *',
  NumpadDivide: 'Numpad /',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'AltGraph']);

/** Name of a key without modifiers, or null for keys not worth showing. */
export function keyName(code: string): string | null {
  if (SPECIAL[code]) return SPECIAL[code]!;
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1]!;
  m = /^Digit([0-9])$/.exec(code);
  if (m) return m[1]!;
  m = /^Numpad([0-9])$/.exec(code);
  if (m) return `Numpad ${m[1]}`;
  m = /^F([0-9]{1,2})$/.exec(code);
  if (m) return code;
  return null;
}

const modPrefix = (m: Mods, except: string | null = null) =>
  [m.ctrl && except !== 'Ctrl' ? 'Ctrl' : '', m.shift && except !== 'Shift' ? 'Shift' : '', m.alt && except !== 'Alt' ? 'Alt' : '']
    .filter(Boolean)
    .join(' + ');

/** "Ctrl + Z", "Shift", "Numpad 1"... null for keys that are not shown. */
export function describeKey(code: string, mods: Mods): string | null {
  if (MODIFIER_CODES.has(code)) {
    const self = code.startsWith('Control') ? 'Ctrl' : code.startsWith('Shift') ? 'Shift' : 'Alt';
    const others = modPrefix(mods, self);
    return others ? `${others} + ${self}` : self;
  }
  const name = keyName(code);
  if (!name) return null;
  const prefix = modPrefix(mods);
  return prefix ? `${prefix} + ${name}` : name;
}

export type MouseAction = 'left' | 'middle' | 'right' | 'wheelUp' | 'wheelDown';

export function describeMouse(action: MouseAction, mods: Mods): string {
  const label = t(`keyOverlay.mouse.${action}`);
  const prefix = modPrefix(mods);
  return prefix ? `${prefix} + ${label}` : label;
}
