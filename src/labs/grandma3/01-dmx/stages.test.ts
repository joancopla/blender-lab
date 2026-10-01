import { describe, expect, it } from 'vitest';
import { HistoryStore } from '../../../core/history/store';
import { type RigState, initialState, setAddress, setChannel } from '../../../apps/grandma3/state';
import { LAB01_STAGES, S2_ADDRESSES } from './stages';

/** Loads a stage, applies operators and checks it, as the runner would. */
function run(index: number, ...ops: Parameters<HistoryStore<RigState>['execute']>[0][]) {
  const stage = LAB01_STAGES.stages[index]!;
  const store = new HistoryStore(initialState(stage.setup()));
  const initial = store.state;
  for (const op of ops) store.execute(op);
  return stage.check({ state: store.state, initialState: initial, log: store.log, memory: new Map() });
}

describe('grandMA3 Lab 01 stages', () => {
  it('1: channel 1 at full', () => {
    expect(run(0).done).toBe(false);
    expect(run(0, setChannel(1, 1, 200)).done).toBe(false);
    expect(run(0, setChannel(1, 1, 255)).done).toBe(true);
  });

  it('2: only fixture 3, at its address', () => {
    expect(run(1, setChannel(1, 3, 255)).feedback?.tone).toBe('fix'); // channel 3 is fixture 4
    expect(run(1, setChannel(1, S2_ADDRESSES.f3, 255)).done).toBe(true);
    expect(run(1, setChannel(1, S2_ADDRESSES.f3, 255), setChannel(1, S2_ADDRESSES.f1, 10)).done).toBe(false);
  });

  it('3: red needs dimmer and red, no green or blue', () => {
    expect(run(2, setChannel(1, 2, 255)).feedback?.key).toBe('ma3lab01.s3.noDimmer');
    expect(run(2, setChannel(1, 1, 255), setChannel(1, 2, 255)).done).toBe(true);
    expect(run(2, setChannel(1, 1, 255), setChannel(1, 2, 255), setChannel(1, 4, 5)).done).toBe(false);
  });

  it('4: the second PAR starts at 5', () => {
    expect(run(3, setAddress('p2', 4)).done).toBe(false);
    expect(run(3, setAddress('p2', 6)).feedback?.key).toBe('ma3lab01.s4.gap');
    expect(run(3, setAddress('p2', 5)).done).toBe(true);
  });

  it('5: the last address where 4 channels fit is 509', () => {
    expect(run(4).done).toBe(false);
    expect(run(4, setAddress('p1', 508)).feedback?.key).toBe('ma3lab01.s5.tooLow');
    expect(run(4, setAddress('p1', 509)).done).toBe(true);
  });

  it('6: universe 2, address 1', () => {
    expect(run(5, setChannel(1, 1, 255)).feedback?.key).toBe('ma3lab01.s6.wrongUniverse');
    expect(run(5, setChannel(2, 1, 255)).done).toBe(true);
  });

  it('stage ids are unique', () => {
    const ids = LAB01_STAGES.stages.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
