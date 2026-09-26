import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { SelectOp } from '../operators/select';
import { mesh, sceneWith } from '../scene/factory';
import { SceneStore } from '../scene/store';
import { viewProjection } from '../viewport/screen';
import { defaultViewState } from '../viewport/view-state';
import type { StorageLike } from '../lab-prefs';
import { ProgressStore } from './progress';
import { STUCK_MS, StageRunner } from './runner';
import type { LabStages, StageDefinition } from './types';

const memory = (): StorageLike => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

const selectCube: StageDefinition = {
  id: 'select-cube',
  titleKey: 't',
  instructionKey: 'i',
  hintKeys: ['h1', 'h2'],
  successKey: 's',
  keys: [],
  scene: () => sceneWith([mesh('cube', 'Cube', 'cube', vec3(0, 0, 0))]),
  check: (ctx) => ({ done: ctx.scene.selectedIds.includes('cube') }),
};
const finalStage: StageDefinition = { ...selectCube, id: 'final', hints: false, stats: true };
const LAB: LabStages = { labId: 'test', stages: [selectCube, finalStage], freeScene: () => sceneWith([]) };

function setup(storage = memory()) {
  let now = 0;
  const store = new SceneStore(sceneWith([]));
  let view = defaultViewState();
  const size = { width: 800, height: 600 };
  const progress = new ProgressStore('test', storage);
  const runner = new StageRunner(LAB, {
    store,
    view: () => view,
    projection: () => ({
      projection: viewProjection({ ...view, camera: null }, size, null),
      size,
    }),
    resetView: (v) => (view = v),
    progress,
    now: () => now,
  });
  store.onChange(() => runner.notifyActivity());
  return { runner, store, progress, advance: (ms: number) => (now += ms) };
}

describe('StageRunner', () => {
  it('loads the stage scene and completes it when the check passes', () => {
    const { runner, store, progress } = setup();
    runner.load(0);
    expect(store.state.objects.some((o) => o.id === 'cube')).toBe(true);
    expect(runner.status.completed).toBe(false);
    store.execute(SelectOp('cube', false));
    expect(runner.status.completed).toBe(true);
    expect(progress.isCompleted('select-cube')).toBe(true);
  });

  it('stays done after further changes, until restarted', () => {
    const { runner, store } = setup();
    runner.load(0);
    store.execute(SelectOp('cube', false));
    store.execute(SelectOp(null, false));
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
    const { runner, store, advance } = setup();
    runner.load(1);
    runner.showHint();
    advance(STUCK_MS);
    runner.tick();
    expect(runner.status.hintsShown).toBe(0);
    advance(42_000);
    store.execute(SelectOp('cube', false));
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

  it('free mode has no stage', () => {
    const { runner } = setup();
    runner.load(-1);
    expect(runner.status.index).toBe(-1);
    expect(runner.status.stage).toBeNull();
  });
});
