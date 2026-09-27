/**
 * Number display in Blender's UI fields.
 * FIDELITY? Blender's exact precision rules (they depend on the unit system).
 */

/** Trims trailing zeros: 2.5000 -> 2.5, 2.0000 -> 2. */
function trim(v: number, decimals: number): string {
  const s = (Math.abs(v) < 0.5 * 10 ** -decimals ? 0 : v).toFixed(decimals);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Distances: "0 m", "2 m", "7.3589 m". */
export const formatDistance = (v: number): string => `${trim(v, 4)} m`;

/** Angles in degrees: "0°", "45°", "63.6°". */
export const formatAngle = (deg: number): string => `${trim(deg, 1)}°`;

/** Scale factors: "1.000". */
export const formatScale = (v: number): string => (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3);
