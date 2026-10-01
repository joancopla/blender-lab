import { describe, expect, it } from 'vitest';
import { distanceToLink, linkHandles, linkPoints, rectsOverlap, segmentsCross, strokeCrossesLink } from './link-geometry';

describe('link geometry', () => {
  it('handles stick out horizontally by 0.4 × |dx|', () => {
    const [, p1, p2] = linkHandles({ x: 0, y: 0 }, { x: 100, y: 50 });
    expect(p1).toEqual({ x: 40, y: 0 });
    expect(p2).toEqual({ x: 60, y: 50 });
  });

  it('the curve starts and ends at the sockets', () => {
    const pts = linkPoints({ x: 0, y: 0 }, { x: 100, y: 50 });
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 100, y: 50 });
  });

  it('a stroke across the link cuts it; one beside it does not', () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
    const a = { x: 0, y: 0 };
    const b = { x: 200, y: 0 };
    expect(strokeCrossesLink([{ x: 100, y: -20 }, { x: 100, y: 20 }], a, b)).toBe(true);
    expect(strokeCrossesLink([{ x: 100, y: 20 }, { x: 100, y: 60 }], a, b)).toBe(false);
  });

  it('measures how far a point is from a link', () => {
    expect(distanceToLink({ x: 100, y: 10 }, { x: 0, y: 0 }, { x: 200, y: 0 })).toBeCloseTo(10);
  });

  it('box select overlap', () => {
    expect(rectsOverlap({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 5, y0: 5, x1: 20, y1: 20 })).toBe(true);
    expect(rectsOverlap({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 11, y0: 0, x1: 20, y1: 10 })).toBe(false);
  });
});
