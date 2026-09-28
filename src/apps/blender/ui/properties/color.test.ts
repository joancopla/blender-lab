import { describe, expect, it } from 'vitest';
import { hexToLinear, linearToHex } from './widgets';

describe('colour swatch conversion (linear <-> sRGB)', () => {
  it('white, black and middle grey', () => {
    expect(linearToHex({ x: 1, y: 1, z: 1 })).toBe('#ffffff');
    expect(linearToHex({ x: 0, y: 0, z: 0 })).toBe('#000000');
    // 0.2140 linear is sRGB 0.5 (#808080 is 0.2159).
    expect(linearToHex({ x: 0.2159, y: 0.2159, z: 0.2159 })).toBe('#808080');
  });

  it('round trip', () => {
    const c = hexToLinear('#ff8040');
    expect(linearToHex(c)).toBe('#ff8040');
    expect(c.x).toBeCloseTo(1, 9);
  });
});
