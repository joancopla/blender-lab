/**
 * Lab preferences, saved in localStorage: the program's own (e.g. Blender's
 * Emulate 3 Button Mouse) plus the shell's (key overlay). Storage can be
 * unavailable (private mode, blocked cookies): every access is wrapped and falls
 * back to the defaults.
 */

export type PrefValues = Readonly<Record<string, boolean>>;

/** Shell preference: Screencast-Keys-like overlay of pressed keys and clicks. */
export const KEY_OVERLAY_PREF = 'keyOverlay';

// Kept from the first version so saved preferences survive.
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

/** Saved values for the known keys; defaults for anything missing or invalid. */
export function loadPrefs(defaults: PrefValues, storage: StorageLike | null = defaultStorage()): PrefValues {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return defaults;
    const data = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(defaults).map(([k, d]) => [k, typeof data[k] === 'boolean' ? (data[k] as boolean) : d]),
    );
  } catch {
    return defaults;
  }
}

export function savePrefs(values: PrefValues, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(values));
  } catch {
    // Not saved: the preferences still apply for this visit.
  }
}
