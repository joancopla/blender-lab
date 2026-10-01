/**
 * DMX512 basics, with no DOM: universes of 512 channels, 8-bit values and the
 * addresses grandMA3 shows as "universe.address" (2.1) or absolute (513).
 */

export const UNIVERSE_SIZE = 512;
export const DMX_MAX = 255;

/** A DMX address: universe (from 1) and address inside it (1–512). */
export interface DmxAddress {
  readonly universe: number;
  readonly address: number;
}

/** Absolute address: universe 2, address 1 → 513. */
export function absoluteAddress(a: DmxAddress): number {
  return (a.universe - 1) * UNIVERSE_SIZE + a.address;
}

/** Inverse of absoluteAddress: 513 → universe 2, address 1. */
export function fromAbsolute(absolute: number): DmxAddress {
  const i = absolute - 1;
  return { universe: Math.floor(i / UNIVERSE_SIZE) + 1, address: (i % UNIVERSE_SIZE) + 1 };
}

/** "2.001", the way grandMA3 writes universe and address. */
export function formatAddress(a: DmxAddress): string {
  return `${a.universe}.${String(a.address).padStart(3, '0')}`;
}

export const isValidAddress = (address: number): boolean => Number.isInteger(address) && address >= 1 && address <= UNIVERSE_SIZE;

/** Last channel a fixture uses (it may fall outside the universe). */
export const lastChannel = (address: number, footprint: number): number => address + footprint - 1;

/** A fixture fits in the universe if its last channel is 512 or less. */
export const fits = (address: number, footprint: number): boolean => isValidAddress(address) && lastChannel(address, footprint) <= UNIVERSE_SIZE;

/** First free address after a fixture. */
export const nextFreeAddress = (address: number, footprint: number): number => address + footprint;

/** Highest start address where a fixture still fits (16 channels → 497). */
export const lastFittingAddress = (footprint: number): number => UNIVERSE_SIZE - footprint + 1;

/** Whether two fixtures in the same universe share any channel. */
export function overlaps(a: { address: number; footprint: number }, b: { address: number; footprint: number }): boolean {
  return a.address <= lastChannel(b.address, b.footprint) && b.address <= lastChannel(a.address, a.footprint);
}

/** Percentage (0–100) to an 8-bit DMX value, as a lighting console scales it. */
export const percentToDmx = (percent: number): number => Math.round((Math.min(100, Math.max(0, percent)) * DMX_MAX) / 100);

/** 8-bit DMX value to a percentage (0–100). */
export const dmxToPercent = (value: number): number => (Math.min(DMX_MAX, Math.max(0, value)) * 100) / DMX_MAX;

export const clampDmx = (value: number): number => Math.min(DMX_MAX, Math.max(0, Math.round(value)));

/** An empty universe (all channels at 0). */
export const emptyUniverse = (): readonly number[] => new Array<number>(UNIVERSE_SIZE).fill(0);
