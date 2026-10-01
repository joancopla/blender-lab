/**
 * Lab 03 (grandMA3): the command line with the classroom keypad. Only syntax
 * verified in the manual (see apps/grandma3/console/command.ts).
 * Data and checks; texts in ca.json under "ma3lab03".
 */
import './texts';
import type { Fixture } from '../../../apps/grandma3/dmx/fixtures';
import type { RigCheckResult as CheckResult, RigLabStages as LabStages, RigStageDefinition as StageDefinition } from '../../../apps/grandma3/stages';
import type { RigSetup, RigState } from '../../../apps/grandma3/state';

const P = 'ma3lab03';
const N = 8;
const ALL = Array.from({ length: N }, (_, i) => i + 1);
const PARS: readonly Fixture[] = ALL.map((n) => ({ id: `f${n}`, number: n, type: 'dimmer', universe: 1, address: n, x: (n - 1) / (N - 1) }));

const setup = (extra: Partial<RigSetup> = {}): RigSetup => ({ universes: 1, fixtures: PARS, console: true, ...extra });
const list = (ns: readonly number[]) => (ns.length ? ns.join(', ') : '—');
const sameSet = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x) => b.includes(x));

const stage = (n: number, id: string, keys: string[], rest: Pick<StageDefinition, 'setup' | 'check'>): StageDefinition => ({
  id,
  titleKey: `${P}.s${n}.title`,
  instructionKey: `${P}.s${n}.instruction`,
  hintKeys: [`${P}.s${n}.hint1`, `${P}.s${n}.hint2`],
  successKey: `${P}.s${n}.success`,
  keys,
  ...rest,
});

/** A selection stage: done when the selection is exactly `target`. */
function selectionCheck(target: readonly number[]) {
  return ({ state }: { state: RigState }): CheckResult =>
    sameSet(state.selection, target)
      ? { done: true }
      : { done: false, feedback: { key: `${P}.selection`, params: { list: list(state.selection) }, tone: 'progress' } };
}

/** A programmer stage: done when exactly these fixtures have these values. */
function programmerCheck(target: Readonly<Record<number, number>>, key: string) {
  return ({ state }: { state: RigState }): CheckResult => {
    const want = Object.entries(target).map(([n, v]) => [Number(n), v] as const);
    const extra = Object.keys(state.programmer).map(Number).filter((n) => !(n in target));
    const ok = want.every(([n, v]) => state.programmer[n] === v) && extra.length === 0;
    if (ok) return { done: true };
    if (extra.length > 0) return { done: false, feedback: { key: `${key}.extra`, params: { list: list(extra) }, tone: 'fix' } };
    const wrong = want.find(([n, v]) => state.programmer[n] !== undefined && state.programmer[n] !== v);
    if (wrong) return { done: false, feedback: { key: `${key}.value`, params: { n: wrong[0], v: state.programmer[wrong[0]]! }, tone: 'fix' } };
    return { done: false, feedback: { key: `${P}.selection`, params: { list: list(state.selection) }, tone: 'progress' } };
  };
}

const s1 = stage(1, 'select', ['ma3Please'], { setup: () => setup(), check: selectionCheck([1]) });
const s2 = stage(2, 'add', ['ma3Plus', 'ma3Please'], { setup: () => setup({ selection: [1] }), check: selectionCheck([1, 2]) });
const s3 = stage(3, 'range', ['ma3Thru', 'ma3Please'], { setup: () => setup({ selection: [1, 2] }), check: selectionCheck([1, 2, 3, 4]) });

export const S4_TARGET = { 1: 60, 2: 60, 3: 60, 4: 60, 5: 60 };
const s4 = stage(4, 'at', ['ma3Thru', 'ma3At', 'ma3Please'], { setup: () => setup(), check: programmerCheck(S4_TARGET, `${P}.s4`) });

export const S5_TARGET = { 1: 30, 2: 30, 3: 30, 6: 30, 7: 30, 8: 30 };
const s5 = stage(5, 'except', ['ma3Thru', 'ma3Minus', 'ma3At', 'ma3Please'], { setup: () => setup(), check: programmerCheck(S5_TARGET, `${P}.s5`) });

const s6 = stage(6, 'normal', ['ma3At', 'ma3At', 'ma3Please'], {
  setup: () => setup({ selection: ALL }),
  check: programmerCheck(Object.fromEntries(ALL.map((n) => [n, 100])), `${P}.s6`),
});

const s7 = stage(7, 'clear-selection', ['ma3Clear'], {
  setup: () => setup({ selection: ALL, programmer: Object.fromEntries(ALL.map((n) => [n, 70])) }),
  check: ({ state }): CheckResult => {
    const kept = Object.keys(state.programmer).length;
    if (kept < N) return { done: false, feedback: { key: `${P}.s7.emptied`, tone: 'fix' } };
    if (state.selection.length === 0) return { done: true };
    return { done: false, feedback: { key: `${P}.selection`, params: { list: list(state.selection) }, tone: 'progress' } };
  },
});

const s8 = stage(8, 'clear-all', ['ma3ClearHold'], {
  setup: () => setup({ selection: [2, 3], programmer: { 2: 50, 3: 50, 6: 80 } }),
  check: ({ state }): CheckResult =>
    Object.keys(state.programmer).length === 0
      ? { done: true }
      : { done: false, feedback: { key: `${P}.s8.left`, params: { list: list(Object.keys(state.programmer).map(Number)) }, tone: 'progress' } },
});

export const LAB03_STAGES: LabStages = {
  labId: 'ma3-03-command-line',
  stages: [s1, s2, s3, s4, s5, s6, s7, s8],
  freeSetup: () => setup(),
};
