import { describe, expect, it } from 'vitest';
import { HistoryStore, type OperatorCall } from '../../../core/history/store';
import { type RigState, initialState, setChannel, setPatch } from '../../../apps/grandma3/state';
import { LAB02_STAGES, S3_PLACES, S4_PLACES, S6_PLACES } from './stages';

function run(index: number, ...ops: OperatorCall<RigState>[]) {
  const stage = LAB02_STAGES.stages[index]!;
  const store = new HistoryStore(initialState(stage.setup()));
  const initial = store.state;
  for (const op of ops) store.execute(op);
  return stage.check({ state: store.state, initialState: initial, log: store.log, memory: new Map() });
}
const place = (places: readonly (readonly [string, number, number])[]) => places.map(([id, u, a]) => setPatch(id, u, a));

describe('grandMA3 Lab 02 stages', () => {
  it('1: 100 %, 60 % and 20 % are 255, 153 and 51', () => {
    expect(run(0, setChannel(1, 1, 255), setChannel(1, 2, 150)).feedback?.key).toBe('ma3lab02.s1.wrong');
    expect(run(0, setChannel(1, 1, 255), setChannel(1, 2, 153), setChannel(1, 3, 51)).done).toBe(true);
  });

  it('2: violet with blue at 40 % = 102', () => {
    expect(run(1, setChannel(1, 1, 255), setChannel(1, 2, 255), setChannel(1, 4, 102)).done).toBe(true);
    expect(run(1, setChannel(1, 1, 255), setChannel(1, 2, 255), setChannel(1, 4, 100)).done).toBe(false);
  });

  it('3: four LED PARs at 1, 5, 9 and 13', () => {
    expect(run(2).done).toBe(false);
    expect(run(2, ...place(S3_PLACES)).done).toBe(true);
    expect(run(2, setPatch('p2', 1, 5)).feedback?.params?.f).toBe(3);
  });

  it('4: dimmer, moving head and LED PAR at 1, 2 and 18', () => {
    expect(run(3, setPatch('m2', 1, 2), setPatch('p3', 1, 17)).done).toBe(false);
    expect(run(3, ...place(S4_PLACES)).done).toBe(true);
  });

  it('5: absolute 600 is 2.88', () => {
    expect(run(4, setPatch('m1', 1, 88)).feedback?.key).toBe('ma3lab02.s5.universe');
    expect(run(4, setPatch('m1', 2, 89)).feedback?.key).toBe('ma3lab02.s5.address');
    expect(run(4, setPatch('m1', 2, 88)).done).toBe(true);
  });

  it('6: the fifth head goes to 2.1', () => {
    expect(run(5, ...place(S6_PLACES.slice(0, 4)), setPatch('m5', 1, 513)).done).toBe(false);
    expect(run(5, ...place(S6_PLACES)).done).toBe(true);
  });

  it('a fixture cannot be patched to a universe that does not exist', () => {
    expect(run(3, setPatch('f1', 2, 1)).done).toBe(false);
  });
});
