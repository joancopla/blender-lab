import { describe, expect, it } from 'vitest';
import { type StorageLike, loadPrefs, savePrefs } from './prefs';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

const DEFAULTS = { emulate3ButtonMouse: false, emulateNumpad: false, keyOverlay: true };

describe('lab preferences', () => {
  it('defaults when nothing is saved', () => {
    expect(loadPrefs(DEFAULTS, memory())).toEqual(DEFAULTS);
  });

  it('round-trips, keeping only known keys', () => {
    const s = memory();
    savePrefs({ emulate3ButtonMouse: true, emulateNumpad: true, keyOverlay: false, stray: true }, s);
    expect(loadPrefs(DEFAULTS, s)).toEqual({ emulate3ButtonMouse: true, emulateNumpad: true, keyOverlay: false });
  });

  it('survives broken or unavailable storage', () => {
    const s = memory();
    s.data.set('blender-lab:prefs', '{not json');
    expect(loadPrefs(DEFAULTS, s)).toEqual(DEFAULTS);
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadPrefs(DEFAULTS, throwing)).toEqual(DEFAULTS);
    expect(() => savePrefs(DEFAULTS, throwing)).not.toThrow();
    expect(loadPrefs(DEFAULTS, null)).toEqual(DEFAULTS);
  });
});
