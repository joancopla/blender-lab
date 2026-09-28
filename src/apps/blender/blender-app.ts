/**
 * Blender, as seen by the core: the app contract implemented over the Blender
 * replica (mountBlender).
 */
import type { AppMountOptions, PreferenceDefinition, ReplicatedApp } from '../../core/app-contract';
import type { LogEntry } from './scene/store';
import { type MountedBlender, mountBlender } from './app';
import type { BlenderDecorations, BlenderSetup, BlenderState } from './stages/types';
import { AnalyzerPanel } from './ui/analyzer-panel';
import type { PropertiesTabId } from './ui/properties/tabs';
import { defaultViewState } from './viewport/view-state';
import './texts';

/** Preferences > Input options the labs expose. Both off by default, as in Blender. */
export const BLENDER_PREFERENCES: readonly PreferenceDefinition[] = [
  {
    key: 'emulate3ButtonMouse',
    labelKey: 'prefs.emulate3',
    helpKey: 'prefs.emulate3Help',
    suggestKey: 'prefs.suggestEmulate3',
    default: false,
  },
  { key: 'emulateNumpad', labelKey: 'prefs.emulateNumpad', helpKey: 'prefs.emulateNumpadHelp', default: false },
];

export interface BlenderAppOptions {
  /** Overlays > Statistics on (off by default in Blender). */
  readonly statistics?: boolean;
  /** Offer the topology analyser in the lab panel. */
  readonly analyzer?: boolean;
  /** Properties Editor tabs the lab uses (none by default). */
  readonly propertiesTabs?: readonly PropertiesTabId[];
}

export class BlenderApp implements ReplicatedApp<BlenderState, BlenderSetup, BlenderDecorations> {
  readonly preferences = BLENDER_PREFERENCES;
  private inner: MountedBlender | null = null;
  private container: HTMLElement | null = null;
  private setup: BlenderSetup | null = null;
  private hints: BlenderDecorations['hints'];
  private analyzer: AnalyzerPanel | null = null;

  constructor(private readonly options: BlenderAppOptions = {}) {}

  private get mounted(): MountedBlender {
    if (!this.inner) throw new Error('BlenderApp is not mounted');
    return this.inner;
  }

  mount(container: HTMLElement, options: AppMountOptions): void {
    this.container = container;
    this.inner = mountBlender(container, {
      inputPrefs: () => {
        const p = options.preferences();
        return { emulate3ButtonMouse: p.emulate3ButtonMouse === true, emulateNumpad: p.emulateNumpad === true };
      },
      onNavigateWithoutMiddle: () => options.suggestPreference?.('emulate3ButtonMouse'),
      statistics: this.options.statistics,
      propertiesTabs: this.options.propertiesTabs,
    });
    this.inner.store.onChange(() => this.analyzer?.update());
  }

  unmount(): void {
    this.container?.replaceChildren();
    this.inner = null;
  }

  getState(): BlenderState {
    const m = this.mounted;
    return { scene: m.store.state, view: m.navigator.state, ...m.settledProjection() };
  }

  onChange(fn: () => void): () => void {
    const a = this.mounted.store.onChange(fn);
    const b = this.mounted.navigator.onChange(fn);
    return () => {
      a();
      b();
    };
  }

  load(setup: BlenderSetup): void {
    const m = this.mounted;
    this.setup = setup;
    this.hints = undefined;
    m.store.reset(setup.scene());
    m.navigator.reset(setup.view?.() ?? defaultViewState());
    this.drawLabElements();
    if (setup.analyzer) this.analyzer?.setEnabled(true);
    if (setup.propertiesTab) m.showPropertiesTab(setup.propertiesTab);
  }

  get log(): readonly LogEntry[] {
    return this.mounted.store.log;
  }

  decorate(d: BlenderDecorations | undefined): void {
    const m = this.mounted;
    m.renderer.setSeenMarkers(d?.seenMarkers ?? []);
    // Hints are redrawn only when the check returns a different array.
    if (d?.hints !== this.hints) {
      this.hints = d?.hints;
      this.drawLabElements();
    }
  }

  overlayHost(): HTMLElement {
    return this.mounted.viewport;
  }

  inputHost(): HTMLElement {
    return this.container!;
  }

  renderLabTools(container: HTMLElement): void {
    if (!this.options.analyzer) return;
    const m = this.mounted;
    this.analyzer = new AnalyzerPanel(container, () => m.store.state, (id) => m.renderer.setAnalyzerObject(id));
    this.analyzer.setEnabled(this.setup?.analyzer === true);
  }

  private drawLabElements(): void {
    const s = this.setup;
    this.mounted.renderer.setLabElements(s?.ghosts ?? [], s?.markers ?? [], s?.referenceMeshes ?? [], this.hints ?? []);
  }
}
