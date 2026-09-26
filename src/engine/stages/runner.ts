/**
 * Stage runner: loads stages, checks them whenever the scene or the view
 * changes, handles hints and saves progress. No DOM: the lab page renders it.
 */
import type { SceneState } from '../scene/scene';
import type { SceneStore } from '../scene/store';
import type { ViewportSize } from '../viewport/projection';
import type { ViewProjection } from '../viewport/screen';
import { type ViewState, defaultViewState } from '../viewport/view-state';
import type { ProgressStore } from './progress';
import type { CheckResult, LabStages, StageDefinition } from './types';

/** The second hint appears on its own after this long without finishing. */
export const STUCK_MS = 90_000;

export interface RunnerDeps {
  readonly store: SceneStore;
  /** Current logical view state. */
  view(): ViewState;
  /** Projection of the logical view and the viewport size. */
  projection(): { projection: ViewProjection; size: ViewportSize };
  resetView(state: ViewState): void;
  readonly progress: ProgressStore;
  now(): number;
}

export interface StageStatus {
  /** -1: free mode. */
  readonly index: number;
  readonly stage: StageDefinition | null;
  readonly result: CheckResult;
  /** Completed now or before (saved progress). */
  readonly completed: boolean;
  /** Number of hints visible (0, 1 or 2). */
  readonly hintsShown: number;
  /** Whether the student has done anything in this stage yet. */
  readonly interacted: boolean;
  /** Final challenge stats, once done. */
  readonly stats: { readonly seconds: number; readonly operations: number } | null;
}

export class StageRunner {
  private index = 0;
  private memory = new Map<string, unknown>();
  private initialScene: SceneState | null = null;
  private startedAt = 0;
  private hintsShown = 0;
  private result: CheckResult = { done: false };
  private doneAt: number | null = null;
  private interacted = false;
  private listeners = new Set<() => void>();

  constructor(
    readonly lab: LabStages,
    private readonly deps: RunnerDeps,
  ) {}

  get stages(): readonly StageDefinition[] {
    return this.lab.stages;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Loads a stage (or free mode with -1) from its initial scene and view. */
  load(index: number): void {
    const stage = this.lab.stages[index] ?? null;
    this.index = stage ? index : -1;
    this.memory = new Map();
    this.hintsShown = 0;
    this.result = { done: false };
    this.doneAt = null;
    this.interacted = false;
    this.startedAt = this.deps.now();
    const scene = stage ? stage.scene() : this.lab.freeScene();
    this.initialScene = scene;
    this.deps.store.reset(scene);
    this.deps.resetView(stage?.view?.() ?? defaultViewState());
    // Loading itself is not student activity.
    this.interacted = false;
    this.deps.progress.setCurrent(this.index);
    this.evaluate();
  }

  restart(): void {
    this.load(this.index);
  }

  get status(): StageStatus {
    const stage = this.lab.stages[this.index] ?? null;
    const completed = stage ? this.result.done || this.deps.progress.isCompleted(stage.id) : false;
    const stats =
      stage?.stats && this.doneAt !== null
        ? {
            seconds: Math.round((this.doneAt - this.startedAt) / 1000),
            operations: this.deps.store.log.filter((e) => e.kind === 'execute').length,
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

  /** Marks that the student acted (scene or view changed), then checks the stage. */
  notifyActivity(): void {
    this.interacted = true;
    this.evaluate();
  }

  evaluate(): void {
    const stage = this.lab.stages[this.index];
    if (!stage || !this.initialScene) {
      this.emit();
      return;
    }
    // Once done, a stage stays done until it is restarted.
    if (!this.result.done) {
      const { projection, size } = this.deps.projection();
      this.result = stage.check({
        scene: this.deps.store.state,
        initialScene: this.initialScene,
        view: this.deps.view(),
        projection,
        size,
        log: this.deps.store.log,
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
