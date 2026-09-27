import { describe, expect, it } from 'vitest';
import { HistoryStore } from '../history/store';
import type { StorageLike } from '../shell/prefs';
import { ProgressStore } from './progress';
import { type RunnerApp, STUCK_MS, StageRunner } from './runner';
import type { LabStages, StageDefinition } from './types';

/** A tiny fake program: its state is a number, a stage sets the starting value. */
function fakeApp(): RunnerApp<number, number> & { history: HistoryStore<number> } {
  const history = new HistoryStore(0);
  return {
    history,
    load: (setup) => history.reset(setup),
    getState: () => history.state,
    get log() {
      return history.log;
    },
  };
}

const memory = (): StorageLike => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

const reachFive: StageDefinition<number, number> = {
  id: 'reach-five',
  titleKey: 't',
  instructionKey: 'i',
  hintKeys: ['h1', 'h2'],
  successKey: 's',
  keys: [],
  setup: () => 2,
  check: (ctx) => ({ done: ctx.state === 5 && ctx.initialState === 2 }),
};
const finalStage: StageDefinition<number, number> = { ...reachFive, id: 'final', hints: false, stats: true };
const LAB: LabStages<number, number> = { labId: 'test', stages: [reachFive, finalStage], freeSetup: () => 100 };

function setup(storage = memory()) {
  let now = 0;
  const app = fakeApp();
  const progress = new ProgressStore('test', storage);
  const runner = new StageRunner(LAB, { app, progress, now: () => now });
  app.history.onChange(() => runner.notifyActivity());
  const setTo = (v: number) => app.history.execute({ name: 'Set', apply: () => v });
  return { runner, app, progress, setTo, advance: (ms: number) => (now += ms) };
}

describe('StageRunner', () => {
  it('loads the stage setup into the program and completes it when the check passes', () => {
    const { runner, app, progress, setTo } = setup();
    runner.load(0);
    expect(app.getState()).toBe(2);
    expect(runner.status.interacted).toBe(false);
    expect(runner.status.completed).toBe(false);
    setTo(5);
    expect(runner.status.completed).toBe(true);
    expect(progress.isCompleted('reach-five')).toBe(true);
  });

  it('stays done after further changes, until restarted', () => {
    const { runner, setTo } = setup();
    runner.load(0);
    setTo(5);
    setTo(1);
    expect(runner.status.result.done).toBe(true);
    runner.restart();
    expect(runner.status.result.done).toBe(false);
    // Saved progress still counts the stage as completed.
    expect(runner.status.completed).toBe(true);
  });

  it('first hint on demand, second one when stuck', () => {
    const { runner, advance } = setup();
    runner.load(0);
    expect(runner.status.hintsShown).toBe(0);
    runner.showHint();
    expect(runner.status.hintsShown).toBe(1);
    advance(STUCK_MS);
    runner.tick();
    expect(runner.status.hintsShown).toBe(2);
  });

  it('the final challenge has no hints and reports time and operations', () => {
    const { runner, setTo, advance } = setup();
    runner.load(1);
    runner.showHint();
    advance(STUCK_MS);
    runner.tick();
    expect(runner.status.hintsShown).toBe(0);
    advance(42_000);
    setTo(5);
    expect(runner.status.stats).toEqual({ seconds: 42 + STUCK_MS / 1000, operations: 1 });
  });

  it('remembers the current stage and survives a reload', () => {
    const storage = memory();
    const a = setup(storage);
    a.runner.load(1);
    expect(ProgressStore.read('test', storage).current).toBe(1);
    a.progress.reset();
    expect(ProgressStore.read('test', storage)).toEqual({ completed: [], current: 0 });
  });

  it('free mode loads the free setup and has no stage', () => {
    const { runner, app } = setup();
    runner.load(-1);
    expect(runner.status.index).toBe(-1);
    expect(runner.status.stage).toBeNull();
    expect(app.getState()).toBe(100);
  });
});
