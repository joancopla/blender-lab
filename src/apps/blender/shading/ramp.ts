/**
 * Color Ramp evaluation, as Blender does it on the CPU before handing the ramp to
 * the GPU as a table.
 *
 * Adapted from Blender 5.2.1 (GPL-2.0-or-later, Blender Authors):
 * source/blender/blenkernel/intern/colorband.cc (BKE_colorband_evaluate,
 * BKE_colorband_evaluate_table_rgba) and key.cc (key_curve_position_weights).
 * No DOM, no three.js.
 */
import type { ColorRampData, ColorRampStop } from './node-types';

type RGBA = [number, number, number, number];

/** CM_TABLE + 1: the number of entries of the table sent to the GPU. */
export const RAMP_TABLE_SIZE = 257;

/** key_curve_position_weights for KEY_CARDINAL (fc = 0.71) and KEY_BSPLINE. */
function curveWeights(t: number, type: 'CARDINAL' | 'B_SPLINE'): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  if (type === 'CARDINAL') {
    const fc = 0.71;
    return [
      -fc * t3 + 2 * fc * t2 - fc * t,
      (2 - fc) * t3 + (fc - 3) * t2 + 1,
      (fc - 2) * t3 + (3 - 2 * fc) * t2 + fc * t,
      fc * t3 - fc * t2,
    ];
  }
  return [
    -0.16666666 * t3 + 0.5 * t2 - 0.5 * t + 0.16666666,
    0.5 * t3 - t2 + 0.66666666,
    -0.5 * t3 + 0.5 * t2 + 0.5 * t + 0.16666666,
    0.16666666 * t3,
  ];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Blender keeps the stops sorted by position (vergcband). */
export const sortedStops = (r: ColorRampData): ColorRampStop[] => [...r.stops].sort((a, b) => a.position - b.position);

/**
 * BKE_colorband_evaluate. Only the RGB colour mode is replicated (the lab's ramp
 * widget only offers RGB); HSV and HSL fall back to RGB. FIDELITY?
 */
export function evaluateRamp(r: ColorRampData, input: number): RGBA {
  const stops = sortedStops(r);
  const tot = stops.length;
  if (tot === 0) return [0, 0, 0, 0];
  const col = (s: ColorRampStop): RGBA => [s.color[0], s.color[1], s.color[2], s.color[3]];
  const ipo = r.interpolation;
  const simple = ipo === 'LINEAR' || ipo === 'EASE' || ipo === 'CONSTANT';
  if (tot === 1) return col(stops[0]!);
  if (input <= stops[0]!.position && simple) return col(stops[0]!);

  // The first stop whose position is greater than the input.
  let a = 0;
  while (a < tot && stops[a]!.position <= input) a++;
  let cbd1: ColorRampStop;
  let cbd2: ColorRampStop;
  if (a === tot) {
    cbd2 = stops[a - 1]!;
    cbd1 = { ...cbd2, position: 1 };
  } else if (a === 0) {
    cbd1 = stops[0]!;
    cbd2 = { ...cbd1, position: 0 };
  } else {
    cbd1 = stops[a]!;
    cbd2 = stops[a - 1]!;
  }
  if (a === tot && simple) return col(cbd2);
  if (ipo === 'CONSTANT') return col(cbd2);

  let fac = cbd2.position !== cbd1.position ? (input - cbd1.position) / (cbd2.position - cbd1.position) : a !== tot ? 0 : 1;
  if (ipo === 'B_SPLINE' || ipo === 'CARDINAL') {
    // Interpolate from right to left: 3 2 1 0.
    const cbd0 = a >= tot - 1 ? cbd1 : stops[a + 1]!;
    const cbd3 = a < 2 ? cbd2 : stops[a - 2]!;
    fac = clamp01(fac);
    const t = curveWeights(fac, ipo);
    const out: RGBA = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      out[i] = clamp01(t[3] * cbd3.color[i]! + t[2] * cbd2.color[i]! + t[1] * cbd1.color[i]! + t[0] * cbd0.color[i]!);
    }
    return out;
  }
  if (ipo === 'EASE') {
    const fac2 = fac * fac;
    fac = 3 * fac2 - 2 * fac2 * fac;
  }
  const mfac = 1 - fac;
  return [0, 1, 2, 3].map((i) => mfac * cbd1.color[i]! + fac * cbd2.color[i]!) as RGBA;
}

/** BKE_colorband_evaluate_table_rgba: 257 RGBA entries for input 0, 1/256 ... 1. */
export function rampTable(r: ColorRampData): Float32Array {
  const out = new Float32Array(RAMP_TABLE_SIZE * 4);
  for (let i = 0; i < RAMP_TABLE_SIZE; i++) out.set(evaluateRamp(r, i / (RAMP_TABLE_SIZE - 1)), i * 4);
  return out;
}
