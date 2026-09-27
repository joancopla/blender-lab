/**
 * Outliner (View Layer mode): Scene Collection > Collection > objects, sorted
 * alphabetically. Clicking changes the selection through an operator.
 * FIDELITY? Row colours, icons and the restriction column icons are approximations.
 */
import type { SceneObject, SceneState } from '../scene/scene';

export interface OutlinerOptions {
  readonly container: HTMLElement;
  /** Row click: id null means empty space. `extend` is Ctrl. */
  onSelect(id: string | null, extend: boolean): void;
}

const ICONS = {
  sceneCollection:
    '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke="#d0d0d0" stroke-width="1.2"/><path d="M2 6h12" stroke="#d0d0d0"/></svg>',
  collection:
    '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1.5" fill="none" stroke="#e6e6e6" stroke-width="1.2"/><path d="M5 7h6M5 10h6" stroke="#e6e6e6"/></svg>',
  mesh: '<svg viewBox="0 0 16 16"><path d="M8 2l5.5 10.5h-11z" fill="none" stroke="#f5a14a" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  camera:
    '<svg viewBox="0 0 16 16"><path fill="#f5a14a" d="M2 5h8a1 1 0 0 1 1 1v1.2l3-1.8v5.2l-3-1.8V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>',
  light:
    '<svg viewBox="0 0 16 16"><circle cx="8" cy="7" r="3.5" fill="none" stroke="#f5a14a" stroke-width="1.4"/><path d="M6.5 12h3M7 14h2" stroke="#f5a14a" stroke-width="1.2"/></svg>',
  eye: '<svg viewBox="0 0 16 16"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>',
  render:
    '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M3 5h7a1 1 0 0 1 1 1v1l3-2v6l-3-2v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>',
  check:
    '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="#4772b3"/><path d="M5 8.2l2 2 4-4.4" fill="none" stroke="#fff" stroke-width="1.6"/></svg>',
};

/** Natural order like Blender: "Cube" < "Cube.001" < "Cube.010". */
const byName = (a: SceneObject, b: SceneObject) => a.name.localeCompare(b.name, 'en', { numeric: true });

export class Outliner {
  private lastKey = '';

  constructor(private readonly opts: OutlinerOptions) {
    opts.container.classList.add('bl-outliner');
    opts.container.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const row = (e.target as HTMLElement).closest<HTMLElement>('.bl-ol-row');
      if (row && !row.dataset.objectId) return; // collection rows: no effect on objects
      opts.onSelect(row?.dataset.objectId ?? null, e.ctrlKey);
    });
  }

  update(scene: SceneState): void {
    const key = JSON.stringify([
      scene.objects.map((o) => [o.id, o.name, o.type]),
      scene.selectedIds,
      scene.activeId,
    ]);
    if (key === this.lastKey) return;
    this.lastKey = key;

    const rows: string[] = [];
    rows.push(this.row(0, ICONS.sceneCollection, 'Scene Collection', {}));
    rows.push(this.row(1, ICONS.collection, 'Collection', { expand: true, check: true, restrict: true }));
    for (const o of [...scene.objects].sort(byName)) {
      const selected = scene.selectedIds.includes(o.id);
      const active = o.id === scene.activeId;
      rows.push(
        this.row(2, ICONS[o.type], o.name, {
          objectId: o.id,
          restrict: true,
          cls: `${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`,
        }),
      );
    }
    this.opts.container.innerHTML = rows.join('');
  }

  private row(
    depth: number,
    icon: string,
    name: string,
    o: { objectId?: string; expand?: boolean; check?: boolean; restrict?: boolean; cls?: string },
  ): string {
    const escape = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    return `<div class="bl-ol-row${o.cls ?? ''}" style="--depth:${depth}"${o.objectId ? ` data-object-id="${escape(o.objectId)}"` : ''}>
      <span class="bl-ol-expand">${o.expand ? '▾' : ''}</span>
      <span class="bl-ol-icon">${icon}</span>
      <span class="bl-ol-name">${escape(name)}</span>
      <span class="bl-ol-right">${o.check ? `<span class="bl-ol-icon">${ICONS.check}</span>` : ''}${
        o.restrict ? `<span class="bl-ol-icon bl-ol-restrict">${ICONS.eye}</span><span class="bl-ol-icon bl-ol-restrict">${ICONS.render}</span>` : ''
      }</span>
    </div>`;
  }
}
