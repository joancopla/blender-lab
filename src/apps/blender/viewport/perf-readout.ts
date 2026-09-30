/**
 * Performance readout for testing on classroom computers: frames per second,
 * typical frame time in Rendered, draw calls, resolution scale and samples.
 * Only shown when the address has ?perf (e.g. .../labs/04-lights/?perf).
 * A testing aid, not part of the replica.
 */
import { t } from '../../../core/i18n';

export interface PerfFrame {
  readonly calls: number;
  /** Buffer resolution relative to the screen's (capped). */
  readonly scale: number;
  /** Median chained frame time in Rendered (ms), 0 if not measured yet. */
  readonly typicalMs: number;
  /** Progressive samples so far, or null outside Rendered. */
  readonly samples: number | null;
}

/** Frames older than this don't count for the frame rate. */
const WINDOW_MS = 1000;

export class PerfReadout {
  private readonly box: HTMLElement;
  private readonly times: number[] = [];

  static fromLocation(container: HTMLElement): PerfReadout | null {
    try {
      return new URLSearchParams(window.location.search).has('perf') ? new PerfReadout(container) : null;
    } catch {
      return null;
    }
  }

  private constructor(container: HTMLElement) {
    this.box = document.createElement('div');
    this.box.className = 'bl-perf';
    this.box.setAttribute('aria-hidden', 'true');
    container.append(this.box);
  }

  frame(now: number, chained: boolean, f: PerfFrame): void {
    // Frame rate only over runs of chained frames: idle time is not slowness.
    if (!chained) this.times.length = 0;
    this.times.push(now);
    while (this.times.length > 0 && now - this.times[0]! > WINDOW_MS) this.times.shift();
    const fps = this.times.length > 1 ? ((this.times.length - 1) * 1000) / (now - this.times[0]!) : null;
    const lines = [
      t('perf.fps', { n: fps === null ? '–' : Math.round(fps) }),
      t('perf.frame', { ms: f.typicalMs > 0 ? f.typicalMs.toFixed(1) : '–' }),
      t('perf.calls', { n: f.calls }),
      t('perf.scale', { n: Math.round(f.scale * 100) }),
    ];
    if (f.samples !== null) lines.push(t('perf.samples', { n: f.samples }));
    this.box.textContent = lines.join('\n');
  }
}
