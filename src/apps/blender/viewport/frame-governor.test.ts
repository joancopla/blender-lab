import { describe, expect, it } from 'vitest';
import { FrameGovernor, RESOLUTION_SCALES } from './frame-governor';

const feed = (g: FrameGovernor, ms: number, n: number) => {
  let changed = 0;
  for (let i = 0; i < n; i++) if (g.record(ms)) changed++;
  return changed;
};

describe('FrameGovernor', () => {
  it('starts at full resolution', () => {
    expect(new FrameGovernor().scale).toBe(1);
  });

  it('keeps full resolution at 60 fps', () => {
    const g = new FrameGovernor();
    expect(feed(g, 16.7, 200)).toBe(0);
    expect(g.scale).toBe(1);
    expect(g.typicalFrameMs).toBeCloseTo(16.7);
  });

  it('steps down one level per slow window, to the minimum', () => {
    const g = new FrameGovernor();
    feed(g, 40, 24);
    expect(g.scale).toBe(RESOLUTION_SCALES[1]);
    feed(g, 40, 24 * 5);
    expect(g.scale).toBe(RESOLUTION_SCALES[RESOLUTION_SCALES.length - 1]);
  });

  it('ignores a few spikes (median, not mean)', () => {
    const g = new FrameGovernor();
    for (let i = 0; i < 24; i++) g.record(i % 6 === 0 ? 120 : 16);
    expect(g.scale).toBe(1);
  });

  it('ignores pauses between interactions', () => {
    const g = new FrameGovernor();
    feed(g, 1000, 100);
    expect(g.scale).toBe(1);
    expect(g.typicalFrameMs).toBe(0);
  });

  it('steps back up only after several fast windows', () => {
    const g = new FrameGovernor();
    feed(g, 40, 24);
    expect(g.scale).toBe(0.75);
    feed(g, 8, 24 * 2);
    expect(g.scale).toBe(0.75);
    feed(g, 8, 24);
    expect(g.scale).toBe(1);
  });

  it('a normal window in between resets the count of fast ones', () => {
    const g = new FrameGovernor();
    feed(g, 40, 24);
    feed(g, 8, 24 * 2);
    feed(g, 16, 24);
    feed(g, 8, 24 * 2);
    expect(g.scale).toBe(0.75);
  });
});
