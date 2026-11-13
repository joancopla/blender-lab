/**
 * The Layers panel ("Capas"), reduced to what the transform lab needs: the
 * list with the eye, the thumbnail and the name. The rest of the panel is drawn
 * but does nothing yet (specs/photoshop/02-layers.md).
 */
import type { PsController } from '../photoshop-app';
import { ICONS } from './icons';
import { LAYERS, formatNumber } from './labels';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const THUMB_W = 36;
const THUMB_H = 28;

export class LayersPanel {
  readonly element = el('section', 'ps-layers');
  private list = el('ul', 'ps-layer-list');
  private opacity = el('span', 'ps-layers-value');
  private fill = el('span', 'ps-layers-value', `${formatNumber(100, 0)}%`);
  private thumbs = new Map<string, HTMLCanvasElement>();
  private signature = '';

  constructor(private readonly app: PsController) {
    const tabs = el('div', 'ps-panel-tabs');
    LAYERS.tabs.forEach((name, i) => tabs.append(el('span', i === 0 ? 'ps-panel-tab is-active' : 'ps-panel-tab', name)));

    const filter = el('div', 'ps-layers-row is-inert');
    const kind = el('span', 'ps-opt-select');
    kind.innerHTML = `${ICONS.search}<span>${LAYERS.kind}</span>`;
    filter.append(kind);

    const blend = el('div', 'ps-layers-row');
    const opacity = el('span', 'ps-layers-pair is-inert');
    opacity.append(el('span', undefined, LAYERS.opacity), this.opacity);
    blend.append(el('span', 'ps-opt-select is-inert', LAYERS.normal), opacity);

    const lock = el('div', 'ps-layers-row is-inert');
    const fill = el('span', 'ps-layers-pair');
    fill.append(el('span', undefined, LAYERS.fill), this.fill);
    const lockIcon = el('span', 'ps-layers-lock');
    lockIcon.innerHTML = ICONS.lock;
    lock.append(el('span', undefined, LAYERS.lock), lockIcon, fill);

    this.list.setAttribute('role', 'listbox');
    this.list.addEventListener('click', (e) => {
      const target = e.target as Element;
      const row = target.closest<HTMLElement>('[data-layer]');
      if (!row) return;
      if (target.closest('.ps-layer-eye')) this.app.toggleVisible(row.dataset.layer!);
      else this.app.selectLayer(row.dataset.layer!);
    });

    const footer = el('div', 'ps-layers-footer is-inert');
    for (const [id, title] of Object.entries(LAYERS.footer)) {
      const b = el('span', 'ps-layers-button');
      b.innerHTML = ICONS[id as keyof typeof LAYERS.footer];
      b.title = title;
      footer.append(b);
    }
    this.element.append(tabs, filter, blend, lock, this.list, footer);
  }

  /** A new document: thumbnails are made again. */
  reset(): void {
    this.thumbs.clear();
    this.signature = '';
  }

  render(): void {
    const s = this.app.state();
    const active = s.layers.find((l) => l.id === s.activeLayerId);
    this.opacity.textContent = `${formatNumber(active?.opacity ?? 100, 0)}%`;
    const signature = s.layers.map((l) => `${l.id}|${l.name}|${l.visible}|${l.background}|${l.id === s.activeLayerId}`).join('\n');
    if (signature === this.signature) return;
    this.signature = signature;
    const rows: HTMLElement[] = [];
    // The panel lists the top layer first.
    for (const layer of [...s.layers].reverse()) {
      const row = el('li', layer.id === s.activeLayerId ? 'ps-layer is-active' : 'ps-layer');
      row.dataset.layer = layer.id;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(layer.id === s.activeLayerId));
      const eye = el('button', 'ps-layer-eye');
      eye.type = 'button';
      eye.title = LAYERS.visibility;
      eye.setAttribute('aria-pressed', String(layer.visible));
      if (layer.visible) eye.innerHTML = ICONS.eye;
      const thumb = el('span', 'ps-layer-thumb');
      thumb.append(this.thumbnail(layer.contentId));
      const name = el('span', layer.background ? 'ps-layer-name is-background' : 'ps-layer-name', layer.name);
      row.append(eye, thumb, name);
      if (layer.background) {
        const lock = el('span', 'ps-layer-lock');
        lock.innerHTML = ICONS.lock;
        row.append(lock);
      }
      rows.push(row);
    }
    this.list.replaceChildren(...rows);
  }

  /** A small copy of the layer's content, fitted in the thumbnail. */
  private thumbnail(contentId: string): HTMLCanvasElement {
    const cached = this.thumbs.get(contentId);
    if (cached) return cached;
    const canvas = el('canvas');
    canvas.width = THUMB_W * 2;
    canvas.height = THUMB_H * 2;
    const source = this.app.contentCanvas(contentId);
    const ctx = canvas.getContext('2d');
    if (source && ctx) {
      const k = Math.min(canvas.width / source.width, canvas.height / source.height);
      const w = source.width * k;
      const h = source.height * k;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    }
    this.thumbs.set(contentId, canvas);
    return canvas;
  }
}
