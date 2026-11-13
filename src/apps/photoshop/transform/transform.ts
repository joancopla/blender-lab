/**
 * The transform box (Edición > Transformación libre and Edición > Transformar):
 * what dragging each handle does to the four corners, with the keyboard
 * modifiers. Pure functions, no DOM.
 *
 * Every rule here is a behaviour of Photoshop to validate with the program open
 * (docs/fidelity/photoshop.md, "Lab 01 — Transformar").
 */
import { type Point, type Quad, type Rect, add, cross, dot, isConvex, len, mapQuad, mid, mul, pt, quadCentre, rotateAround, sub, unit } from '../geometry';

/** Corner handles, side handles, the inside of the box and everything outside it. */
export type Handle = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'r' | 'b' | 'l' | 'inside' | 'outside';

/** Free Transform or one of the Edición > Transformar commands. */
export type TransformMode = 'free' | 'scale' | 'rotate' | 'skew' | 'distort' | 'perspective';

export interface Modifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly ctrl: boolean;
}

export type DragAction = 'move' | 'scale' | 'rotate' | 'skew' | 'distort' | 'perspective' | 'none';

const CORNERS = ['tl', 'tr', 'br', 'bl'] as const;
const SIDES = ['t', 'r', 'b', 'l'] as const;
const cornerIndex = (h: Handle): number => (CORNERS as readonly string[]).indexOf(h);
const sideIndex = (h: Handle): number => (SIDES as readonly string[]).indexOf(h);
const isCorner = (h: Handle): boolean => cornerIndex(h) >= 0;

/** The two corners of a side: t = 0,1; r = 1,2; b = 2,3; l = 3,0. */
const sideCorners = (side: number): [number, number] => [side, (side + 1) % 4];

/** Where a handle sits on the box. */
export function handlePoint(q: Quad, h: Handle): Point {
  const c = cornerIndex(h);
  if (c >= 0) return q[c]!;
  const s = sideIndex(h);
  if (s >= 0) {
    const [a, b] = sideCorners(s);
    return mid(q[a]!, q[b]!);
  }
  return quadCentre(q);
}

/** What a drag does, from the command in use, the handle and the keys held. */
export function dragAction(mode: TransformMode, handle: Handle, mods: Modifiers): DragAction {
  if (handle === 'inside') return 'move';
  if (handle === 'outside') {
    // FIDELITY? Outside the box only Free Transform and Rotate do something.
    return mode === 'free' || mode === 'rotate' ? 'rotate' : 'none';
  }
  switch (mode) {
    case 'free':
      if (isCorner(handle)) {
        if (mods.ctrl && mods.alt && mods.shift) return 'perspective';
        return mods.ctrl ? 'distort' : 'scale';
      }
      if (mods.ctrl && mods.shift) return 'skew';
      return mods.ctrl ? 'distort' : 'scale';
    case 'scale':
      return 'scale';
    case 'rotate':
      // FIDELITY? In Rotate, dragging a handle rotates too.
      return 'rotate';
    case 'skew':
      return 'skew';
    case 'distort':
      return 'distort';
    case 'perspective':
      // FIDELITY? In Perspective, side handles slide along their side.
      return isCorner(handle) ? 'perspective' : 'skew';
  }
}

/** Angle of the top side in degrees, clockwise on screen, in (−180, 180]. */
export function quadAngle(q: Quad): number {
  const u = sub(q[1], q[0]);
  return (Math.atan2(u.y, u.x) * 180) / Math.PI;
}

const SNAP_DEGREES = 15;

/**
 * The box after dragging `handle` from `from` to `to`, starting from `base`
 * (the box when the button went down). Returns `base` when the drag does
 * nothing or would fold the box.
 */
export function dragQuad(base: Quad, mode: TransformMode, handle: Handle, from: Point, to: Point, mods: Modifiers): Quad {
  const action = dragAction(mode, handle, mods);
  const d = sub(to, from);
  let next: Quad;
  switch (action) {
    case 'none':
      return base;
    case 'move':
      next = move(base, d, mods.shift);
      break;
    case 'rotate':
      next = rotate(base, from, to, mods.shift);
      break;
    case 'scale':
      next = scale(base, handle, d, mods);
      break;
    case 'skew':
      next = skew(base, handle, d, mods.alt);
      break;
    case 'distort':
      // FIDELITY? Free Transform: Ctrl + Shift on a corner keeps it on one of its sides.
      next = distort(base, handle, d, mods.alt, mode === 'free' && mods.shift);
      break;
    case 'perspective':
      next = perspective(base, handle, d);
      break;
  }
  return isConvex(next) ? next : base;
}

/** Shift keeps the move horizontal, vertical or at 45°. FIDELITY? */
function move(base: Quad, d: Point, constrain: boolean): Quad {
  let delta = d;
  if (constrain) {
    const ax = Math.abs(d.x);
    const ay = Math.abs(d.y);
    if (ax > 2 * ay) delta = pt(d.x, 0);
    else if (ay > 2 * ax) delta = pt(0, d.y);
    else {
      const m = (ax + ay) / 2;
      delta = pt(Math.sign(d.x) * m, Math.sign(d.y) * m);
    }
  }
  return mapQuad(base, (p) => add(p, delta));
}

/** Around the centre of the box. Shift: the angle of the box snaps to 15° steps. */
function rotate(base: Quad, from: Point, to: Point, snap: boolean): Quad {
  const c = quadCentre(base);
  let turn = Math.atan2(to.y - c.y, to.x - c.x) - Math.atan2(from.y - c.y, from.x - c.x);
  if (snap) {
    const step = (SNAP_DEGREES * Math.PI) / 180;
    const start = (quadAngle(base) * Math.PI) / 180;
    turn = Math.round((start + turn) / step) * step - start;
  }
  return mapQuad(base, (p) => rotateAround(p, c, turn));
}

/** Coordinates of `p` in the basis (u, v). */
function inBasis(p: Point, u: Point, v: Point): Point {
  const det = cross(u, v);
  return det === 0 ? pt(0, 0) : pt(cross(p, v) / det, cross(u, p) / det);
}

/**
 * Scale along the box's own sides. Proportional by default; Shift frees it
 * (default since Photoshop CC 2019; "Use Legacy Free Transform" swaps it).
 * Alt scales from the centre instead of from the opposite handle.
 */
function scale(base: Quad, handle: Handle, d: Point, mods: Modifiers): Quad {
  const u = sub(base[1], base[0]);
  const v = sub(base[3], base[0]);
  const proportional = !mods.shift;
  const c = cornerIndex(handle);
  const s = sideIndex(handle);
  const grabbed = handlePoint(base, handle);
  let anchor: Point;
  if (mods.alt) anchor = quadCentre(base);
  else if (c >= 0) anchor = base[(c + 2) % 4]!;
  else {
    const [a, b] = sideCorners((s + 2) % 4);
    anchor = mid(base[a]!, base[b]!);
  }
  const r0 = sub(grabbed, anchor);
  const r1 = add(r0, d);
  let sx = 1;
  let sy = 1;
  if (c >= 0) {
    if (proportional) {
      const k = dot(r0, r0);
      sx = sy = k === 0 ? 1 : dot(r1, r0) / k;
    } else {
      const a0 = inBasis(r0, u, v);
      const a1 = inBasis(r1, u, v);
      sx = a0.x === 0 ? 1 : a1.x / a0.x;
      sy = a0.y === 0 ? 1 : a1.y / a0.y;
    }
  } else {
    const a0 = inBasis(r0, u, v);
    const a1 = inBasis(r1, u, v);
    // Top and bottom handles scale along v; left and right, along u.
    const vertical = s === 0 || s === 2;
    const k = vertical ? (a0.y === 0 ? 1 : a1.y / a0.y) : a0.x === 0 ? 1 : a1.x / a0.x;
    // FIDELITY? Side handles are proportional by default too.
    if (vertical) {
      sy = k;
      sx = proportional ? k : 1;
    } else {
      sx = k;
      sy = proportional ? k : 1;
    }
  }
  return mapQuad(base, (p) => {
    const a = inBasis(sub(p, anchor), u, v);
    return add(anchor, add(mul(u, a.x * sx), mul(v, a.y * sy)));
  });
}

/** Direction of the top side (0) or of the left side (1), as unit vectors. */
const sideDirection = (base: Quad, vertical: boolean): Point => unit(vertical ? sub(base[3], base[0]) : sub(base[1], base[0]));

/** The adjacent-side direction the drag follows most. */
function dominant(base: Quad, d: Point): { dir: Point; amount: number; vertical: boolean } {
  const h = sideDirection(base, false);
  const v = sideDirection(base, true);
  const ah = dot(d, h);
  const av = dot(d, v);
  return Math.abs(ah) >= Math.abs(av) ? { dir: h, amount: ah, vertical: false } : { dir: v, amount: av, vertical: true };
}

/**
 * Skew: a side handle slides along its own side; with Alt the opposite side
 * slides the other way. FIDELITY? A corner handle slides along one of its sides.
 */
function skew(base: Quad, handle: Handle, d: Point, symmetric: boolean): Quad {
  const s = sideIndex(handle);
  if (s >= 0) {
    const dir = sideDirection(base, s === 1 || s === 3);
    const shift = mul(dir, dot(d, dir));
    const [a, b] = sideCorners(s);
    return mapQuad(base, (p, i) => (i === a || i === b ? add(p, shift) : symmetric ? sub(p, shift) : p));
  }
  const c = cornerIndex(handle);
  const { dir, amount } = dominant(base, d);
  const shift = mul(dir, amount);
  return mapQuad(base, (p, i) => (i === c ? add(p, shift) : symmetric && i === (c + 2) % 4 ? sub(p, shift) : p));
}

/**
 * Distort: a corner moves on its own; a side handle carries its two corners.
 * With Alt, the opposite corner or side mirrors the move.
 */
function distort(base: Quad, handle: Handle, d: Point, symmetric: boolean, alongSide: boolean): Quad {
  const c = cornerIndex(handle);
  if (c >= 0) {
    const shift = alongSide ? mul(dominant(base, d).dir, dominant(base, d).amount) : d;
    return mapQuad(base, (p, i) => (i === c ? add(p, shift) : symmetric && i === (c + 2) % 4 ? sub(p, shift) : p));
  }
  const [a, b] = sideCorners(sideIndex(handle));
  return mapQuad(base, (p, i) => (i === a || i === b ? add(p, d) : symmetric ? sub(p, d) : p));
}

/**
 * Perspective: the corner slides along one of its sides and the corner at the
 * other end of that side mirrors it.
 */
function perspective(base: Quad, handle: Handle, d: Point): Quad {
  const c = cornerIndex(handle);
  const { dir, amount, vertical } = dominant(base, d);
  // Along the top or bottom side the partner is the horizontal neighbour (0-1, 3-2);
  // along the left or right side, the vertical one (0-3, 1-2).
  const partner = vertical ? [3, 2, 1, 0][c]! : [1, 0, 3, 2][c]!;
  const shift = mul(dir, amount);
  return mapQuad(base, (p, i) => (i === c ? add(p, shift) : i === partner ? sub(p, shift) : p));
}

// --- Options bar values ----------------------------------------------------------------------

/** What the options bar shows for the box, relative to the box at the start. */
export interface Readout {
  /** Centre of the box (the reference point when it is hidden). FIDELITY? */
  readonly x: number;
  readonly y: number;
  /** Percent of the starting width and height. */
  readonly w: number;
  readonly h: number;
  /** Degrees, clockwise. */
  readonly angle: number;
  /** Horizontal skew in degrees. FIDELITY? Sign and how Photoshop splits skew and rotation. */
  readonly skew: number;
}

/** Reads position, size, angle and skew from the box (exact for a parallelogram). */
export function readout(start: Rect, q: Quad): Readout {
  const c = quadCentre(q);
  const u = sub(q[1], q[0]);
  const v = sub(q[3], q[0]);
  const radians = Math.atan2(u.y, u.x);
  // The left side seen from the rotated box.
  const vx = v.x * Math.cos(-radians) - v.y * Math.sin(-radians);
  const vy = v.x * Math.sin(-radians) + v.y * Math.cos(-radians);
  return {
    x: c.x,
    y: c.y,
    w: (len(u) / start.w) * 100,
    h: (vy / start.h) * 100,
    angle: (radians * 180) / Math.PI,
    skew: vy === 0 ? 0 : (Math.atan2(vx, Math.abs(vy)) * 180) / Math.PI,
  };
}

/** The parallelogram with these options bar values (the inverse of `readout`). */
export function fromReadout(start: Rect, r: Readout): Quad {
  const radians = (r.angle * Math.PI) / 180;
  const w = (start.w * r.w) / 100;
  const h = (start.h * r.h) / 100;
  const lean = Math.abs(h) * Math.tan((r.skew * Math.PI) / 180);
  const turn = (p: Point): Point => rotateAround(p, pt(0, 0), radians);
  const u = turn(pt(w, 0));
  const v = turn(pt(lean, h));
  const tl = sub(pt(r.x, r.y), mul(add(u, v), 0.5));
  return [tl, add(tl, u), add(add(tl, u), v), add(tl, v)];
}

// --- Commands without a box ------------------------------------------------------------------

export type QuickTransform = 'rotate180' | 'rotate90cw' | 'rotate90ccw' | 'flipH' | 'flipV';

/** Rotate 180°, Rotate 90° and Flip, around the centre of the box. */
export function quickTransform(q: Quad, kind: QuickTransform, centre: Point = quadCentre(q)): Quad {
  switch (kind) {
    case 'rotate180':
      return mapQuad(q, (p) => rotateAround(p, centre, Math.PI));
    case 'rotate90cw':
      return mapQuad(q, (p) => rotateAround(p, centre, Math.PI / 2));
    case 'rotate90ccw':
      return mapQuad(q, (p) => rotateAround(p, centre, -Math.PI / 2));
    case 'flipH':
      return mapQuad(q, (p) => pt(2 * centre.x - p.x, p.y));
    case 'flipV':
      return mapQuad(q, (p) => pt(p.x, 2 * centre.y - p.y));
  }
}
