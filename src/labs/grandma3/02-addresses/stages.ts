/**
 * Lab 02 (grandMA3): addresses and values. Percent to DMX, patching in a row,
 * mixed footprints, absolute addresses and overflowing into a second universe.
 * Data and checks; texts in ca.json under "ma3lab02".
 */
import './texts';
import { percentToDmx } from '../../../apps/grandma3/dmx/dmx';
import type { Fixture, FixtureTypeId } from '../../../apps/grandma3/dmx/fixtures';
import type { RigCheckResult as CheckResult, RigLabStages as LabStages, RigStageDefinition as StageDefinition } from '../../../apps/grandma3/stages';
import { type RigState, channel, fixtureById } from '../../../apps/grandma3/state';

const P = 'ma3lab02';
const fx = (id: string, number: number, type: FixtureTypeId, x: number, address = 1, universe = 1): Fixture => ({ id, number, type, universe, address, x });
const spread = (n: number, i: number) => (n === 1 ? 0.5 : 0.08 + (0.84 * i) / (n - 1));

const stage = (n: number, id: string, rest: Pick<StageDefinition, 'setup' | 'check'>): StageDefinition => ({
  id,
  titleKey: `${P}.s${n}.title`,
  instructionKey: `${P}.s${n}.instruction`,
  hintKeys: [`${P}.s${n}.hint1`, `${P}.s${n}.hint2`],
  successKey: `${P}.s${n}.success`,
  keys: [],
  ...rest,
});

/** Channel values the stage asks for: [universe, channel, percent]. */
type Target = readonly [number, number, number];

/** Checks exact DMX values for percentages; names the first wrong channel. */
function checkValues(state: RigState, targets: readonly Target[], key: string): CheckResult {
  const ok = targets.filter(([u, ch, pct]) => channel(state, u, ch) === percentToDmx(pct)).length;
  if (ok === targets.length) return { done: true };
  const wrong = targets.find(([u, ch, pct]) => channel(state, u, ch) !== 0 && channel(state, u, ch) !== percentToDmx(pct));
  if (wrong) return { done: false, feedback: { key: `${key}.wrong`, params: { ch: wrong[1], v: channel(state, wrong[0], wrong[1]), pct: wrong[2] }, tone: 'fix' } };
  return { done: false, feedback: { key: `${key}.progress`, params: { n: ok, total: targets.length }, tone: 'progress' } };
}

/** Where each fixture must end up: [id, universe, address]. */
type Place = readonly [string, number, number];

/** Checks a patch; names the first fixture not in place (in order). */
function checkPatch(state: RigState, places: readonly Place[], key: string): CheckResult {
  const ok = places.filter(([id, u, a]) => {
    const f = fixtureById(state, id)!;
    return f.universe === u && f.address === a;
  }).length;
  if (ok === places.length) return { done: true };
  const first = places.find(([id, u, a]) => {
    const f = fixtureById(state, id)!;
    return f.universe !== u || f.address !== a;
  })!;
  const f = fixtureById(state, first[0])!;
  return {
    done: false,
    feedback: { key: `${key}.progress`, params: { n: ok, total: places.length, f: f.number }, tone: 'progress' },
    decorations: { highlight: [f.id] },
  };
}

// 1. Percent to DMX: the output only knows 0–255.
export const S1_TARGETS: readonly Target[] = [
  [1, 1, 100],
  [1, 2, 60],
  [1, 3, 20],
];
const s1 = stage(1, 'percent', {
  setup: () => ({ universes: 1, fixtures: [fx('f1', 1, 'dimmer', 0.2, 1), fx('f2', 2, 'dimmer', 0.5, 2), fx('f3', 3, 'dimmer', 0.8, 3)] }),
  check: ({ state }) => checkValues(state, S1_TARGETS, `${P}.s1`),
});

// 2. A colour in percent: dimmer and red at full, blue at 40 %, no green.
export const S2_TARGETS: readonly Target[] = [
  [1, 1, 100],
  [1, 2, 100],
  [1, 3, 0],
  [1, 4, 40],
];
const s2 = stage(2, 'colour', {
  setup: () => ({ universes: 1, fixtures: [fx('p1', 1, 'ledPar4', 0.5, 1)], select: 'p1' }),
  check: ({ state }) => checkValues(state, S2_TARGETS, `${P}.s2`),
});

// 3. Four LED PARs in a row, no gaps: 1, 5, 9, 13.
export const S3_PLACES: readonly Place[] = [
  ['p1', 1, 1],
  ['p2', 1, 5],
  ['p3', 1, 9],
  ['p4', 1, 13],
];
const s3 = stage(3, 'row', {
  setup: () => ({ universes: 1, fixtures: [0, 1, 2, 3].map((i) => fx(`p${i + 1}`, i + 1, 'ledPar4', spread(4, i))), values: { 1: { 1: 255, 2: 255, 3: 160 } }, patch: true, select: 'p2' }),
  check: ({ state }) => checkPatch(state, S3_PLACES, `${P}.s3`),
});

// 4. Mixed footprints: dimmer (1), moving head (16), LED PAR (4) → 1, 2, 18.
export const S4_PLACES: readonly Place[] = [
  ['f1', 1, 1],
  ['m2', 1, 2],
  ['p3', 1, 18],
];
const s4 = stage(4, 'mixed', {
  setup: () => ({
    universes: 1,
    fixtures: [fx('f1', 1, 'dimmer', 0.2), fx('m2', 2, 'movingHead16', 0.5), fx('p3', 3, 'ledPar4', 0.8)],
    patch: true,
    select: 'm2',
  }),
  check: ({ state }) => checkPatch(state, S4_PLACES, `${P}.s4`),
});

// 5. Absolute address 600 is universe 2, address 88.
const s5 = stage(5, 'absolute', {
  setup: () => ({ universes: 2, fixtures: [fx('m1', 1, 'movingHead16', 0.5)], patch: true, select: 'm1' }),
  check: ({ state }): CheckResult => {
    const f = fixtureById(state, 'm1')!;
    if (f.universe === 2 && f.address === 88) return { done: true };
    if (f.universe === 1) return { done: false, feedback: { key: `${P}.s5.universe`, tone: f.address === 1 ? 'progress' : 'fix' } };
    return { done: false, feedback: { key: `${P}.s5.address`, tone: 'fix' } };
  },
});

// 6. Five 16-channel heads from 1.449: the fifth one does not fit and goes to 2.1.
export const S6_PLACES: readonly Place[] = [
  ['m1', 1, 449],
  ['m2', 1, 465],
  ['m3', 1, 481],
  ['m4', 1, 497],
  ['m5', 2, 1],
];
const s6 = stage(6, 'overflow', {
  setup: () => ({
    universes: 2,
    fixtures: [0, 1, 2, 3, 4].map((i) => fx(`m${i + 1}`, i + 1, 'movingHead16', spread(5, i), 449)),
    patch: true,
    select: 'm2',
  }),
  check: ({ state }) => checkPatch(state, S6_PLACES, `${P}.s6`),
});

export const LAB02_STAGES: LabStages = {
  labId: 'ma3-02-addresses',
  stages: [s1, s2, s3, s4, s5, s6],
  freeSetup: () => ({
    universes: 2,
    fixtures: [fx('f1', 1, 'dimmer', 0.08, 1), fx('p2', 2, 'ledPar4', 0.3, 2), fx('p3', 3, 'ledPar4', 0.52, 6), fx('m4', 4, 'movingHead16', 0.74, 10), fx('m5', 5, 'movingHead16', 0.92, 1, 2)],
    patch: true,
  }),
};
