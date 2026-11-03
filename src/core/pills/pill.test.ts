import { describe, expect, it } from 'vitest';
import { applyNav, navForKey, parseToken, stepFromHash } from './pill';

describe('parseToken', () => {
  it('reads a single key', () => {
    expect(parseToken('E')).toEqual({ kind: 'keys', parts: [{ kind: 'key', label: 'E' }] });
    expect(parseToken('Numpad .')).toEqual({ kind: 'keys', parts: [{ kind: 'key', label: 'Numpad .' }] });
  });

  it('keeps a lone plus as a key', () => {
    expect(parseToken('+')).toEqual({ kind: 'keys', parts: [{ kind: 'key', label: '+' }] });
  });

  it('splits combinations, mouse buttons included', () => {
    expect(parseToken('Shift+Alt+@left')).toEqual({
      kind: 'keys',
      parts: [
        { kind: 'key', label: 'Shift' },
        { kind: 'key', label: 'Alt' },
        { kind: 'mouse', id: 'left' },
      ],
    });
  });

  it('reads notes and mouse buttons', () => {
    expect(parseToken('~top')).toEqual({ kind: 'note', id: 'top' });
    expect(parseToken('@middle')).toEqual({ kind: 'keys', parts: [{ kind: 'mouse', id: 'middle' }] });
  });
});

describe('navigation', () => {
  it('maps keys', () => {
    expect(navForKey({ key: 'ArrowRight' })).toBe('next');
    expect(navForKey({ key: ' ' })).toBe('next');
    expect(navForKey({ key: 'ArrowLeft' })).toBe('prev');
    expect(navForKey({ key: 'Home' })).toBe('first');
    expect(navForKey({ key: 'End' })).toBe('last');
    expect(navForKey({ key: 'f' })).toBe('fullscreen');
    expect(navForKey({ key: 'x' })).toBeNull();
  });

  it('leaves browser shortcuts alone', () => {
    expect(navForKey({ key: 'ArrowLeft', altKey: true })).toBeNull();
    expect(navForKey({ key: 'f', ctrlKey: true })).toBeNull();
  });

  it('stays inside the steps', () => {
    expect(applyNav(0, 'prev', 17)).toBe(0);
    expect(applyNav(16, 'next', 17)).toBe(16);
    expect(applyNav(4, 'next', 17)).toBe(5);
    expect(applyNav(4, 'first', 17)).toBe(0);
    expect(applyNav(4, 'last', 17)).toBe(16);
  });

  it('reads the step from the address', () => {
    expect(stepFromHash('#5', 17)).toBe(4);
    expect(stepFromHash('', 17)).toBe(0);
    expect(stepFromHash('#0', 17)).toBe(0);
    expect(stepFromHash('#99', 17)).toBe(0);
    expect(stepFromHash('#abc', 17)).toBe(0);
  });
});
