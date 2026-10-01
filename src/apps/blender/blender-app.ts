/**
 * Blender, as seen by the core: the app contract implemented over the Blender
 * replica (mountBlender).
 */
import type { AppMountOptions, PreferenceDefinition, ReplicatedApp } from '../../core/app-contract';
import type { LogEntry } from './scene/store';
import { type MountedBlender, mountBlender } from './app';
import type { BlenderDecorations, BlenderSetup, BlenderState } from './stages/types';
import { AnalyzerPanel } from './ui/analyzer-panel';
import { LightMeterPanel } from './ui/light-meter-panel';
import type { Vec3 } from './math/vec3';
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
  /** Add menu and Shift+A. */
  readonly addObjects?: boolean;
  /** Offer the light meter in the lab panel. */
  readonly meter?: boolean;
  /** Where new lights appear instead of the 3D Cursor (a lab decision). */
  readonly newLightLocation?: Vec3;
  /** Shader Editor under the viewport (Lab 05). */
  readonly shaderEditor?: boolean;
}

export class BlenderApp implements ReplicatedApp<BlenderState, BlenderSetup, BlenderDecorations> {
  readonly preferences = BLENDER_PREFERENCES;
  private inner: MountedBlender | null = null;
  private container: HTMLElement | null = null;
  private setup: BlenderSetup | null = null;
  private hints: BlenderDecorations['hints'];
  private analyzer: AnalyzerPanel | null = null;
  private meter: LightMeterPanel | null = null;
  /** The light meter's points, marked in the viewport. */
  private meterPoints: readonly Vec3[] = [];

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
      addObjects: this.options.addObjects,
      newLightLocation: this.options.newLightLocation,
      shaderEditor: this.options.shaderEditor,
    });
    this.inner.store.onChange(() => {
      this.analyzer?.update();
      this.meter?.update();
    });
  }

  unmount(): void {
    this.container?.replaceChildren();
    this.inner = null;
  }

  getState(): BlenderState {
    const m = this.mounted;
    return { scene: m.store.state, view: m.navigator.state, shading: m.renderer.shadingMode, ...m.settledProjection() };
  }

  onChange(fn: () => void): () => void {
    const a = this.mounted.store.onChange(fn);
    const b = this.mounted.navigator.onChange(fn);
    const c = this.mounted.onShadingChange(fn);
    return () => {
      a();
      b();
      c();
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
    const m = this.mounted;
    if (this.options.analyzer) {
      const box = document.createElement('div');
      container.append(box);
      this.analyzer = new AnalyzerPanel(box, () => m.store.state, (id) => m.renderer.setAnalyzerObject(id));
      this.analyzer.setEnabled(this.setup?.analyzer === true);
    }
    if (this.options.meter) {
      const box = document.createElement('div');
      container.append(box);
      this.meter = new LightMeterPanel(
        box,
        () => m.store.state,
        (done) => {
          if (!done) return m.setClickTool(null);
          m.setClickTool((x, y) => {
            m.setClickTool(null);
            const hit = m.surfaceAt(x, y);
            const name = hit ? (m.store.state.objects.find((o) => o.id === hit.objectId)?.name ?? '') : '';
            done(hit ? { point: hit.point, normal: hit.normal, objectName: name } : null);
          });
        },
        (points) => {
          this.meterPoints = points;
          this.drawLabElements();
        },
      );
    }
  }

  private drawLabElements(): void {
    const s = this.setup;
    const meter = this.meterPoints.length ? [{ points: this.meterPoints }] : [];
    this.mounted.renderer.setLabElements(s?.ghosts ?? [], s?.markers ?? [], s?.referenceMeshes ?? [], [...(this.hints ?? []), ...meter]);
  }
}
