import type { SceneState } from './scene/scene';
import type { LabStages } from './stages/types';

/** What a lab provides to the engine: data only, no engine changes needed. */
export interface LabDefinition {
  readonly id: string;
  /** i18n keys. */
  readonly nameKey: string;
  readonly descKey: string;
  initialScene(): SceneState;
  readonly stages: LabStages;
}
