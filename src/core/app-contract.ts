/**
 * What a replicated program (Blender today) must offer the core so labs can use
 * it. The core never knows what a vertex or a layer is: it only sees a typed,
 * read-only state, a setup to load, and the operation log.
 *
 * - State: what stage checks read (Blender: scene + view).
 * - Setup: what a stage loads (Blender: initial scene, view, ghosts...).
 * - Decorations: lab elements a check result asks the program to show
 *   (Blender: component hints, markers already seen).
 */
import type { LogEntry } from './history/store';

/** A boolean preference the program offers (shown by the shell's preferences panel). */
export interface PreferenceDefinition {
  readonly key: string;
  /** i18n keys. */
  readonly labelKey: string;
  readonly helpKey: string;
  /** Text proposing to turn it on when the program suggests it (see suggestPreference). */
  readonly suggestKey?: string;
  readonly default: boolean;
}

export interface AppMountOptions {
  /** Current preference values (keys from `preferences`). */
  preferences(): Readonly<Record<string, boolean>>;
  /**
   * The program noticed the student probably needs a preference (e.g. orbiting
   * without a middle mouse button): the shell may suggest turning it on.
   */
  suggestPreference?(key: string): void;
}

export interface ReplicatedApp<State, Setup, Decorations = unknown> {
  /** Preferences the program offers. */
  readonly preferences: readonly PreferenceDefinition[];
  /** Builds the program inside a container. */
  mount(container: HTMLElement, options: AppMountOptions): void;
  unmount(): void;
  /** Typed, read-only state for stage checks. */
  getState(): State;
  /** Called whenever the state (or anything checks read) changes. */
  onChange(fn: () => void): () => void;
  /** Loads a stage's starting point; clears history and log. */
  load(setup: Setup): void;
  /** Operations confirmed, cancelled, undone and redone since the last load. */
  readonly log: readonly LogEntry[];
  /** Shows lab decorations for the current check result. */
  decorate(decorations: Decorations | undefined): void;
  /** Where the shell puts overlays drawn over the program (key overlay). */
  overlayHost(): HTMLElement;
  /** The element whose mouse input the key overlay should show. */
  inputHost(): HTMLElement;
  /** Optional lab tools the program adds to the lab panel (lab style, Catalan). */
  renderLabTools?(container: HTMLElement): void;
}
