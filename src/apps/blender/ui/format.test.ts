import { describe, expect, it } from 'vitest';
import { evaluateExpression } from './expression';
import { formatAngle, formatDistance, formatScale } from './format';

describe('field formatting', () => {
  it('distances trim zeros and show metres', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(2)).toBe('2 m');
    expect(formatDistance(7.35891)).toBe('7.3589 m');
    expect(formatDistance(-0.00001)).toBe('0 m');
  });

  it('angles and scales', () => {
    expect(formatAngle(45)).toBe('45°');
    expect(formatAngle(63.559)).toBe('63.6°');
    expect(formatAngle(44.99999999)).toBe('45°');
    expect(formatScale(1)).toBe('1.000');
    expect(formatScale(1.5)).toBe('1.500');
  });
});

describe('evaluateExpression', () => {
  it('numbers, units and decimal comma', () => {
    expect(evaluateExpression('2')).toBe(2);
    expect(evaluateExpression(' 1,5 m')).toBe(1.5);
    expect(evaluateExpression('45°')).toBe(45);
    expect(evaluateExpression('-.25')).toBe(-0.25);
  });

  it('arithmetic with precedence and parentheses', () => {
    expect(evaluateExpression('1 + 2 * 3')).toBe(7);
    expect(evaluateExpression('(1 + 2) * 3')).toBe(9);
    expect(evaluateExpression('90/2')).toBe(45);
    expect(evaluateExpression('2 - -1')).toBe(3);
  });

  it('rejects invalid input', () => {
    expect(evaluateExpression('')).toBeNull();
    expect(evaluateExpression('abc')).toBeNull();
    expect(evaluateExpression('1 +')).toBeNull();
    expect(evaluateExpression('1/0')).toBeNull();
    expect(evaluateExpression('(2')).toBeNull();
  });
});
