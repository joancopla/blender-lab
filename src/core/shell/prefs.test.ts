import { describe, expect, it } from 'vitest';
import { DEFAULT_LAB_PREFS, type StorageLike, loadPrefs, savePrefs } from './prefs';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('lab preferences', () => {
  it('emulations are off by default, as in Blender', () => {
    expect(loadPrefs(memory())).toEqual(DEFAULT_LAB_PREFS);
    expect(DEFAULT_LAB_PREFS.emulate3ButtonMouse).toBe(false);
    expect(DEFAULT_LAB_PREFS.emulateNumpad).toBe(false);
  });

  it('round-trips', () => {
    const s = memory();
    savePrefs({ emulate3ButtonMouse: true, emulateNumpad: true, keyOverlay: false }, s);
    expect(loadPrefs(s)).toEqual({ emulate3ButtonMouse: true, emulateNumpad: true, keyOverlay: false });
  });

  it('survives broken or unavailable storage', () => {
    const s = memory();
    s.data.set('blender-lab:prefs', '{not json');
    expect(loadPrefs(s)).toEqual(DEFAULT_LAB_PREFS);
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadPrefs(throwing)).toEqual(DEFAULT_LAB_PREFS);
    expect(() => savePrefs(DEFAULT_LAB_PREFS, throwing)).not.toThrow();
    expect(loadPrefs(null)).toEqual(DEFAULT_LAB_PREFS);
  });
});
