/**
 * Final challenge of the Photoshop course (proposal): a poster, in a single
 * view. Every stage passed draws a part of it. The Transform lab earns the
 * sheet, the sun, the mountains and the title.
 * Which stage earns which line is a teaching choice, to be validated by the teacher.
 */
import type { Blueprint, BlueprintLine } from '../../core/shell/blueprint';

const L1 = 'ps-01-transform';

const line = (stage: string, d: string): BlueprintLine => ({ id: `ps-l1-${stage}`, view: 'front', kind: 'visible', lab: L1, stage, d });

const lines: BlueprintLine[] = [
  // The sheet and its inner margin.
  line('scale', 'M30 4H90V84H30Z'),
  line('move-scale', 'M34 8H86V80H34Z'),
  // Title: two bars of text.
  line('stretch', 'M39 14H74V21H39Z'),
  line('rotate', 'M39 25H62M39 28H56'),
  // Sun.
  line('rotate-snap', 'M67 40A8 8 0 1 0 83 40A8 8 0 1 0 67 40Z'),
  // Mountains.
  line('flip', 'M34 66L48 50L58 60'),
  line('skew', 'M54 64L68 48L86 66'),
  // Ground and footer.
  line('distort', 'M34 70H86'),
  line('perspective', 'M39 75H81'),
];

export const POSTER_BLUEPRINT: Blueprint = {
  viewBox: { front: '0 0 120 88', side: '0 0 1 1', top: '0 0 1 1' },
  lines,
};
