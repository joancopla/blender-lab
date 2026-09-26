import type { SceneState } from './scene/scene';

/** What a lab provides to the engine. Stages are added in phase 5. */
export interface LabDefinition {
  readonly id: string;
  initialScene(): SceneState;
}
