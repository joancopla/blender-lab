/**
 * Final challenge of the grandMA3 course: a lighting plot in front view (one
 * truss, the floor and the fixtures with their beams). Every stage passed draws
 * a fixture and its beam. Lab 01 earns the hanging rig, Lab 02 the floor uplights and
 * Lab 03 a second truss with backlights.
 * Which stage earns which line is a teaching choice, to be validated by the teacher.
 */
import type { Blueprint, BlueprintLine } from '../../core/shell/blueprint';

const L1 = 'ma3-01-dmx';
const L1_STAGES = ['channel', 'address', 'footprint', 'next-address', 'fit', 'universe'] as const;
const L2 = 'ma3-02-addresses';
const L2_STAGES = ['percent', 'colour', 'row', 'mixed', 'absolute', 'overflow'] as const;
const L3 = 'ma3-03-command-line';
const L3_STAGES = ['select', 'add', 'range', 'at', 'except', 'normal', 'clear-selection', 'clear-all'] as const;
const TRUSS2_Y = 24;

const TRUSS_Y = 8;
const FLOOR_Y = 58;

/** A fixture hanging from the truss and its beam to the floor, as one path. */
function fixture(x: number): string {
  const body = `M${x - 3.5} ${TRUSS_Y + 2}H${x + 3.5}V${TRUSS_Y + 7}H${x - 3.5}Z`;
  const beam = `M${x - 2} ${TRUSS_Y + 7}L${x - 9} ${FLOOR_Y}M${x + 2} ${TRUSS_Y + 7}L${x + 9} ${FLOOR_Y}`;
  return body + beam;
}

/** A floor uplight and its beam going up. */
function uplight(x: number): string {
  const body = `M${x - 3} ${FLOOR_Y - 4}H${x + 3}V${FLOOR_Y}H${x - 3}Z`;
  const beam = `M${x - 1.5} ${FLOOR_Y - 4}L${x - 6} ${FLOOR_Y - 26}M${x + 1.5} ${FLOOR_Y - 4}L${x + 6} ${FLOOR_Y - 26}`;
  return body + beam;
}

/** A small backlight on the second truss, beam pointing down. */
function backlight(x: number): string {
  return `M${x - 2.5} ${TRUSS2_Y + 1}H${x + 2.5}V${TRUSS2_Y + 5}H${x - 2.5}ZM${x - 1.5} ${TRUSS2_Y + 5}L${x - 5} ${FLOOR_Y - 8}M${x + 1.5} ${TRUSS2_Y + 5}L${x + 5} ${FLOOR_Y - 8}`;
}

const lines: BlueprintLine[] = [
  { id: 'ma3-truss', view: 'front', kind: 'visible', lab: L1, stage: 'channel', d: `M4 ${TRUSS_Y}H116M4 ${TRUSS_Y - 2}H116` },
  { id: 'ma3-floor', view: 'front', kind: 'visible', lab: L1, stage: 'universe', d: `M0 ${FLOOR_Y}H120` },
  ...L1_STAGES.map(
    (stage, i): BlueprintLine => ({ id: `ma3-l1-${stage}`, view: 'front', kind: 'visible', lab: L1, stage, d: fixture(14 + i * 18.4) }),
  ),
  ...L2_STAGES.map(
    (stage, i): BlueprintLine => ({ id: `ma3-l2-${stage}`, view: 'front', kind: 'visible', lab: L2, stage, d: uplight(23 + i * 18.4) }),
  ),
  { id: 'ma3-truss2', view: 'front', kind: 'visible', lab: L3, stage: 'select', d: `M12 ${TRUSS2_Y}H108` },
  ...L3_STAGES.map(
    (stage, i): BlueprintLine => ({ id: `ma3-l3-${stage}`, view: 'front', kind: 'visible', lab: L3, stage, d: backlight(17 + i * 12.3) }),
  ),
];

export const PLOT_BLUEPRINT: Blueprint = {
  viewBox: { front: '-2 0 124 62', side: '0 0 1 1', top: '0 0 1 1' },
  lines,
};
