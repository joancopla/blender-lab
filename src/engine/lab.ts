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
  /** The lab page: i18n prefix ("lab01") and the keys of its lists under it. */
  readonly page: {
    readonly prefix: string;
    /** Keys under <prefix>.intro.controls */
    readonly controls: readonly string[];
    /** Keys under <prefix>.real */
    readonly real: readonly string[];
    /** Overlays > Statistics on. */
    readonly statistics?: boolean;
    /** Show the topology analyser tool. */
    readonly analyzer?: boolean;
  };
}
