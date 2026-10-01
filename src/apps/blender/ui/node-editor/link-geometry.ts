/**
 * Geometry of node links, in editor (canvas) coordinates: the curve Blender draws
 * and the tests used to cut links with a stroke. No DOM.
 */

export interface P {
  readonly x: number;
  readonly y: number;
}

/**
 * Noodle curving of the default theme (space_node.noodle_curving = 4,
 * release/datafiles/userdef/userdef_default_theme.c). Blender's link handles stick out
 * horizontally by curving × 0.1 × |dx| (node_link_bezier_handles in node_draw.cc).
 * FIDELITY? Blender also keeps a minimum handle length for links going backwards.
 */
export const NOODLE_CURVING = 4;

export function linkHandles(a: P, b: P, curving = NOODLE_CURVING): [P, P, P, P] {
  const d = curving * 0.1 * Math.abs(a.x - b.x);
  return [a, { x: a.x + d, y: a.y }, { x: b.x - d, y: b.y }, b];
}

/** SVG path of a link from an output (a) to an input (b). */
export function linkPath(a: P, b: P): string {
  const [p0, p1, p2, p3] = linkHandles(a, b);
  return `M${p0.x} ${p0.y}C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
}

/** Points along the link's curve (for hit tests). */
export function linkPoints(a: P, b: P, steps = 24): P[] {
  const [p0, p1, p2, p3] = linkHandles(a, b);
  const out: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}

const cross = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Whether segments ab and cd cross. */
export function segmentsCross(a: P, b: P, c: P, d: P): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  // Touching at one end counts, so a stroke through a curve point still cuts.
  return ((d1 >= 0 && d2 < 0) || (d1 <= 0 && d2 > 0) || (d1 > 0 && d2 <= 0) || (d1 < 0 && d2 >= 0)) &&
    ((d3 >= 0 && d4 < 0) || (d3 <= 0 && d4 > 0) || (d3 > 0 && d4 <= 0) || (d3 < 0 && d4 >= 0));
}

/** Whether a polyline (the cut stroke) crosses the link from a to b. */
export function strokeCrossesLink(stroke: readonly P[], a: P, b: P): boolean {
  const pts = linkPoints(a, b);
  for (let i = 1; i < stroke.length; i++)
    for (let j = 1; j < pts.length; j++) if (segmentsCross(stroke[i - 1]!, stroke[i]!, pts[j - 1]!, pts[j]!)) return true;
  return false;
}

/** Distance from p to the link's curve (to highlight a link under a dragged node). */
export function distanceToLink(p: P, a: P, b: P): number {
  const pts = linkPoints(a, b);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const s = pts[i - 1]!;
    const e = pts[i]!;
    const dx = e.x - s.x;
    const dy = e.y - s.y;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / len));
    best = Math.min(best, Math.hypot(p.x - (s.x + t * dx), p.y - (s.y + t * dy)));
  }
  return best;
}

/** Whether two rectangles overlap (box select). */
export const rectsOverlap = (a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) =>
  a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
