/**
 * Lab preferences, saved in localStorage. Storage can be unavailable (private
 * mode, blocked cookies): every access is wrapped and falls back to defaults.
 */
import { DEFAULT_INPUT_PREFS, type InputPrefs } from './input/keymap';

export interface LabPrefs extends InputPrefs {
  /** Screencast-Keys-like overlay of pressed keys and clicks. */
  readonly keyOverlay: boolean;
}

export const DEFAULT_LAB_PREFS: LabPrefs = { ...DEFAULT_INPUT_PREFS, keyOverlay: true };

const KEY = 'blender-lab:prefs';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPrefs(storage: StorageLike | null = defaultStorage()): LabPrefs {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return DEFAULT_LAB_PREFS;
    const data = JSON.parse(raw) as Partial<Record<keyof LabPrefs, unknown>>;
    const bool = (k: keyof LabPrefs) => (typeof data[k] === 'boolean' ? (data[k] as boolean) : DEFAULT_LAB_PREFS[k]);
    return {
      emulate3ButtonMouse: bool('emulate3ButtonMouse'),
      emulateNumpad: bool('emulateNumpad'),
      keyOverlay: bool('keyOverlay'),
    };
  } catch {
    return DEFAULT_LAB_PREFS;
  }
}

export function savePrefs(prefs: LabPrefs, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Not saved: the preferences still apply for this visit.
  }
}
