/**
 * Light meter panel: a lab tool (not part of Blender), shown in the lab panel
 * in the shell's style. Two measuring points, A and B, placed by clicking a
 * surface in the viewport; each shows the light that reaches it (irradiance,
 * W/m²), light by light, and the panel compares them in stops. For the
 * inverse square law and the key / fill ratio.
 * Adaptat de cifog-lab (xavikai), the Lighting Lab's light meter.
 */
import { t } from '../../../core/i18n';
import type { Vec3 } from '../math/vec3';
import { type MeterReading, measure, sceneTriangles, stopsBetween } from '../render/light-meter';
import type { SceneState } from '../scene/scene';

export interface MeterProbe {
  readonly point: Vec3;
  readonly normal: Vec3;
  readonly objectName: string;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const num = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace('.', ',');

export class LightMeterPanel {
  private readonly probes: { A: MeterProbe | null; B: MeterProbe | null } = { A: null, B: null };
  private placing: 'A' | 'B' | null = null;
  private last: SceneState | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly getScene: () => SceneState,
    /** Waits for a click on a surface (null: stop waiting). */
    private readonly pick: (done: ((probe: MeterProbe | null) => void) | null) => void,
    /** The probes' points, to mark them in the viewport. */
    private readonly onProbes: (points: readonly Vec3[]) => void,
  ) {
    container.classList.add('lab-meter');
    this.render();
  }

  /** Call whenever the scene changes. */
  update(): void {
    const s = this.getScene();
    if (s === this.last) return;
    this.last = s;
    this.render();
  }

  /** Readings of the probes (for stage checks that want what the student measured). */
  get points(): { A: MeterProbe | null; B: MeterProbe | null } {
    return this.probes;
  }

  private place(which: 'A' | 'B'): void {
    if (this.placing === which) {
      this.placing = null;
      this.pick(null);
      this.render();
      return;
    }
    this.placing = which;
    this.pick((probe) => {
      this.placing = null;
      if (probe) this.probes[which] = probe;
      this.onProbes([this.probes.A, this.probes.B].flatMap((p) => (p ? [p.point] : [])));
      this.render();
    });
    this.render();
  }

  private clear(): void {
    this.probes.A = null;
    this.probes.B = null;
    this.placing = null;
    this.pick(null);
    this.onProbes([]);
    this.render();
  }

  private render(): void {
    const c = this.container;
    const scene = this.getScene();
    c.replaceChildren(el('h2', undefined, t('meter.title')), el('p', 'lab-muted', t('meter.help')));
    const buttons = el('div', 'lab-meter-buttons');
    for (const which of ['A', 'B'] as const) {
      const b = el('button', 'lab-button', this.placing === which ? t('meter.clickSurface') : t('meter.place', { p: which }));
      b.type = 'button';
      b.classList.toggle('is-active', this.placing === which);
      b.addEventListener('click', () => this.place(which));
      buttons.append(b);
    }
    if (this.probes.A || this.probes.B) {
      const clear = el('button', 'lab-link-button', t('meter.clear'));
      clear.type = 'button';
      clear.addEventListener('click', () => this.clear());
      buttons.append(clear);
    }
    c.append(buttons);

    const tris = this.probes.A || this.probes.B ? sceneTriangles(scene) : [];
    const readings: Partial<Record<'A' | 'B', MeterReading>> = {};
    for (const which of ['A', 'B'] as const) {
      const p = this.probes[which];
      if (!p) continue;
      const r = measure(scene, p.point, p.normal, tris);
      readings[which] = r;
      const box = el('div', 'lab-meter-reading');
      box.append(el('strong', undefined, t('meter.reading', { p: which, object: p.objectName, e: num(r.total) })));
      const list = el('ul');
      for (const l of r.lights) list.append(el('li', undefined, t('meter.light', { name: l.name, e: num(l.irradiance) })));
      if (r.world > 0) list.append(el('li', undefined, t('meter.world', { e: num(r.world) })));
      box.append(list);
      c.append(box);
    }
    if (readings.A && readings.B) {
      const stops = stopsBetween(readings.A.total, readings.B.total);
      const ratio = readings.A.total / Math.max(readings.B.total, 1e-9);
      c.append(
        el(
          'p',
          'lab-meter-ratio',
          t('meter.ratio', {
            ratio: ratio >= 1 ? `${num(ratio)} : 1` : `1 : ${num(1 / ratio)}`,
            stops: `${stops >= 0 ? '+' : '−'}${num(Math.abs(stops))}`,
          }),
        ),
      );
    }
  }
}
