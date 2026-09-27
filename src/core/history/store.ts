/**
 * Undo/redo history for any replicated program (command pattern over immutable
 * states). Every change goes through `execute`, which records one undo step.
 * It also keeps the operation log that stage checks read.
 */

/** Default number of undo steps (Blender's Preferences > System > Undo Steps). */
export const UNDO_STEPS = 32;

export interface OperatorCall<S> {
  /** Operator name, as the program shows it in its undo history. */
  readonly name: string;
  apply(state: S): S;
}

export type LogEntry =
  | { readonly kind: 'execute'; readonly name: string }
  | { readonly kind: 'undo'; readonly name: string }
  | { readonly kind: 'redo'; readonly name: string }
  | { readonly kind: 'cancel'; readonly name: string; readonly via: 'rightClick' | 'escape' };

interface Step<S> {
  readonly name: string;
  readonly state: S;
}

export class HistoryStore<S> {
  private steps: Step<S>[];
  private index = 0;
  private listeners = new Set<() => void>();
  private previewState: S | null = null;
  /** Everything the student did, in order (used by stage checks). */
  readonly log: LogEntry[] = [];

  constructor(initial: S) {
    this.steps = [{ name: 'Original', state: initial }];
  }

  get state(): S {
    return this.steps[this.index]!.state;
  }

  /**
   * What the viewport and panels show: the preview of a running modal operator,
   * or the committed state.
   */
  get displayState(): S {
    return this.previewState ?? this.state;
  }

  /** Shows an uncommitted state while a modal operator runs (null to clear it). */
  setPreview(state: S | null): void {
    this.previewState = state;
    this.emit();
  }

  /** Records a cancelled modal operator in the log (no undo step). */
  logCancel(name: string, via: 'rightClick' | 'escape'): void {
    this.previewState = null;
    this.log.push({ kind: 'cancel', name, via });
    this.emit();
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
  execute(op: OperatorCall<S>): boolean {
    this.previewState = null;
    const next = op.apply(this.state);
    if (next === this.state) {
      this.emit();
      return false;
    }
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
  reset(initial: S): void {
    this.previewState = null;
    this.steps = [{ name: 'Original', state: initial }];
    this.index = 0;
    this.log.length = 0;
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
