/**
 * The DMX rig's state (single source of truth) and the operators that change
 * it through core/history, so Ctrl+Z always works. No DOM.
 */
import type { OperatorCall } from '../../core/history/store';
import type { ParsedCommand } from './console/command';
import { clampDmx, emptyUniverse, isValidAddress, percentToDmx } from './dmx/dmx';
import { FIXTURE_TYPES, type Fixture } from './dmx/fixtures';

export interface RigState {
  /** universes[0] is universe 1. */
  readonly universes: readonly (readonly number[])[];
  readonly fixtures: readonly Fixture[];
  /** Fixtures selected in the programmer (fixture numbers, ascending). */
  readonly selection: readonly number[];
  /** Dimmer values in the programmer (fixture number → percent). */
  readonly programmer: Readonly<Record<number, number>>;
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
  /** Show the command line and the keypad instead of the DMX faders. */
  readonly console?: boolean;
  /** Starting programmer: selection and dimmer values (percent). */
  readonly selection?: readonly number[];
  readonly programmer?: Readonly<Record<number, number>>;
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
  const base: RigState = { universes, fixtures: setup.fixtures, selection: [], programmer: {} };
  return withProgrammer(base, setup.selection ?? [], setup.programmer ?? {});
}

/**
 * Sets selection and programmer, and writes each fixture's dimmer channel to the
 * DMX output (the programmer is what the console outputs in these labs).
 */
function withProgrammer(s: RigState, selection: readonly number[], programmer: Readonly<Record<number, number>>): RigState {
  const universes = s.universes.map((u) => [...u]);
  for (const f of s.fixtures) {
    const i = FIXTURE_TYPES[f.type].channels.indexOf('dimmer' as never);
    const ch = f.address + i;
    const u = universes[f.universe - 1];
    if (i < 0 || !u || ch > u.length) continue;
    const before = s.programmer[f.number];
    const now = programmer[f.number];
    if (now !== undefined) u[ch - 1] = percentToDmx(now);
    else if (before !== undefined) u[ch - 1] = 0;
  }
  return { ...s, universes, selection: [...selection].sort((a, b) => a - b), programmer };
}

/** Runs a parsed command line (selection and At). */
export function runCommand(command: ParsedCommand, name: string): OperatorCall<RigState> {
  return {
    name,
    apply(s) {
      const selection = command.selection ?? s.selection;
      let programmer = s.programmer;
      if (command.at !== null) {
        const next: Record<number, number> = { ...programmer };
        for (const n of selection) next[n] = command.at;
        programmer = next;
      }
      const same = selection.length === s.selection.length && selection.every((n, i) => n === s.selection[i]);
      if (same && programmer === s.programmer) return s;
      return withProgrammer(s, selection, programmer);
    },
  };
}

/** Clear (short press): deselects; the values stay in the programmer. */
export const clearSelection: OperatorCall<RigState> = {
  name: 'Clear',
  apply: (s) => (s.selection.length === 0 ? s : { ...s, selection: [] }),
};

/** Clear (long press): empties the programmer. */
export const clearAll: OperatorCall<RigState> = {
  name: 'Clear All',
  apply: (s) => (s.selection.length === 0 && Object.keys(s.programmer).length === 0 ? s : withProgrammer(s, [], {})),
};

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

/** Moves a fixture to another universe and address (the patch). */
export function setPatch(fixtureId: string, universe: number, address: number): OperatorCall<RigState> {
  return {
    name: 'Set Patch',
    apply(s) {
      const f = fixtureById(s, fixtureId);
      if (!f || !isValidAddress(address) || universe < 1 || universe > s.universes.length) return s;
      if (f.universe === universe && f.address === address) return s;
      return { ...s, fixtures: s.fixtures.map((x) => (x.id === fixtureId ? { ...x, universe, address } : x)) };
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
