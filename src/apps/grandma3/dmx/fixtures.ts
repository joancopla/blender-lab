/**
 * Fixture types and what a fixture does with the DMX it receives. Generic
 * fixtures for teaching (a real fixture's channel list is in its manual and in
 * grandMA3's fixture library); the maths is the same for any of them.
 */
import { DMX_MAX, UNIVERSE_SIZE, lastChannel } from './dmx';

/** What one channel of a fixture controls. */
export type ChannelFunction = 'dimmer' | 'red' | 'green' | 'blue';

export interface FixtureType {
  readonly id: string;
  /** i18n key of the type name. */
  readonly nameKey: string;
  /** Channels in order: the first one is at the fixture's address. */
  readonly channels: readonly ChannelFunction[];
}

export const FIXTURE_TYPES = {
  /** A conventional dimmer channel (halogen PAR): 1 channel. */
  dimmer: { id: 'dimmer', nameKey: 'ma3.fixtures.dimmer', channels: ['dimmer'] },
  /** LED PAR in a 4-channel mode: dimmer, red, green, blue. */
  ledPar4: { id: 'ledPar4', nameKey: 'ma3.fixtures.ledPar4', channels: ['dimmer', 'red', 'green', 'blue'] },
} as const satisfies Record<string, FixtureType>;

export type FixtureTypeId = keyof typeof FIXTURE_TYPES;

export interface Fixture {
  readonly id: string;
  /** Fixture number, as patched ("Fixture 3"). */
  readonly number: number;
  readonly type: FixtureTypeId;
  readonly universe: number;
  readonly address: number;
  /** Position on the stage drawing, 0 (left) to 1 (right). */
  readonly x: number;
}

export const footprintOf = (f: Fixture): number => FIXTURE_TYPES[f.type].channels.length;

/** The value each channel of the fixture receives (null: the channel falls outside the universe). */
export function channelValues(f: Fixture, universe: readonly number[]): (number | null)[] {
  return FIXTURE_TYPES[f.type].channels.map((_, i) => {
    const ch = f.address + i;
    return ch >= 1 && ch <= UNIVERSE_SIZE ? (universe[ch - 1] ?? 0) : null;
  });
}

/** What the fixture shows: intensity 0–1 and colour 0–1 per component. */
export interface FixtureOutput {
  readonly intensity: number;
  readonly color: { readonly r: number; readonly g: number; readonly b: number };
  /** Channels the fixture needs that do not exist in the universe. */
  readonly missing: number;
}

export function fixtureOutput(f: Fixture, universe: readonly number[]): FixtureOutput {
  const fns: readonly ChannelFunction[] = FIXTURE_TYPES[f.type].channels;
  const values = channelValues(f, universe);
  const get = (fn: ChannelFunction): number | null => {
    const i = fns.indexOf(fn);
    return i < 0 ? null : values[i]!;
  };
  const missing = values.filter((v) => v === null).length;
  const dimmer = (get('dimmer') ?? 0) / DMX_MAX;
  const hasColor = fns.includes('red');
  const color = hasColor
    ? { r: (get('red') ?? 0) / DMX_MAX, g: (get('green') ?? 0) / DMX_MAX, b: (get('blue') ?? 0) / DMX_MAX }
    : { r: 1, g: 0.93, b: 0.8 }; // warm white of a halogen lamp
  // An LED with every colour at 0 gives no light, whatever the dimmer.
  const colorLevel = hasColor ? Math.max(color.r, color.g, color.b) : 1;
  return { intensity: dimmer * colorLevel, color, missing };
}

/** Channels the fixture occupies, as "first–last" (last may be past 512). */
export const channelRange = (f: Fixture): readonly [number, number] => [f.address, lastChannel(f.address, footprintOf(f))];
