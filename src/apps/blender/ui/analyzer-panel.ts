/**
 * Topology analyser panel: a lab tool (not part of Blender), shown in the lab
 * panel. Marks the active mesh's problems in the viewport and explains them in
 * Catalan, with how to find or fix them in real Blender.
 */
import { t } from '../../../core/i18n';
import { analyzeMesh } from '../mesh/analyze';
import type { MeshData } from '../mesh/mesh-data';
import { type SceneState, activeObject, meshOf } from '../scene/scene';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class AnalyzerPanel {
  private on = false;
  private last: { on: boolean; id: string | undefined; mesh: MeshData | null } | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly getScene: () => SceneState,
    /** Shows the analyser overlay on this object in the viewport (null: off). */
    private readonly setOverlayObject: (id: string | null) => void,
  ) {
    container.classList.add('lab-analyzer');
  }

  setEnabled(on: boolean): void {
    this.on = on;
    this.update();
  }

  /** Call whenever the scene changes. */
  update(): void {
    const active = activeObject(this.getScene());
    this.setOverlayObject(this.on && active?.type === 'mesh' ? active.id : null);
    const mesh = active?.type === 'mesh' ? meshOf(active) : null;
    // Mesh data is immutable: the same reference means the same analysis.
    if (this.last && this.last.on === this.on && this.last.id === active?.id && this.last.mesh === mesh) return;
    this.last = { on: this.on, id: active?.id, mesh };

    const c = this.container;
    c.replaceChildren(el('h2', undefined, t('analyzer.title')));
    const row = el('label', 'lab-switch');
    const input = el('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = this.on;
    input.addEventListener('change', () => this.setEnabled(input.checked));
    const text = el('span', 'lab-switch-text');
    text.append(el('strong', undefined, t('analyzer.toggle')), el('small', undefined, t('analyzer.help')));
    row.append(input, text);
    c.append(row);
    if (!this.on || !mesh) return;

    const r = analyzeMesh(mesh);
    const items: [string, number][] = [
      ['ngons', r.ngons.length],
      ['triangles', r.triangles.length],
      ['duplicates', r.duplicates.reduce((n, g) => n + g.length - 1, 0)],
      ['nonManifold', r.nonManifoldEdges.length],
      ['flipped', r.flippedFaces.length],
    ];
    const list = el('ul', 'lab-analyzer-list');
    for (const [k, n] of items) {
      if (n === 0) continue;
      const li = el('li', `lab-analyzer-item is-${k}`);
      li.append(el('strong', undefined, t(`analyzer.${k}.label`, { n })), el('p', undefined, t(`analyzer.${k}.why`)));
      list.append(li);
    }
    c.append(list.childElementCount ? list : el('p', 'lab-muted', t('analyzer.clean')));
  }
}
