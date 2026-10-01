/**
 * The DMX rig's state (single source of truth) and the operators that change
 * it through core/history, so Ctrl+Z always works. No DOM.
 */
import type { OperatorCall } from '../../core/history/store';
import { clampDmx, emptyUniverse, isValidAddress } from './dmx/dmx';
import type { Fixture } from './dmx/fixtures';

export interface RigState {
  /** universes[0] is universe 1. */
  readonly universes: readonly (readonly number[])[];
  readonly fixtures: readonly Fixture[];
}

/** What a stage loads. */
export interface RigSetup {
  readonly fixtures: readonly Fixture[];
  /** Number of universes on the DMX output (1 or 2). */
  readonly universes: number;
  /** Starting channel values: universe → { channel: value }. */
  readonly values?: Readonly<Record<number, Readonly<Record<number, number>>>>;
  /** Fixture addresses can be changed (patch). */
  readonly patch?: boolean;
  /** Fixture selected and fader page shown when the stage starts. */
  readonly select?: string;
}

/** Lab elements a check asks the app to show: fixtures to point at. */
export interface RigDecorations {
  readonly highlight?: readonly string[];
}

export function initialState(setup: RigSetup): RigState {
  const universes = Array.from({ length: setup.universes }, (_, i) => {
    const u = [...emptyUniverse()];
    for (const [ch, v] of Object.entries(setup.values?.[i + 1] ?? {})) u[Number(ch) - 1] = clampDmx(v);
    return u;
  });
  return { universes, fixtures: setup.fixtures };
}

export const channel = (s: RigState, universe: number, ch: number): number => s.universes[universe - 1]?.[ch - 1] ?? 0;

export const fixtureById = (s: RigState, id: string): Fixture | undefined => s.fixtures.find((f) => f.id === id);

/** Sets one channel (a fader move or a typed value). */
export function setChannel(universe: number, ch: number, value: number): OperatorCall<RigState> {
  return {
    name: 'Set Channel',
    apply(s) {
      const v = clampDmx(value);
      if (channel(s, universe, ch) === v) return s;
      return {
        ...s,
        universes: s.universes.map((u, i) => (i === universe - 1 ? u.map((x, j) => (j === ch - 1 ? v : x)) : u)),
      };
    },
  };
}

/** Changes a fixture's start address (the patch). */
export function setAddress(fixtureId: string, address: number): OperatorCall<RigState> {
  return {
    name: 'Set Address',
    apply(s) {
      const f = fixtureById(s, fixtureId);
      if (!f || !isValidAddress(address) || f.address === address) return s;
      return { ...s, fixtures: s.fixtures.map((x) => (x.id === fixtureId ? { ...x, address } : x)) };
    },
  };
}
