import { describe, expect, it } from 'vitest';
import { type CommandKey, commandText, parseCommand, popKey, pushKey } from './command';

const FIX = [1, 2, 3, 4, 5, 6, 7, 8];
const keys = (...ks: CommandKey[]) => ks.reduce<string[]>((t, k) => pushKey(t, k), []);
const parse = (current: number[], ...ks: CommandKey[]) => parseCommand(keys(...ks), FIX, current);

describe('command line', () => {
  it('joins digits into numbers', () => {
    expect(keys('1', 'Thru', '1', '2')).toEqual(['1', 'Thru', '12']);
    expect(commandText(keys('1', 'Thru', '5', 'At', '6', '0'))).toBe('1 Thru 5 At 60');
    expect(popKey(['1', 'Thru', '12'])).toEqual(['1', 'Thru', '1']);
    expect(popKey(['1', 'Thru'])).toEqual(['1']);
  });

  it('selects with the default keyword Fixture', () => {
    expect(parse([5], '1')).toEqual({ ok: true, command: { selection: [1], at: null } });
    expect(parse([1], '+', '2')).toEqual({ ok: true, command: { selection: [1, 2], at: null } });
    expect(parse([], '1', 'Thru', '4')).toEqual({ ok: true, command: { selection: [1, 2, 3, 4], at: null } });
  });

  it('Thru without a side goes as far as possible', () => {
    expect(parse([], 'Thru', '3').ok && parse([], 'Thru', '3')).toMatchObject({ command: { selection: [1, 2, 3] } });
    expect(parse([], '6', 'Thru')).toMatchObject({ command: { selection: [6, 7, 8] } });
  });

  it('removes with minus inside a list, as in the manual', () => {
    expect(parse([], '1', 'Thru', '8', '−', '4', 'Thru', '5')).toMatchObject({ command: { selection: [1, 2, 3, 6, 7, 8] } });
    expect(parse([1, 2, 3], '−', '2')).toMatchObject({ command: { selection: [1, 3] } });
  });

  it('applies At to the new or the current selection', () => {
    expect(parse([], '1', 'Thru', '5', 'At', '6', '0')).toEqual({ ok: true, command: { selection: [1, 2, 3, 4, 5], at: 60 } });
    expect(parse([2], 'At', '5', '0')).toEqual({ ok: true, command: { selection: null, at: 50 } });
    expect(parse([2], 'At', 'At')).toEqual({ ok: true, command: { selection: null, at: 100 } });
    expect(parse([2], 'At', '1', '5', '0')).toMatchObject({ command: { at: 100 } });
  });

  it('explains what is wrong', () => {
    expect(parse([], 'At', '5', '0')).toEqual({ ok: false, error: 'noSelection' });
    expect(parse([1], 'At')).toEqual({ ok: false, error: 'atValue' });
    expect(parse([1], 'At', 'At', '5')).toEqual({ ok: false, error: 'syntax' });
    expect(parseCommand([], FIX, [])).toEqual({ ok: false, error: 'empty' });
  });
});
