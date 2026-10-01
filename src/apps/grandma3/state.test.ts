import { describe, expect, it } from 'vitest';
import { HistoryStore } from '../../core/history/store';
import { channel, initialState, setAddress, setChannel } from './state';

const setup = {
  universes: 2,
  fixtures: [{ id: 'a', number: 1, type: 'dimmer' as const, universe: 1, address: 1, x: 0 }],
  values: { 2: { 1: 300 } },
};

describe('rig state', () => {
  it('starts with the given values, clamped to 255', () => {
    const s = initialState(setup);
    expect(s.universes).toHaveLength(2);
    expect(channel(s, 2, 1)).toBe(255);
    expect(channel(s, 1, 1)).toBe(0);
  });

  it('changes go through the history and can be undone', () => {
    const store = new HistoryStore(initialState(setup));
    store.execute(setChannel(1, 1, 128));
    store.execute(setAddress('a', 20));
    expect(channel(store.state, 1, 1)).toBe(128);
    expect(store.state.fixtures[0]!.address).toBe(20);
    store.undo();
    expect(store.state.fixtures[0]!.address).toBe(1);
    expect(store.log.map((e) => e.kind)).toEqual(['execute', 'execute', 'undo']);
  });

  it('ignores changes that change nothing or are not valid', () => {
    const store = new HistoryStore(initialState(setup));
    expect(store.execute(setChannel(1, 1, 0))).toBe(false);
    expect(store.execute(setAddress('a', 513))).toBe(false);
    expect(store.execute(setAddress('a', 0))).toBe(false);
  });
});
