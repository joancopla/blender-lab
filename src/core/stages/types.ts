/**
 * Stage data model, for any replicated program. A lab is a list of stages; each
 * stage is data plus a check that reads the program's state and the operation
 * log through the app contract (never the DOM or the renderer).
 *
 * - State: what checks read (typed by the program).
 * - Setup: what the program loads when a stage starts.
 * - Decorations: lab elements a check result asks the program to show.
 */
import type { LogEntry } from '../history/store';

export interface StageContext<State> {
  readonly state: State;
  /** State right after the stage was loaded. */
  readonly initialState: State;
  readonly log: readonly LogEntry[];
  /** Per-stage memory, kept between checks and cleared when the stage (re)starts. */
  readonly memory: Map<string, unknown>;
}

export interface Feedback {
  /** i18n key. */
  readonly key: string;
  readonly params?: Record<string, string | number>;
  /** 'progress' is neutral information; 'fix' says what is still wrong. */
  readonly tone: 'progress' | 'fix';
}

export interface CheckResult<Decorations = unknown> {
  readonly done: boolean;
  readonly feedback?: Feedback;
  readonly decorations?: Decorations;
}

export interface StageDefinition<State = unknown, Setup = unknown, Decorations = unknown> {
  readonly id: string;
  /** i18n keys. Hints are progressive: the first with the "Pista" button, the second when stuck. */
  readonly titleKey: string;
  readonly instructionKey: string;
  readonly hintKeys: readonly string[];
  readonly successKey: string;
  /** Keys to highlight: suffixes of i18n keys under "keys." ("numpad1", "g"...). */
  readonly keys: readonly string[];
  setup(): Setup;
  check(ctx: StageContext<State>): CheckResult<Decorations>;
  /** false: no hints at all (final challenge). */
  readonly hints?: boolean;
  /** Show time and number of operations when done (final challenge). */
  readonly stats?: boolean;
}

export interface LabStages<State = unknown, Setup = unknown, Decorations = unknown> {
  readonly labId: string;
  readonly stages: readonly StageDefinition<State, Setup, Decorations>[];
  /** Free mode after the last stage: all tools, no checks. */
  freeSetup(): Setup;
}
