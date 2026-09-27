import { describe, expect, it } from 'vitest';
import { chipMatches } from './key-match';

describe('chipMatches', () => {
  it('matches the same key, ignoring case', () => {
    expect(chipMatches('G', 'G')).toBe(true);
    expect(chipMatches('Shift + clic esquerre', 'Shift + Clic esquerre')).toBe(true);
    expect(chipMatches('Ctrl + Numpad 1', 'Ctrl + Numpad 1')).toBe(true);
  });

  it('does not match other keys or combos', () => {
    expect(chipMatches('Z', 'Ctrl + Z')).toBe(false);
    expect(chipMatches('Ctrl + Z', 'Ctrl + Shift + Z')).toBe(false);
    expect(chipMatches('Clic esquerre', 'Shift + Clic esquerre')).toBe(false);
  });

  it('matches digit ranges', () => {
    expect(chipMatches('0–9', '4')).toBe(true);
    expect(chipMatches('0–9', 'Numpad 4')).toBe(false);
    expect(chipMatches('0–9', 'G')).toBe(false);
  });

  it('matches generic mouse chips', () => {
    expect(chipMatches('Roda', 'Roda amunt')).toBe(true);
    expect(chipMatches('Roda', 'Ctrl + Roda amunt')).toBe(false);
  });
});
