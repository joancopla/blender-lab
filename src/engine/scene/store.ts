/**
 * Holds the current scene state and the undo history. Every change goes through
 * `execute`, which records one undo step, like a confirmed Blender operator.
 */
import type { SceneState } from './scene';

/** Preferences > System > Undo Steps (Blender default). */
export const UNDO_STEPS = 32;

export interface OperatorCall {
  /** Blender operator name, as it would appear in Edit > Undo History. */
  readonly name: string;
  apply(scene: SceneState): SceneState;
}

export type LogEntry =
  | { readonly kind: 'execute'; readonly name: string }
  | { readonly kind: 'undo'; readonly name: string }
  | { readonly kind: 'redo'; readonly name: string };

interface Step {
  readonly name: string;
  readonly state: SceneState;
}

export class SceneStore {
  private steps: Step[];
  private index = 0;
  private listeners = new Set<() => void>();
  /** Everything the student did, in order (used by stage checks). */
  readonly log: LogEntry[] = [];

  constructor(initial: SceneState) {
    this.steps = [{ name: 'Original', state: initial }];
  }

  get state(): SceneState {
    return this.steps[this.index]!.state;
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.steps.length - 1;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Runs an operator. If it changes nothing, no undo step is recorded.
   * Returns true if the scene changed.
   */
  execute(op: OperatorCall): boolean {
    const next = op.apply(this.state);
    if (next === this.state) return false;
    this.steps = this.steps.slice(0, this.index + 1);
    this.steps.push({ name: op.name, state: next });
    // Keep the original plus UNDO_STEPS steps.
    while (this.steps.length > UNDO_STEPS + 1) this.steps.shift();
    this.index = this.steps.length - 1;
    this.log.push({ kind: 'execute', name: op.name });
    this.emit();
    return true;
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    const name = this.steps[this.index]!.name;
    this.index--;
    this.log.push({ kind: 'undo', name });
    this.emit();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo) return false;
    this.index++;
    this.log.push({ kind: 'redo', name: this.steps[this.index]!.name });
    this.emit();
    return true;
  }

  /** Starts over from a new scene (stage load / reset). Clears history and log. */
  reset(initial: SceneState): void {
    this.steps = [{ name: 'Original', state: initial }];
    this.index = 0;
    this.log.length = 0;
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
