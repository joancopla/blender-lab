import { describe, expect, it } from 'vitest';
import { HistoryStore, type OperatorCall } from '../../../core/history/store';
import { type CommandKey, commandText, parseCommand, pushKey } from '../../../apps/grandma3/console/command';
import { type RigState, channel, clearAll, clearSelection, initialState, runCommand } from '../../../apps/grandma3/state';
import { LAB03_STAGES } from './stages';

/** Loads a stage and types commands on the keypad ("Please" executes each one). */
function run(index: number, ...commands: (CommandKey[] | OperatorCall<RigState>)[]) {
  const stage = LAB03_STAGES.stages[index]!;
  const store = new HistoryStore(initialState(stage.setup()));
  const initial = store.state;
  for (const c of commands) {
    if (!Array.isArray(c)) {
      store.execute(c);
      continue;
    }
    const tokens = c.reduce<string[]>((t, k) => pushKey(t, k), []);
    const parsed = parseCommand(tokens, store.state.fixtures.map((f) => f.number), store.state.selection);
    if (parsed.ok) store.execute(runCommand(parsed.command, commandText(tokens)));
  }
  return { result: stage.check({ state: store.state, initialState: initial, log: store.log, memory: new Map() }), state: store.state };
}

describe('grandMA3 Lab 03 stages', () => {
  it('1–3: select, add and range', () => {
    expect(run(0, ['1']).result.done).toBe(true);
    expect(run(1, ['2']).result.done).toBe(false);
    expect(run(1, ['+', '2']).result.done).toBe(true);
    expect(run(2, ['1', 'Thru', '4']).result.done).toBe(true);
  });

  it('4: 1 Thru 5 At 60 writes 153 to the dimmer channels', () => {
    const { result, state } = run(3, ['1', 'Thru', '5', 'At', '6', '0']);
    expect(result.done).toBe(true);
    expect(channel(state, 1, 5)).toBe(153);
    expect(channel(state, 1, 6)).toBe(0);
    expect(run(3, ['1', 'Thru', '6', 'At', '6', '0']).result.feedback?.key).toBe('ma3lab03.s4.extra');
  });

  it('5: all but 4 and 5 at 30 %, with minus in the list', () => {
    expect(run(4, ['1', 'Thru', '8', '−', '4', 'Thru', '5', 'At', '3', '0']).result.done).toBe(true);
  });

  it('6: At At is 100 %', () => {
    expect(run(5, ['At', 'At']).result.done).toBe(true);
  });

  it('7–8: short Clear keeps the values, long Clear empties the programmer', () => {
    expect(run(6, clearSelection).result.done).toBe(true);
    expect(run(6, clearAll).result.feedback?.key).toBe('ma3lab03.s7.emptied');
    const { result, state } = run(7, clearAll);
    expect(result.done).toBe(true);
    expect(channel(state, 1, 6)).toBe(0);
  });
});
