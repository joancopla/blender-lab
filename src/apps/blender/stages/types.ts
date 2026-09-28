/**
 * Blender stages: what a Blender lab stage looks like (scene, view, lab
 * elements) and the adapter that turns it into a core stage.
 */
import type { LogEntry } from '../scene/store';
import type {
  CheckResult,
  Feedback,
  LabStages,
  StageContext,
  StageDefinition,
} from '../../../core/stages/types';
import type { Vec3 } from '../math/vec3';
import type { MeshData } from '../mesh/mesh-data';
import type { SceneState } from '../scene/scene';
import type { PropertiesTabId } from '../ui/properties/tabs';
import type { ComponentHint } from '../viewport/lab-elements';
import type { ViewportSize } from '../viewport/projection';
import type { ViewProjection } from '../viewport/screen';
import type { ViewState } from '../viewport/view-state';
import type { Ghost } from './ghost-match';

export type { Feedback };

/** A symbol painted on a face (lab element, Lab 01 stage 1). */
export interface FaceMarker {
  readonly id: string;
  readonly position: Vec3;
  /** Outward face normal. */
  readonly normal: Vec3;
  readonly symbol: string;
  /** Side of the square marker, metres. */
  readonly size: number;
}

/** What Blender stage checks read (the app contract's State). */
export interface BlenderState {
  readonly scene: SceneState;
  /** Logical view state (end of any Smooth View transition). */
  readonly view: ViewState;
  /** Projection of that view, for on-screen checks. */
  readonly projection: ViewProjection;
  readonly size: ViewportSize;
}

/** What a Blender stage loads (the app contract's Setup). */
export interface BlenderSetup {
  scene(): SceneState;
  view?(): ViewState;
  readonly ghosts?: readonly Ghost[];
  readonly markers?: readonly FaceMarker[];
  /** Reference shapes drawn as silhouettes (world coordinates). */
  readonly referenceMeshes?: readonly MeshData[];
  /** Turn the topology analyser on when the stage starts. */
  readonly analyzer?: boolean;
  /** Properties Editor tab to show when the stage starts. */
  readonly propertiesTab?: PropertiesTabId;
}

/** Lab elements a Blender check asks for (the app contract's Decorations). */
export interface BlenderDecorations {
  /** Markers already seen. */
  readonly seenMarkers?: readonly string[];
  /** Components to point at. Return the same array for the same step (redrawn by reference). */
  readonly hints?: readonly ComponentHint[];
}

/** Context of a Blender check, flattened for convenience. */
export interface BlenderStageContext {
  readonly scene: SceneState;
  readonly initialScene: SceneState;
  readonly view: ViewState;
  readonly projection: ViewProjection;
  readonly size: ViewportSize;
  readonly log: readonly LogEntry[];
  readonly memory: Map<string, unknown>;
}

export interface BlenderCheckResult extends BlenderDecorations {
  readonly done: boolean;
  readonly feedback?: Feedback;
}

/** A Blender lab stage, as labs write it. */
export interface BlenderStageDefinition extends BlenderSetup {
  readonly id: string;
  readonly titleKey: string;
  readonly instructionKey: string;
  readonly hintKeys: readonly string[];
  readonly successKey: string;
  readonly keys: readonly string[];
  check(ctx: BlenderStageContext): BlenderCheckResult;
  readonly hints?: boolean;
  readonly stats?: boolean;
}

export interface BlenderLabStages {
  readonly labId: string;
  readonly stages: readonly BlenderStageDefinition[];
  freeScene(): SceneState;
}

export type CoreBlenderStage = StageDefinition<BlenderState, BlenderSetup, BlenderDecorations>;
export type CoreBlenderLab = LabStages<BlenderState, BlenderSetup, BlenderDecorations>;

/** Blender stage -> core stage. */
export function toCoreStage(def: BlenderStageDefinition): CoreBlenderStage {
  const setup: BlenderSetup = {
    scene: def.scene,
    view: def.view,
    ghosts: def.ghosts,
    markers: def.markers,
    referenceMeshes: def.referenceMeshes,
    analyzer: def.analyzer,
    propertiesTab: def.propertiesTab,
  };
  return {
    id: def.id,
    titleKey: def.titleKey,
    instructionKey: def.instructionKey,
    hintKeys: def.hintKeys,
    successKey: def.successKey,
    keys: def.keys,
    hints: def.hints,
    stats: def.stats,
    setup: () => setup,
    check(ctx: StageContext<BlenderState>): CheckResult<BlenderDecorations> {
      const r = def.check({
        scene: ctx.state.scene,
        initialScene: ctx.initialState.scene,
        view: ctx.state.view,
        projection: ctx.state.projection,
        size: ctx.state.size,
        log: ctx.log,
        memory: ctx.memory,
      });
      return { done: r.done, feedback: r.feedback, decorations: { seenMarkers: r.seenMarkers, hints: r.hints } };
    },
  };
}

export function toCoreLab(lab: BlenderLabStages): CoreBlenderLab {
  return {
    labId: lab.labId,
    stages: lab.stages.map(toCoreStage),
    freeSetup: () => ({ scene: lab.freeScene }),
  };
}

