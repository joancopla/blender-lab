/**
 * Stage runner: loads stages into the program, checks them whenever its state
 * changes, handles hints and saves progress. No DOM (the shell renders it) and
 * no knowledge of the program: it only uses the app contract.
 */
import type { LogEntry } from '../history/store';
import type { ProgressStore } from './progress';
import type { CheckResult, LabStages, StageDefinition } from './types';

/** The second hint appears on its own after this long without finishing. */
export const STUCK_MS = 90_000;

/** The part of the app contract the runner needs. */
export interface RunnerApp<State, Setup> {
  load(setup: Setup): void;
  getState(): State;
  readonly log: readonly LogEntry[];
}

export interface RunnerDeps<State, Setup> {
  readonly app: RunnerApp<State, Setup>;
  readonly progress: ProgressStore;
  now(): number;
}

export interface StageStatus<State = unknown, Setup = unknown, Decorations = unknown> {
  /** -1: free mode. */
  readonly index: number;
  readonly stage: StageDefinition<State, Setup, Decorations> | null;
  readonly result: CheckResult<Decorations>;
  /** Completed now or before (saved progress). */
  readonly completed: boolean;
  /** Number of hints visible (0, 1 or 2). */
  readonly hintsShown: number;
  /** Whether the student has done anything in this stage yet. */
  readonly interacted: boolean;
  /** Final challenge stats, once done. */
  readonly stats: { readonly seconds: number; readonly operations: number } | null;
}

export class StageRunner<State = unknown, Setup = unknown, Decorations = unknown> {
  private index = 0;
  private memory = new Map<string, unknown>();
  private initialState: State | null = null;
  private startedAt = 0;
  private hintsShown = 0;
  private result: CheckResult<Decorations> = { done: false };
  private doneAt: number | null = null;
  private interacted = false;
  private listeners = new Set<() => void>();

  constructor(
    readonly lab: LabStages<State, Setup, Decorations>,
    private readonly deps: RunnerDeps<State, Setup>,
  ) {}

  get stages(): readonly StageDefinition<State, Setup, Decorations>[] {
    return this.lab.stages;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Loads a stage (or free mode with -1) into the program. */
  load(index: number): void {
    const stage = this.lab.stages[index] ?? null;
    this.index = stage ? index : -1;
    this.memory = new Map();
    this.hintsShown = 0;
    this.result = { done: false };
    this.doneAt = null;
    this.startedAt = this.deps.now();
    this.initialState = null;
    this.deps.app.load(stage ? stage.setup() : this.lab.freeSetup());
    this.initialState = this.deps.app.getState();
    // Loading itself is not student activity.
    this.interacted = false;
    this.deps.progress.setCurrent(this.index);
    this.evaluate();
  }

  restart(): void {
    this.load(this.index);
  }

  get status(): StageStatus<State, Setup, Decorations> {
    const stage = this.lab.stages[this.index] ?? null;
    const completed = stage ? this.result.done || this.deps.progress.isCompleted(stage.id) : false;
    const stats =
      stage?.stats && this.doneAt !== null
        ? {
            seconds: Math.round((this.doneAt - this.startedAt) / 1000),
            operations: this.deps.app.log.filter((e) => e.kind === 'execute').length,
          }
        : null;
    return { index: this.index, stage, result: this.result, completed, hintsShown: this.hintsShown, interacted: this.interacted, stats };
  }

  /** "Pista" button. */
  showHint(): void {
    const stage = this.lab.stages[this.index];
    if (!stage || stage.hints === false) return;
    this.hintsShown = Math.min(stage.hintKeys.length, Math.max(this.hintsShown, 1));
    this.emit();
  }

  /** Call regularly: reveals the second hint when the student is stuck. */
  tick(): void {
    const stage = this.lab.stages[this.index];
    if (!stage || stage.hints === false || this.result.done) return;
    if (this.hintsShown < 2 && stage.hintKeys.length >= 2 && this.deps.now() - this.startedAt >= STUCK_MS) {
      this.hintsShown = 2;
      this.emit();
    }
  }

  /** The program's state changed: the student acted. Checks the stage again. */
  notifyActivity(): void {
    if (this.initialState === null) return; // still loading
    this.interacted = true;
    this.evaluate();
  }

  evaluate(): void {
    const stage = this.lab.stages[this.index];
    if (!stage || this.initialState === null) {
      this.emit();
      return;
    }
    // Once done, a stage stays done until it is restarted.
    if (!this.result.done) {
      this.result = stage.check({
        state: this.deps.app.getState(),
        initialState: this.initialState,
        log: this.deps.app.log,
        memory: this.memory,
      });
      if (this.result.done) {
        this.doneAt = this.deps.now();
        this.deps.progress.complete(stage.id);
      }
    }
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
