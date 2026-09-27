import { describe, expect, it } from 'vitest';
import { axisSegments } from './axis-text';

const axes = (text: string) => axisSegments(text).filter((s) => s.axis).map((s) => s.text);

describe('axisSegments', () => {
  it('colours axis letters', () => {
    expect(axes("només en l'eix Z.")).toEqual(['Z']);
    expect(axes('un eix (X, Y o Z) és')).toEqual(['X', 'Y', 'Z']);
    expect(axes('amb G X, G Y o G Z, no')).toEqual(['X', 'Y', 'Z']);
    expect(axes('la cara +X del bloc')).toEqual(['X']);
  });

  it('leaves keys and words alone', () => {
    expect(axes('Desfés amb Ctrl + Z i torna-ho')).toEqual([]);
    expect(axes('Ctrl + Shift + Z ho refà')).toEqual([]);
    expect(axes("amb X-ray (Alt + Z) i l'X-ray")).toEqual([]);
    expect(axes('esborra-la amb X > Faces')).toEqual([]);
    expect(axes('Esborrar i dissoldre: X')).toEqual([]);
    expect(axes('Xavier i Zeta')).toEqual([]);
  });

  it('keeps the whole text', () => {
    const text = 'G Z 2 i Enter, i Ctrl + Z.';
    expect(axisSegments(text).map((s) => s.text).join('')).toBe(text);
  });
});
