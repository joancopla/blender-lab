/**
 * Lab 01 (grandMA3): what DMX is. Data and checks; texts in ca.json under "ma3lab01".
 */
import './texts';
import { type Fixture, fixtureOutput } from '../../../apps/grandma3/dmx/fixtures';
import type { RigCheckResult as CheckResult, RigLabStages as LabStages, RigStageDefinition as StageDefinition } from '../../../apps/grandma3/stages';
import { type RigState, channel, fixtureById } from '../../../apps/grandma3/state';

const dimmer = (id: string, number: number, address: number, x: number, universe = 1): Fixture => ({ id, number, type: 'dimmer', universe, address, x });
const ledPar = (id: string, number: number, address: number, x: number, universe = 1): Fixture => ({ id, number, type: 'ledPar4', universe, address, x });

const output = (s: RigState, id: string) => {
  const f = fixtureById(s, id)!;
  return fixtureOutput(f, s.universes[f.universe - 1] ?? []);
};
const P = 'ma3lab01';
const stage = (n: number, id: string, rest: Pick<StageDefinition, 'setup' | 'check'>): StageDefinition => ({
  id,
  titleKey: `${P}.s${n}.title`,
  instructionKey: `${P}.s${n}.instruction`,
  hintKeys: [`${P}.s${n}.hint1`, `${P}.s${n}.hint2`],
  successKey: `${P}.s${n}.success`,
  keys: [],
  ...rest,
});

// 1. A channel and its value.
const s1 = stage(1, 'channel', {
  setup: () => ({ universes: 1, fixtures: [dimmer('f1', 1, 1, 0.1), dimmer('f2', 2, 2, 0.37), dimmer('f3', 3, 3, 0.63), dimmer('f4', 4, 4, 0.9)] }),
  check: ({ state }): CheckResult => {
    const v = channel(state, 1, 1);
    return { done: v === 255, feedback: { key: `${P}.s1.progress`, params: { v }, tone: 'progress' } };
  },
});

// 2. Every fixture listens to its address.
export const S2_ADDRESSES = { f1: 7, f2: 12, f3: 10, f4: 3 } as const;
const s2 = stage(2, 'address', {
  setup: () => ({
    universes: 1,
    fixtures: [dimmer('f1', 1, S2_ADDRESSES.f1, 0.1), dimmer('f2', 2, S2_ADDRESSES.f2, 0.37), dimmer('f3', 3, S2_ADDRESSES.f3, 0.63), dimmer('f4', 4, S2_ADDRESSES.f4, 0.9)],
  }),
  check: ({ state }): CheckResult => {
    const others = state.fixtures.filter((f) => f.id !== 'f3' && output(state, f.id).intensity > 0);
    if (others.length > 0) {
      const f = others[0]!;
      return { done: false, feedback: { key: `${P}.s2.other`, params: { n: f.number, ch: f.address }, tone: 'fix' }, decorations: { highlight: ['f3'] } };
    }
    const lit = output(state, 'f3').intensity;
    if (lit === 1) return { done: true };
    return { done: false, feedback: { key: lit > 0 ? `${P}.s2.notFull` : `${P}.s2.look`, tone: 'progress' }, decorations: { highlight: ['f3'] } };
  },
});

// 3. One fixture, four channels: an LED PAR needs the dimmer and a colour.
const s3 = stage(3, 'footprint', {
  setup: () => ({ universes: 1, fixtures: [ledPar('p1', 1, 1, 0.5)], select: 'p1' }),
  check: ({ state }): CheckResult => {
    const [dim, r, g, b] = [1, 2, 3, 4].map((ch) => channel(state, 1, ch)) as [number, number, number, number];
    if (dim >= 128 && r >= 128 && g === 0 && b === 0) return { done: true };
    let key = `${P}.s3.start`;
    if (g > 0 || b > 0) key = `${P}.s3.mixed`;
    else if (r > 0 && dim === 0) key = `${P}.s3.noDimmer`;
    else if (dim > 0 && r === 0) key = `${P}.s3.noColour`;
    else if (dim > 0 || r > 0) key = `${P}.s3.higher`;
    return { done: false, feedback: { key, tone: key === `${P}.s3.start` ? 'progress' : 'fix' } };
  },
});

// 4. Patch: the second fixture starts at the first free address.
const s4 = stage(4, 'next-address', {
  setup: () => ({
    universes: 1,
    fixtures: [ledPar('p1', 1, 1, 0.3), ledPar('p2', 2, 1, 0.7)],
    values: { 1: { 1: 255, 3: 255 } },
    patch: true,
    select: 'p2',
  }),
  check: ({ state }): CheckResult => {
    const a = fixtureById(state, 'p2')!.address;
    if (a === 5) return { done: true };
    if (a < 5) return { done: false, feedback: { key: `${P}.s4.overlap`, tone: a === 1 ? 'progress' : 'fix' } };
    return { done: false, feedback: { key: `${P}.s4.gap`, params: { a }, tone: 'fix' } };
  },
});

// 5. A universe has 512 channels: the last address where a 4-channel fixture fits is 509.
const s5 = stage(5, 'fit', {
  setup: () => ({ universes: 1, fixtures: [ledPar('p1', 1, 510, 0.5)], values: { 1: { 510: 255, 513: 0 } }, patch: true, select: 'p1' }),
  check: ({ state }): CheckResult => {
    const a = fixtureById(state, 'p1')!.address;
    if (a === 509) return { done: true };
    if (a > 509) return { done: false, feedback: { key: `${P}.s5.tooHigh`, tone: a === 510 ? 'progress' : 'fix' } };
    return { done: false, feedback: { key: `${P}.s5.tooLow`, tone: 'fix' } };
  },
});

// 6. A second universe: 2.1 is absolute address 513.
const s6 = stage(6, 'universe', {
  setup: () => ({ universes: 2, fixtures: [dimmer('f1', 1, 1, 0.3, 1), dimmer('f2', 2, 1, 0.7, 2)] }),
  check: ({ state }): CheckResult => {
    if (channel(state, 1, 1) > 0) return { done: false, feedback: { key: `${P}.s6.wrongUniverse`, tone: 'fix' } };
    const v = channel(state, 2, 1);
    if (v === 255) return { done: true };
    return { done: false, feedback: { key: v > 0 ? `${P}.s6.notFull` : `${P}.s6.start`, tone: 'progress' } };
  },
});

export const LAB01_STAGES: LabStages = {
  labId: 'ma3-01-dmx',
  stages: [s1, s2, s3, s4, s5, s6],
  freeSetup: () => ({
    universes: 2,
    fixtures: [dimmer('f1', 1, 1, 0.08), dimmer('f2', 2, 2, 0.26), ledPar('p3', 3, 3, 0.44), ledPar('p4', 4, 7, 0.62), dimmer('f5', 5, 1, 0.8, 2)],
    patch: true,
  }),
};
