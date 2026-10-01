/**
 * Final challenge of the grandMA3 course: a lighting plot in front view (one
 * truss, the floor and the fixtures with their beams). Every stage passed draws
 * a fixture and its beam. Lab 01 earns the hanging rig, Lab 02 the floor uplights.
 * Which stage earns which line is a teaching choice, to be validated by the teacher.
 */
import type { Blueprint, BlueprintLine } from '../../core/shell/blueprint';

const L1 = 'ma3-01-dmx';
const L1_STAGES = ['channel', 'address', 'footprint', 'next-address', 'fit', 'universe'] as const;
const L2 = 'ma3-02-addresses';
const L2_STAGES = ['percent', 'colour', 'row', 'mixed', 'absolute', 'overflow'] as const;

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

const lines: BlueprintLine[] = [
  { id: 'ma3-truss', view: 'front', kind: 'visible', lab: L1, stage: 'channel', d: `M4 ${TRUSS_Y}H116M4 ${TRUSS_Y - 2}H116` },
  { id: 'ma3-floor', view: 'front', kind: 'visible', lab: L1, stage: 'universe', d: `M0 ${FLOOR_Y}H120` },
  ...L1_STAGES.map(
    (stage, i): BlueprintLine => ({ id: `ma3-l1-${stage}`, view: 'front', kind: 'visible', lab: L1, stage, d: fixture(14 + i * 18.4) }),
  ),
  ...L2_STAGES.map(
    (stage, i): BlueprintLine => ({ id: `ma3-l2-${stage}`, view: 'front', kind: 'visible', lab: L2, stage, d: uplight(23 + i * 18.4) }),
  ),
];

export const PLOT_BLUEPRINT: Blueprint = {
  viewBox: { front: '-2 0 124 62', side: '0 0 1 1', top: '0 0 1 1' },
  lines,
};
