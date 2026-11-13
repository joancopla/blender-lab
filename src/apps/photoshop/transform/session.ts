/**
 * A running transform: from Edición > Transformación libre (or a Transformar
 * command) until it is committed or cancelled. Pure data and functions.
 *
 * The box always starts as the upright rectangle around the layer, with W and
 * H at 100 % and the angle at 0°, as Photoshop does with a pixel layer that was
 * transformed before. What the student does to the box is applied to the
 * layer's corners.
 */
import { type Quad, type Rect, applyMat, mapQuad, quadBounds, rectQuad, rectToQuad } from '../geometry';
import type { TransformMode } from './transform';

export interface TransformSession {
  readonly layerId: string;
  readonly mode: TransformMode;
  /** The layer's corners when the transform started. */
  readonly layerQuad: Quad;
  /** The box when the transform started. */
  readonly start: Rect;
  /** The box now. */
  readonly box: Quad;
  /** Earlier boxes, for Ctrl + Z inside the transform. */
  readonly undo: readonly Quad[];
}

export function beginSession(layerId: string, layerQuad: Quad, mode: TransformMode): TransformSession {
  // FIDELITY? Photoshop draws the box around the layer's non-transparent pixels;
  // the lab uses the corners of the content, which its documents keep tight.
  const start = quadBounds(layerQuad);
  return { layerId, mode, layerQuad, start, box: rectQuad(start), undo: [] };
}

/** The layer's corners with the box as it is now. */
export function sessionLayerQuad(s: TransformSession): Quad {
  const m = rectToQuad(s.start, s.box);
  return mapQuad(s.layerQuad, (p) => applyMat(m, p));
}

/** A finished adjustment (a drag, a typed value, a menu command): one Ctrl + Z step. */
export function pushBox(s: TransformSession, box: Quad): TransformSession {
  return { ...s, box, undo: [...s.undo, s.box] };
}

/** Ctrl + Z inside the transform. FIDELITY? Photoshop may only undo the last adjustment. */
export function undoBox(s: TransformSession): TransformSession {
  const last = s.undo[s.undo.length - 1];
  return last ? { ...s, box: last, undo: s.undo.slice(0, -1) } : s;
}

export const withMode = (s: TransformSession, mode: TransformMode): TransformSession => ({ ...s, mode });

/** True if the box is still the one the transform started with. */
export function isUntouched(s: TransformSession): boolean {
  const start = rectQuad(s.start);
  return s.box.every((p, i) => p.x === start[i]!.x && p.y === start[i]!.y);
}
