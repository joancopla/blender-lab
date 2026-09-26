import { describe, expect, it } from 'vitest';
import { NumericInput } from './numeric-input';

const type = (n: NumericInput, codes: string[]) => codes.forEach((c) => n.key(c));

describe('NumericInput', () => {
  it('parses digits, decimals and sign', () => {
    const n = new NumericInput(1);
    expect(n.active).toBe(false);
    type(n, ['Digit1', 'Period', 'Digit5']);
    expect(n.active).toBe(true);
    expect(n.value()).toBe(1.5);
    n.key('Minus');
    expect(n.value()).toBe(-1.5);
    expect(n.display()).toBe('[-1.5|]');
  });

  it('numpad keys work too; a leading dot means 0.', () => {
    const n = new NumericInput(1);
    type(n, ['NumpadDecimal', 'Numpad2', 'Numpad5']);
    expect(n.value()).toBe(0.25);
  });

  it('Backspace erases and gives control back to the mouse when empty', () => {
    const n = new NumericInput(1);
    type(n, ['Digit4', 'Digit5']);
    n.key('Backspace');
    expect(n.value()).toBe(4);
    n.key('Backspace');
    expect(n.active).toBe(false);
  });

  it('Tab moves to the next component', () => {
    const n = new NumericInput(3);
    type(n, ['Digit1', 'Tab', 'Digit2', 'Tab', 'Minus', 'Digit3']);
    expect([n.value(0), n.value(1), n.value(2)]).toEqual([1, 2, -3]);
  });

  it('ignores unrelated keys', () => {
    expect(new NumericInput(1).key('KeyQ')).toBe(false);
  });
});
