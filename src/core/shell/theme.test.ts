import { describe, expect, it } from 'vitest';
import { THEME_KEY, loadTheme, nextTheme, saveTheme } from './theme';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('theme choice', () => {
  it('defaults to dark and round-trips', () => {
    const s = memory();
    expect(loadTheme(s)).toBe('dark');
    saveTheme('light', s);
    expect(loadTheme(s)).toBe('light');
  });

  it('ignores invalid values and broken storage', () => {
    const s = memory();
    s.setItem(THEME_KEY, 'purple');
    expect(loadTheme(s)).toBe('dark');
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadTheme(broken)).toBe('dark');
    expect(() => saveTheme('light', broken)).not.toThrow();
  });

  it('switches between dark and light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});
