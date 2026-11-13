/**
 * 2D geometry in document pixels (origin top left, y down, as in Photoshop):
 * points, quads and the projective maps (homographies) between them.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Corners in this order: top left, top right, bottom right, bottom left. */
export type Quad = readonly [Point, Point, Point, Point];

/** Row-major 3×3 matrix. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const pt = (x: number, y: number): Point => ({ x, y });
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
export const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;
export const len = (a: Point): number => Math.hypot(a.x, a.y);
export const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const dist = (a: Point, b: Point): number => len(sub(a, b));

/** Unit vector (zero stays zero). */
export function unit(a: Point): Point {
  const l = len(a);
  return l === 0 ? a : mul(a, 1 / l);
}

export function rotateAround(p: Point, centre: Point, radians: number): Point {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const d = sub(p, centre);
  return { x: centre.x + d.x * c - d.y * s, y: centre.y + d.x * s + d.y * c };
}

export const rectQuad = (r: Rect): Quad => [pt(r.x, r.y), pt(r.x + r.w, r.y), pt(r.x + r.w, r.y + r.h), pt(r.x, r.y + r.h)];

export const mapQuad = (q: Quad, fn: (p: Point, i: number) => Point): Quad => [fn(q[0], 0), fn(q[1], 1), fn(q[2], 2), fn(q[3], 3)];

/** Average of the four corners. */
export const quadCentre = (q: Quad): Point => pt((q[0].x + q[1].x + q[2].x + q[3].x) / 4, (q[0].y + q[1].y + q[2].y + q[3].y) / 4);

/** Axis-aligned bounding box of the corners. */
export function quadBounds(q: Quad): Rect {
  const xs = q.map((p) => p.x);
  const ys = q.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Signed area (positive when the corners run clockwise on screen, y down). */
export function quadArea(q: Quad): number {
  let a = 0;
  for (let i = 0; i < 4; i++) a += cross(q[i]!, q[(i + 1) % 4]!);
  return a / 2;
}

/** True when the quad is convex and not degenerate (a homography exists). */
export function isConvex(q: Quad, minArea = 1): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross(sub(q[(i + 1) % 4]!, q[i]!), sub(q[(i + 2) % 4]!, q[(i + 1) % 4]!));
    if (c === 0) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return Math.abs(quadArea(q)) >= minArea;
}

/** True when the quad is a parallelogram (an affine map of a rectangle). */
export function isParallelogram(q: Quad, tolerance = 1e-6): boolean {
  return Math.abs(q[0].x + q[2].x - q[1].x - q[3].x) <= tolerance && Math.abs(q[0].y + q[2].y - q[1].y - q[3].y) <= tolerance;
}

export function pointInQuad(p: Point, q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross(sub(q[(i + 1) % 4]!, q[i]!), sub(p, q[i]!));
    if (c === 0) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

export function matMul(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) out.push(a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!);
  }
  return out as unknown as Mat3;
}

/** Inverse up to scale (the adjugate), which is all a homography needs. */
export function matInverse(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  return [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d];
}

export function applyMat(m: Mat3, p: Point): Point {
  const w = m[6] * p.x + m[7] * p.y + m[8];
  return { x: (m[0] * p.x + m[1] * p.y + m[2]) / w, y: (m[3] * p.x + m[4] * p.y + m[5]) / w };
}

/** Homography that takes the unit square (0,0)-(1,1) to a quad (Heckbert). */
function unitSquareToQuad(q: Quad): Mat3 {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dy1 * dx2;
  const g = den === 0 ? 0 : (sx * dy2 - sy * dx2) / den;
  const h = den === 0 ? 0 : (dx1 * sy - dy1 * sx) / den;
  return [p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x, p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y, g, h, 1];
}

/** Homography that takes a rectangle to a quad (corner to corner). */
export function rectToQuad(r: Rect, q: Quad): Mat3 {
  const normalise: Mat3 = [1 / r.w, 0, -r.x / r.w, 0, 1 / r.h, -r.y / r.h, 0, 0, 1];
  return matMul(unitSquareToQuad(q), normalise);
}

/** Homography that takes a quad to a rectangle. */
export const quadToRect = (q: Quad, r: Rect): Mat3 => matInverse(rectToQuad(r, q));
