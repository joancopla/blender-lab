import { describe, expect, it } from 'vitest';
import { THEME_KEY, loadTheme, nextTheme, saveTheme } from './theme';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('theme choice', () => {
  it('defaults to the system and round-trips', () => {
    const s = memory();
    expect(loadTheme(s)).toBe('system');
    saveTheme('dark', s);
    expect(loadTheme(s)).toBe('dark');
  });

  it('ignores invalid values and broken storage', () => {
    const s = memory();
    s.setItem(THEME_KEY, 'purple');
    expect(loadTheme(s)).toBe('system');
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadTheme(broken)).toBe('system');
    expect(() => saveTheme('light', broken)).not.toThrow();
  });

  it('cycles system, light, dark', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});
