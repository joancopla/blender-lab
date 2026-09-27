import { describe, expect, it } from 'vitest';
import { type Blueprint, blueprintProgress, earnedLineIds, newlyEarned } from './blueprint';

const bp: Blueprint = {
  viewBox: { front: '0 0 10 10', side: '0 0 10 10', top: '0 0 10 10' },
  lines: [
    { id: 'a', view: 'front', d: 'M0 0H1', kind: 'visible', lab: 'l1', stage: 's1' },
    { id: 'b', view: 'side', d: 'M0 0H1', kind: 'visible', lab: 'l1', stage: 's2' },
    { id: 'c', view: 'top', d: 'M0 0H1', kind: 'hidden', lab: 'l2', stage: 's1' },
    { id: 'd', view: 'top', d: 'M0 0H1', kind: 'axis', lab: 'l1', stage: 's1' },
  ],
};

describe('blueprint', () => {
  it('earns the lines of completed stages, per lab', () => {
    const done = new Set(['l1/s1']);
    const earned = earnedLineIds(bp, (lab, stage) => done.has(`${lab}/${stage}`));
    expect([...earned].sort()).toEqual(['a', 'd']);
    expect(blueprintProgress(bp, earned)).toBe(0.5);
  });

  it('does not mix stages with the same id in different labs', () => {
    const earned = earnedLineIds(bp, (lab, stage) => lab === 'l2' && stage === 's1');
    expect([...earned]).toEqual(['c']);
  });

  it('finds the lines just earned', () => {
    expect(newlyEarned(new Set(['a']), new Set(['a', 'b', 'd']))).toEqual(['b', 'd']);
    expect(newlyEarned(new Set(['a']), new Set(['a']))).toEqual([]);
  });
});
