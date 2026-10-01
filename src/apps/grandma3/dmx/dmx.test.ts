import { describe, expect, it } from 'vitest';
import {
  absoluteAddress,
  dmxToPercent,
  fits,
  formatAddress,
  fromAbsolute,
  lastFittingAddress,
  nextFreeAddress,
  overlaps,
  percentToDmx,
} from './dmx';
import { type Fixture, channelValues, fixtureOutput } from './fixtures';

describe('DMX addresses', () => {
  it('converts universe.address to absolute and back', () => {
    expect(absoluteAddress({ universe: 1, address: 512 })).toBe(512);
    expect(absoluteAddress({ universe: 2, address: 1 })).toBe(513);
    expect(absoluteAddress({ universe: 3, address: 10 })).toBe(1034);
    expect(fromAbsolute(513)).toEqual({ universe: 2, address: 1 });
    expect(fromAbsolute(512)).toEqual({ universe: 1, address: 512 });
    expect(formatAddress({ universe: 2, address: 1 })).toBe('2.001');
  });

  it('knows where a fixture fits', () => {
    expect(nextFreeAddress(1, 4)).toBe(5);
    expect(fits(509, 4)).toBe(true);
    expect(fits(510, 4)).toBe(false);
    expect(fits(500, 16)).toBe(false);
    expect(lastFittingAddress(16)).toBe(497);
    expect(lastFittingAddress(4)).toBe(509);
  });

  it('detects overlapping fixtures', () => {
    expect(overlaps({ address: 1, footprint: 4 }, { address: 4, footprint: 4 })).toBe(true);
    expect(overlaps({ address: 1, footprint: 4 }, { address: 5, footprint: 4 })).toBe(false);
  });

  it('scales percentages to 8-bit values', () => {
    expect([0, 20, 40, 60, 80, 100].map(percentToDmx)).toEqual([0, 51, 102, 153, 204, 255]);
    expect(dmxToPercent(153)).toBe(60);
  });
});

describe('fixtures', () => {
  const universe = (set: Record<number, number>) => {
    const u = new Array<number>(512).fill(0);
    for (const [ch, v] of Object.entries(set)) u[Number(ch) - 1] = v;
    return u;
  };
  const par = (address: number): Fixture => ({ id: 'p', number: 1, type: 'ledPar4', universe: 1, address, x: 0 });

  it('reads its channels from its address', () => {
    expect(channelValues(par(10), universe({ 10: 255, 11: 128 }))).toEqual([255, 128, 0, 0]);
  });

  it('needs the dimmer and a colour to give light', () => {
    expect(fixtureOutput(par(1), universe({ 2: 255 })).intensity).toBe(0);
    expect(fixtureOutput(par(1), universe({ 1: 255 })).intensity).toBe(0);
    const red = fixtureOutput(par(1), universe({ 1: 255, 2: 255 }));
    expect(red.intensity).toBe(1);
    expect(red.color).toEqual({ r: 1, g: 0, b: 0 });
  });

  it('misses the channels past 512', () => {
    expect(fixtureOutput(par(510), universe({})).missing).toBe(1);
    expect(fixtureOutput(par(509), universe({})).missing).toBe(0);
  });

  it('a dimmer channel is a warm white lamp', () => {
    const lamp: Fixture = { id: 'd', number: 1, type: 'dimmer', universe: 1, address: 3, x: 0 };
    expect(fixtureOutput(lamp, universe({ 3: 51 })).intensity).toBeCloseTo(0.2);
  });
});
