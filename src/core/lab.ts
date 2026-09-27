/**
 * What a lab provides: data (texts, stages, page lists) and the program it
 * replicates. Adding a lab does not require touching the core.
 */
import type { ReplicatedApp } from './app-contract';
import type { LabStages } from './stages/types';
import type { Blueprint } from './shell/blueprint';

export interface LabDefinition<State = unknown, Setup = unknown, Decorations = unknown> {
  /** Also the progress key in localStorage: never change it once published. */
  readonly id: string;
  /** Position in the sequence, as shown to students ("01"). */
  readonly number: string;
  /** i18n keys. */
  readonly nameKey: string;
  readonly descKey: string;
  readonly stages: LabStages<State, Setup, Decorations>;
  /** Blueprint of the course's final challenge, shown as a miniature in the lab panel. */
  readonly blueprint?: Blueprint;
  /** Creates the replicated program for this lab (not mounted yet). */
  createApp(): ReplicatedApp<State, Setup, Decorations>;
  /** The lab page: i18n prefix ("lab01") and the keys of its lists under it. */
  readonly page: {
    readonly prefix: string;
    /** Keys under <prefix>.intro.controls */
    readonly controls: readonly string[];
    /** Keys under <prefix>.real */
    readonly real: readonly string[];
  };
}
