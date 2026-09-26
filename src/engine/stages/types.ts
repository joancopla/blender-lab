/**
 * Stage data model. A lab is a list of stages; each stage is data plus a check
 * function that reads the scene state, the view state and the operation log
 * (never the DOM or three.js).
 */
import type { Vec3 } from '../math/vec3';
import type { SceneState } from '../scene/scene';
import type { LogEntry } from '../scene/store';
import type { ViewportSize } from '../viewport/projection';
import type { ViewProjection } from '../viewport/screen';
import type { ViewState } from '../viewport/view-state';
import type { Ghost } from './ghost-match';

/** A symbol painted on a face (lab element, stage 1). */
export interface FaceMarker {
  readonly id: string;
  readonly position: Vec3;
  /** Outward face normal. */
  readonly normal: Vec3;
  readonly symbol: string;
  /** Side of the square marker, metres. */
  readonly size: number;
}

export interface StageContext {
  readonly scene: SceneState;
  readonly initialScene: SceneState;
  /** Logical view state (end of any Smooth View transition). */
  readonly view: ViewState;
  /** Projection of that view, for on-screen checks. */
  readonly projection: ViewProjection;
  readonly size: ViewportSize;
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

export interface CheckResult {
  readonly done: boolean;
  readonly feedback?: Feedback;
  /** Markers already seen (stage 1). */
  readonly seenMarkers?: readonly string[];
}

export interface StageDefinition {
  readonly id: string;
  /** i18n keys. Hints are progressive: the first with the "Pista" button, the second when stuck. */
  readonly titleKey: string;
  readonly instructionKey: string;
  readonly hintKeys: readonly string[];
  readonly successKey: string;
  /** Keys to highlight, with Blender's names ("G", "Numpad 1", "Shift"). */
  readonly keys: readonly string[];
  scene(): SceneState;
  view?(): ViewState;
  readonly ghosts?: readonly Ghost[];
  readonly markers?: readonly FaceMarker[];
  check(ctx: StageContext): CheckResult;
  /** false: no hints at all (final challenge). */
  readonly hints?: boolean;
  /** Show time and number of operations when done (final challenge). */
  readonly stats?: boolean;
}

export interface LabStages {
  readonly labId: string;
  readonly stages: readonly StageDefinition[];
  /** Free mode after the last stage: scene with all tools and no checks. */
  freeScene(): SceneState;
}
