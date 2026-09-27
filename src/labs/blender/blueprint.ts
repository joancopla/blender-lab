/**
 * Blueprint of the Blender course's final challenge: a four-legged stool, in
 * centimetres and Blender coordinates (Z up). Front view looks along +Y (X to
 * the right, Z up), side view is the right view (Y to the right, Z up), top view
 * looks down (X to the right, Y up).
 *
 * Which stage earns which line is a teaching choice, to be validated by the
 * teacher: Lab 01 draws the main volumes, Lab 02 the construction details.
 *
 * Stool: seat 36 × 36 × 4 (top at 45), legs 4 × 4 inset 2 cm, apron 6 cm under
 * the seat, stretchers at 12–15 cm, hand slot in the seat.
 */
import type { Blueprint, BlueprintLine, BlueprintLineKind, BlueprintView } from '../../core/shell/blueprint';

const L1 = '01-viewport';
const L2 = '02-edit-mode';

// Paths use SVG coordinates: horizontal as is, vertical flipped (up is negative).
const rect = (h0: number, v0: number, h1: number, v1: number) => `M${h0} ${-v0}H${h1}V${-v1}H${h0}Z`;
const hline = (h0: number, h1: number, v: number) => `M${h0} ${-v}H${h1}`;
const vline = (h: number, v0: number, v1: number) => `M${h} ${-v0}V${-v1}`;

/** The same outline at ±offset (legs, stretchers), as one path. */
const pair = (make: (s: number) => string) => `${make(-1)}${make(1)}`;

let n = 0;
const line = (
  view: BlueprintView,
  kind: BlueprintLineKind,
  lab: string,
  stage: string,
  d: string,
  label?: BlueprintLine['label'],
): BlueprintLine => ({ id: `${view}-${stage}-${lab}-${n++}`, view, kind, lab, stage, d, ...(label ? { label } : {}) });

// Legs: outer face at 16, inner at 12.
const legs = pair((s) => (s < 0 ? rect(-16, 0, -12, 41) : rect(12, 0, 16, 41)));
const topLegs = [-1, 1]
  .flatMap((sx) => [-1, 1].map((sy) => rect(sx < 0 ? -16 : 12, sy < 0 ? -16 : 12, sx < 0 ? -12 : 16, sy < 0 ? -12 : 16)))
  .join('');
const topStretchers = [
  rect(-12, -15, 12, -13),
  rect(-12, 13, 12, 15),
  rect(-15, -12, -13, 12),
  rect(13, -12, 15, 12),
].join('');
const feet = pair((s) => (s < 0 ? hline(-16, -12, 3) : hline(12, 16, 3)));
const slot = 'M-4 -10H4A2 2 0 0 1 4 -6H-4A2 2 0 0 1 -4 -10Z';

export const STOOL_BLUEPRINT: Blueprint = {
  viewBox: { front: '-30 -52 60 64', side: '-30 -52 60 64', top: '-30 -30 60 62' },
  lines: [
    // --- Lab 01: the main volumes ------------------------------------------------
    line('front', 'visible', L1, 'orbit', hline(-26, 26, 0)),
    line('side', 'visible', L1, 'orbit', hline(-26, 26, 0)),
    line('front', 'axis', L1, 'pan-zoom', vline(0, -3, 49)),
    line('side', 'axis', L1, 'pan-zoom', vline(0, -3, 49)),
    line('top', 'axis', L1, 'pan-zoom', `${hline(-22, 22, 0)}${vline(0, -22, 22)}`),
    line('top', 'visible', L1, 'frame-selected', rect(-18, -18, 18, 18)),
    line('front', 'visible', L1, 'views', rect(-18, 41, 18, 45)),
    line('side', 'visible', L1, 'selection', rect(-18, 41, 18, 45)),
    line('front', 'visible', L1, 'move', legs),
    line('side', 'visible', L1, 'exact-values', legs),
    line('top', 'hidden', L1, 'cancel-undo', topLegs),
    line('front', 'dimension', L1, 'final', `${vline(23, 0, 45)}M21 0H25M21 -45H25`, { x: 27, y: -21, text: '45' }),

    // --- Lab 02: construction details --------------------------------------------
    line('front', 'visible', L2, 'modes', rect(-12, 12, 12, 15)),
    line('top', 'hidden', L2, 'xray', topStretchers),
    line('side', 'visible', L2, 'loops', rect(-12, 12, 12, 15)),
    line('front', 'visible', L2, 'deform', rect(-12, 35, 12, 41)),
    line('side', 'visible', L2, 'extrude', rect(-12, 35, 12, 41)),
    line('top', 'visible', L2, 'container', slot),
    line('front', 'visible', L2, 'loopcuts', feet),
    line('side', 'visible', L2, 'loopcuts', feet),
    line('front', 'visible', L2, 'bevel', hline(-18, 18, 44)),
    line('side', 'visible', L2, 'bevel', hline(-18, 18, 44)),
    line('top', 'visible', L2, 'bevel', rect(-17, -17, 17, 17)),
    line('top', 'dimension', L2, 'cleanup', `${hline(-18, 18, -23)}M-18 21V25M18 21V25`, { x: 0, y: 28.5, text: '36' }),
    line('side', 'dimension', L2, 'final', `${hline(-18, 18, -5)}M-18 3V7M18 3V7`, { x: 0, y: 10.5, text: '36' }),
  ],
};
