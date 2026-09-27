/**
 * Student progress per lab, saved in localStorage (wrapped: storage may be
 * unavailable, then progress only lasts for this visit).
 */
import type { StorageLike } from '../shell/prefs';

export interface Progress {
  readonly completed: readonly string[];
  /** Index of the stage to open, or -1 for free mode. */
  readonly current: number;
}

const EMPTY: Progress = { completed: [], current: 0 };

const keyFor = (labId: string) => `blender-lab:progress:${labId}`;

function defaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export class ProgressStore {
  private data: Progress;

  constructor(
    readonly labId: string,
    private readonly storage: StorageLike | null = defaultStorage(),
  ) {
    this.data = ProgressStore.read(labId, storage);
  }

  static read(labId: string, storage: StorageLike | null = defaultStorage()): Progress {
    try {
      const raw = storage?.getItem(keyFor(labId));
      if (!raw) return EMPTY;
      const d = JSON.parse(raw) as Partial<Progress>;
      return {
        completed: Array.isArray(d.completed) ? d.completed.filter((x): x is string => typeof x === 'string') : [],
        current: typeof d.current === 'number' && Number.isInteger(d.current) ? d.current : 0,
      };
    } catch {
      return EMPTY;
    }
  }

  get progress(): Progress {
    return this.data;
  }

  isCompleted(stageId: string): boolean {
    return this.data.completed.includes(stageId);
  }

  complete(stageId: string): void {
    if (this.isCompleted(stageId)) return;
    this.write({ ...this.data, completed: [...this.data.completed, stageId] });
  }

  setCurrent(index: number): void {
    if (index !== this.data.current) this.write({ ...this.data, current: index });
  }

  reset(): void {
    this.write(EMPTY);
  }

  private write(p: Progress): void {
    this.data = p;
    try {
      this.storage?.setItem(keyFor(this.labId), JSON.stringify(p));
    } catch {
      // Kept in memory only.
    }
  }
}
