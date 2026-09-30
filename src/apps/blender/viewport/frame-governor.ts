/**
 * Adaptive resolution for Rendered shading on modest classroom computers.
 * Only frames the renderer chains itself (progressive samples, view
 * animations) are timed: their spacing is the real cost of a frame, while
 * frames drawn in answer to the mouse are spaced by the user's movement.
 * When the typical frame is too slow the resolution scale steps down; when
 * there is plenty of room it steps back up. Not a Blender feature: the lab's
 * own way to keep the viewport fluid (Blender has a manual resolution scale).
 */

/** Resolution scales, from full quality down. */
export const RESOLUTION_SCALES = [1, 0.75, 0.5] as const;

/** Frames per decision. */
const WINDOW = 24;
/** Slower than this (ms) and the scale steps down (under ~45 fps). */
const SLOW_MS = 22;
/** Faster than this (ms) for several windows and it steps back up. */
const FAST_MS = 10;
const FAST_WINDOWS = 3;
/** Longer gaps are pauses, not frames. */
const MAX_GAP_MS = 250;

function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export class FrameGovernor {
  private level = 0;
  private readonly deltas: number[] = [];
  private fastWindows = 0;
  private lastMedian = 0;

  /** Current resolution scale (1 = full). */
  get scale(): number {
    return RESOLUTION_SCALES[this.level]!;
  }

  /** Median spacing of the last full window of chained frames (ms), 0 if none yet. */
  get typicalFrameMs(): number {
    return this.lastMedian;
  }

  /**
   * Records the time between two chained frames. Returns true when the scale
   * changed (the caller resizes its buffers).
   */
  record(deltaMs: number): boolean {
    if (!(deltaMs > 0) || deltaMs > MAX_GAP_MS) return false;
    this.deltas.push(deltaMs);
    if (this.deltas.length < WINDOW) return false;
    const m = median(this.deltas);
    this.deltas.length = 0;
    this.lastMedian = m;
    if (m > SLOW_MS && this.level < RESOLUTION_SCALES.length - 1) {
      this.level++;
      this.fastWindows = 0;
      return true;
    }
    if (m < FAST_MS && this.level > 0) {
      if (++this.fastWindows >= FAST_WINDOWS) {
        this.level--;
        this.fastWindows = 0;
        return true;
      }
      return false;
    }
    this.fastWindows = 0;
    return false;
  }

  /** Forgets the frames being counted (e.g. after a change of shading mode). */
  restartWindow(): void {
    this.deltas.length = 0;
  }
}
