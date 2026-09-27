/**
 * Stage data model. A lab is a list of stages; each stage is data plus a check
 * function that reads the scene state, the view state and the operation log
 * (never the DOM or three.js).
 */
import type { Vec3 } from '../../apps/blender/math/vec3';
import type { SceneState } from '../../apps/blender/scene/scene';
import type { LogEntry } from '../history/store';
import type { ViewportSize } from '../../apps/blender/viewport/projection';
import type { ViewProjection } from '../../apps/blender/viewport/screen';
import type { ViewState } from '../../apps/blender/viewport/view-state';
import type { Ghost } from '../../apps/blender/stages/ghost-match';
import type { MeshData } from '../../apps/blender/mesh/mesh-data';
import type { ComponentHint } from '../../apps/blender/viewport/lab-elements';

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
  /**
   * Components to point at (lab colour). Return the same array for the same
   * step: the page only redraws them when the reference changes.
   */
  readonly hints?: readonly ComponentHint[];
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
  /** Reference shapes drawn as silhouettes (world coordinates). */
  readonly referenceMeshes?: readonly MeshData[];
  /** Turn the topology analyser on when the stage starts. */
  readonly analyzer?: boolean;
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
