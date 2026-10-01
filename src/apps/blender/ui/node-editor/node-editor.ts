/**
 * The Shader Editor (Lab 05): a material's node tree, drawn and edited as in
 * Blender 5.2 with left click select.
 * - View: middle mouse drag pans (Alt + left with Emulate 3 Button Mouse), the wheel
 *   zooms at the pointer, Home frames every node.
 * - Selection: click, Shift+click (toggle), drag on the background (box), A, Alt+A.
 * - Nodes: drag or G to move (dropping a node without links on a link inserts it),
 *   Shift+D, X / Delete, Ctrl+X, M, H, Ctrl+H, Shift+A to add.
 * - Links: drag from a socket to another; drag a linked input away to move or
 *   remove the link; Ctrl + right drag cuts links.
 * Keys work while the pointer is over the editor, as in Blender. Every change goes
 * through the scene history (operators/material-nodes.ts).
 * FIDELITY? Node selection is not an undo step here (Blender records it).
 */
import type { SceneState } from '../../scene/scene';
import type { SceneStore } from '../../scene/store';
import * as Ops from '../../operators/material-nodes';
import type { PropValue } from '../../shading/node-types';
import type { SocketValue } from '../../shading/sockets';
import { type NodeTree, type ShaderNode, type SocketRef, connect, insertOnLink, linkIsValid, moveNodes, nodeById, outputDef, setProp, setValue, togglePanel } from '../../shading/tree';
import { type MenuItem, openMenuAt } from '../menu';
import { ADD_MENUS, ADD_MENU_ROOT, type AddMenuEntry } from './add-menu-data';
import { type P, distanceToLink, linkPath, rectsOverlap, strokeCrossesLink } from './link-geometry';
import { INVALID_LINK, SOCKET_COLORS } from './node-theme';
import { NodeView } from './node-view';
import './node-editor.css';

export interface NodeEditorOptions {
  readonly store: SceneStore;
  /** The material shown (the active object's active slot). */
  materialId(): string | null;
  /** Objects for the Texture Coordinate node. */
  objects(): readonly { id: string; name: string }[];
  /** Preferences > Input > Emulate 3 Button Mouse. */
  emulate3Button(): boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAG_PX = 3;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
/** Distance (canvas px) at which a dragged node highlights a link to insert into. */
const INSERT_DISTANCE = 12;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

type Drag =
  | { kind: 'pan'; last: P }
  | { kind: 'press'; start: P; nodeId: string | null; shift: boolean }
  | { kind: 'move'; start: P; ids: string[]; insert: string | null; modal: boolean }
  | { kind: 'box'; start: P; now: P; shift: boolean }
  | { kind: 'link'; fixed: SocketRef; fixedSide: 'in' | 'out'; detached: string | null; now: P }
  | { kind: 'cut'; points: P[] };

export class NodeEditor {
  readonly element: HTMLElement;
  private readonly region: HTMLElement;
  private readonly canvas: HTMLElement;
  private readonly linksSvg: SVGSVGElement;
  private readonly overlay: SVGSVGElement;
  private readonly materialLabel: HTMLElement;
  private readonly empty: HTMLElement;
  private views = new Map<string, NodeView>();
  private view = { x: 0, y: 0, zoom: 1 };
  private framedFor: string | null = null;
  private selected = new Set<string>();
  private active: string | null = null;
  private drag: Drag | null = null;
  private pointer: P = { x: 0, y: 0 };
  private hovering = false;

  constructor(container: HTMLElement, private readonly opts: NodeEditorOptions) {
    const area = el('section', 'bl-area ne-area');
    const header = el('div', 'bl-header ne-area-header');
    for (const m of ['View', 'Select']) header.append(el('span', 'bl-menu', m));
    const addMenu = el('span', 'bl-menu ne-add-menu', 'Add');
    addMenu.addEventListener('click', () => {
      const r = addMenu.getBoundingClientRect();
      const host = this.region.getBoundingClientRect();
      this.openAddMenu({ x: r.left - host.left, y: r.bottom - host.top });
    });
    header.append(addMenu, el('span', 'bl-menu', 'Node'), el('span', 'bl-spacer'));
    this.materialLabel = el('span', 'bl-field ne-material');
    header.append(this.materialLabel);

    this.region = el('div', 'ne-region');
    this.region.tabIndex = -1;
    this.canvas = el('div', 'ne-canvas');
    this.linksSvg = document.createElementNS(SVG_NS, 'svg');
    this.linksSvg.classList.add('ne-links');
    this.overlay = document.createElementNS(SVG_NS, 'svg');
    this.overlay.classList.add('ne-overlay');
    this.empty = el('div', 'ne-empty', 'No material');
    this.canvas.append(this.linksSvg);
    this.region.append(this.canvas, this.overlay, this.empty);
    area.append(header, this.region);
    container.append(area);
    this.element = area;

    // While G moves nodes, a click confirms (left) or cancels (right) before any field under it sees it.
    this.region.addEventListener(
      'pointerdown',
      (e) => {
        if (this.drag?.kind !== 'move' || !this.drag.modal) return;
        e.stopPropagation();
        e.preventDefault();
        if (e.button === 0) this.finishMove();
        else this.cancelDrag();
      },
      { capture: true },
    );
    this.region.addEventListener('pointerdown', (e) => this.onDown(e));
    this.region.addEventListener('pointermove', (e) => this.onMove(e));
    this.region.addEventListener('pointerup', (e) => this.onUp(e));
    this.region.addEventListener('pointercancel', () => this.cancelDrag());
    this.region.addEventListener('pointerenter', () => (this.hovering = true));
    this.region.addEventListener('pointerleave', () => (this.hovering = false));
    this.region.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.region.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKey);
    opts.store.onChange(() => this.render());
    new ResizeObserver(() => this.applyView()).observe(this.region);
    this.render();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    for (const v of this.views.values()) v.dispose();
  }

  // --- Data ------------------------------------------------------------------------

  private get materialId(): string | null {
    return this.opts.materialId();
  }

  private tree(state: SceneState = this.opts.store.displayState): NodeTree | null {
    const id = this.materialId;
    return id ? (Ops.materialById(state, id)?.tree ?? null) : null;
  }

  private run(op: ReturnType<typeof Ops.editTree>): boolean {
    return this.opts.store.execute(op);
  }

  /** Shows a tree edit without committing it (drag preview); null clears it. */
  private preview(edit: ((t: NodeTree) => NodeTree) | null): void {
    const id = this.materialId;
    if (!id || !edit) {
      this.opts.store.setPreview(null);
      return;
    }
    this.opts.store.setPreview(Ops.editTree('', id, edit).apply(this.opts.store.state));
  }

  // --- Coordinates ----------------------------------------------------------------------

  private local(e: { clientX: number; clientY: number }): P {
    const r = this.region.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Region pixels → canvas units (Blender view space, y down). */
  private toCanvas(p: P): P {
    return { x: (p.x - this.view.x) / this.view.zoom, y: (p.y - this.view.y) / this.view.zoom };
  }

  /** Node top-left in canvas units: Blender's location has y up. */
  private nodeOrigin(n: ShaderNode): P {
    return { x: n.location.x, y: -n.location.y };
  }

  private socketPoint(t: NodeTree, ref: SocketRef, side: 'in' | 'out'): P | null {
    const n = nodeById(t, ref.node);
    const v = this.views.get(ref.node);
    if (!n || !v) return null;
    const o = this.nodeOrigin(n);
    const s = v.socketPosition(side, ref.socket);
    return { x: o.x + s.x, y: o.y + s.y };
  }

  private applyView(): void {
    const { x, y, zoom } = this.view;
    this.canvas.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    // Dot grid moves and scales with the view.
    const step = 20 * zoom;
    this.region.style.backgroundSize = `${step}px ${step}px`;
    this.region.style.backgroundPosition = `${x}px ${y}px`;
  }

  /** Home: every node in view. */
  frameAll(): void {
    const t = this.tree();
    if (!t || t.nodes.length === 0) return;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const n of t.nodes) {
      const o = this.nodeOrigin(n);
      const v = this.views.get(n.id);
      x0 = Math.min(x0, o.x);
      y0 = Math.min(y0, o.y);
      x1 = Math.max(x1, o.x + (v?.element.offsetWidth ?? 140));
      y1 = Math.max(y1, o.y + (v?.element.offsetHeight ?? 100));
    }
    const w = this.region.clientWidth || 600;
    const h = this.region.clientHeight || 300;
    const pad = 40;
    const zoom = Math.max(ZOOM_MIN, Math.min(1, (w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (y1 - y0)));
    this.view = { zoom, x: w / 2 - ((x0 + x1) / 2) * zoom, y: h / 2 - ((y0 + y1) / 2) * zoom };
    this.applyView();
  }

  // --- Drawing ---------------------------------------------------------------------------

  render(): void {
    const t = this.tree();
    const id = this.materialId;
    const name = id ? Ops.materialById(this.opts.store.displayState, id)?.name : undefined;
    this.materialLabel.textContent = name ?? '';
    this.empty.hidden = t !== null;
    if (!t) {
      for (const v of this.views.values()) {
        v.dispose();
        v.element.remove();
      }
      this.views.clear();
      this.linksSvg.replaceChildren();
      return;
    }
    const linkedIn = new Map<string, Set<string>>();
    const linkedOut = new Map<string, Set<string>>();
    for (const l of t.links) {
      (linkedIn.get(l.to.node) ?? linkedIn.set(l.to.node, new Set()).get(l.to.node)!).add(l.to.socket);
      (linkedOut.get(l.from.node) ?? linkedOut.set(l.from.node, new Set()).get(l.from.node)!).add(l.from.socket);
    }
    const seen = new Set<string>();
    const rebuilt: NodeView[] = [];
    for (const n of t.nodes) {
      seen.add(n.id);
      const ins = linkedIn.get(n.id) ?? new Set<string>();
      const outs = linkedOut.get(n.id) ?? new Set<string>();
      let v = this.views.get(n.id);
      if (!v || v.signature !== NodeView.signatureOf(n, ins, outs)) {
        const fresh = new NodeView(n, ins, outs, this.callbacks);
        if (v) {
          v.dispose();
          v.element.replaceWith(fresh.element);
        } else this.canvas.append(fresh.element);
        v = fresh;
        this.views.set(n.id, v);
        rebuilt.push(v);
      } else v.update(n);
      const o = this.nodeOrigin(n);
      v.element.style.left = `${o.x}px`;
      v.element.style.top = `${o.y}px`;
      v.element.classList.toggle('is-selected', this.selected.has(n.id));
      v.element.classList.toggle('is-active', this.active === n.id && this.selected.has(n.id));
    }
    for (const [nid, v] of this.views)
      if (!seen.has(nid)) {
        v.dispose();
        v.element.remove();
        this.views.delete(nid);
        this.selected.delete(nid);
      }
    for (const v of rebuilt) v.measure();
    if (this.framedFor !== id && t.nodes.length > 0 && this.region.clientWidth > 0) {
      this.framedFor = id;
      this.frameAll();
    }
    this.drawLinks(t);
  }

  private drawLinks(t: NodeTree): void {
    const insert = this.drag?.kind === 'move' ? this.drag.insert : null;
    const parts: string[] = [];
    for (const l of t.links) {
      const a = this.socketPoint(t, l.from, 'out');
      const b = this.socketPoint(t, l.to, 'in');
      if (!a || !b) continue;
      if (this.drag?.kind === 'link' && this.drag.detached === l.id) continue;
      const from = nodeById(t, l.from.node)!;
      const type = outputDef(from, l.from.socket)?.type ?? 'float';
      const valid = linkIsValid(t, l);
      const muted = from.muted || nodeById(t, l.to.node)!.muted;
      const color = !valid ? INVALID_LINK : SOCKET_COLORS[type];
      const hot = this.selected.has(l.from.node) || this.selected.has(l.to.node) || insert === l.id;
      const d = linkPath(a, b);
      parts.push(`<path d="${d}" class="ne-link-shadow"/>`);
      parts.push(`<path d="${d}" class="ne-link${hot ? ' is-hot' : ''}${muted ? ' is-muted' : ''}" style="stroke:${color}"/>`);
    }
    // A link being dragged.
    if (this.drag?.kind === 'link') {
      const fixed = this.socketPoint(t, this.drag.fixed, this.drag.fixedSide);
      if (fixed) {
        const free = this.drag.now;
        const [a, b] = this.drag.fixedSide === 'out' ? [fixed, free] : [free, fixed];
        parts.push(`<path d="${linkPath(a, b)}" class="ne-link is-dragging"/>`);
      }
    }
    this.linksSvg.innerHTML = parts.join('');
  }

  private drawOverlay(): void {
    const d = this.drag;
    if (d?.kind === 'box') {
      const x = Math.min(d.start.x, d.now.x);
      const y = Math.min(d.start.y, d.now.y);
      this.overlay.innerHTML = `<rect class="ne-box" x="${x}" y="${y}" width="${Math.abs(d.now.x - d.start.x)}" height="${Math.abs(d.now.y - d.start.y)}"/>`;
    } else if (d?.kind === 'cut') {
      this.overlay.innerHTML = `<polyline class="ne-cut" points="${d.points.map((p) => `${p.x},${p.y}`).join(' ')}"/>`;
    } else this.overlay.innerHTML = '';
  }

  private readonly callbacks = {
    previewValue: (nodeId: string, socket: string, v: SocketValue | null) => {
      this.preview(v === null ? null : (t) => setValue(t, nodeId, socket, v));
    },
    commitValue: (nodeId: string, socket: string, v: SocketValue) => {
      this.opts.store.setPreview(null);
      if (this.materialId) this.run(Ops.setValueOp(this.materialId, nodeId, socket, v));
    },
    previewProp: (nodeId: string, prop: string, v: PropValue | null) => {
      this.preview(v === null ? null : (t) => setProp(t, nodeId, prop, v));
    },
    commitProp: (nodeId: string, prop: string, v: PropValue) => {
      this.opts.store.setPreview(null);
      if (this.materialId) this.run(Ops.setPropOp(this.materialId, nodeId, prop, v));
    },
    togglePanel: (nodeId: string, panel: string) => {
      if (this.materialId) this.run(Ops.editTree('Toggle Panel', this.materialId, (t) => togglePanel(t, nodeId, panel)));
    },
    toggleCollapse: (nodeId: string) => {
      if (this.materialId) this.run(Ops.collapseOp(this.materialId, [nodeId]));
    },
    objects: () => this.opts.objects(),
  };

  // --- Pointer ---------------------------------------------------------------------------

  private onDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    const p = this.local(e);
    this.pointer = p;
    this.region.focus({ preventScroll: true });
    const pan = e.button === 1 || (e.button === 0 && e.altKey && this.opts.emulate3Button());
    if (pan) {
      this.drag = { kind: 'pan', last: p };
    } else if (e.button === 2 && e.ctrlKey) {
      this.drag = { kind: 'cut', points: [p] };
    } else if (e.button === 0) {
      if (target.closest('.ne-widget, .bl-menu-dropdown')) return; // fields and buttons handle themselves
      const socket = target.closest<HTMLElement>('.ne-socket');
      const nodeEl = target.closest<HTMLElement>('.ne-node');
      if (socket && nodeEl) this.startLink(nodeEl.dataset.node!, socket.dataset.side as 'in' | 'out', socket.dataset.socket!, p);
      else this.drag = { kind: 'press', start: p, nodeId: nodeEl?.dataset.node ?? null, shift: e.shiftKey };
    } else return;
    this.region.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  private startLink(nodeId: string, side: 'in' | 'out', socket: string, p: P): void {
    const t = this.tree();
    if (!t) return;
    const now = this.toCanvas(p);
    if (side === 'in') {
      const existing = t.links.find((l) => l.to.node === nodeId && l.to.socket === socket);
      if (existing) {
        // Dragging a linked input picks the link up from its source.
        this.drag = { kind: 'link', fixed: existing.from, fixedSide: 'out', detached: existing.id, now };
        this.drawLinks(t);
        return;
      }
    }
    this.drag = { kind: 'link', fixed: { node: nodeId, socket }, fixedSide: side, detached: null, now };
  }

  private onMove(e: PointerEvent): void {
    const p = this.local(e);
    const prev = this.pointer;
    this.pointer = p;
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pan') {
      this.view.x += p.x - d.last.x;
      this.view.y += p.y - d.last.y;
      d.last = p;
      this.applyView();
    } else if (d.kind === 'press') {
      if (Math.hypot(p.x - d.start.x, p.y - d.start.y) < DRAG_PX) return;
      if (d.nodeId) {
        if (!this.selected.has(d.nodeId)) this.selectOnly(d.nodeId);
        this.startMove(d.start, false);
        this.onMove(e);
      } else {
        this.drag = { kind: 'box', start: d.start, now: p, shift: d.shift };
        this.drawOverlay();
      }
    } else if (d.kind === 'move') {
      this.updateMove(p);
    } else if (d.kind === 'box') {
      d.now = p;
      this.drawOverlay();
    } else if (d.kind === 'link') {
      d.now = this.toCanvas(p);
      const t = this.tree();
      if (t) this.drawLinks(t);
    } else if (d.kind === 'cut') {
      if (Math.hypot(p.x - prev.x, p.y - prev.y) > 2) d.points.push(p);
      this.drawOverlay();
    }
  }

  private onUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d || (d.kind === 'move' && d.modal)) return;
    if (d.kind === 'press') {
      // A click: select (Shift toggles) or, on the background, deselect everything.
      if (d.nodeId) this.clickSelect(d.nodeId, d.shift);
      else if (!d.shift) this.setSelection([], null);
    } else if (d.kind === 'move') {
      this.finishMove();
      return;
    } else if (d.kind === 'box') {
      this.boxSelect(d);
    } else if (d.kind === 'link') {
      this.finishLink(d, e);
    } else if (d.kind === 'cut') {
      this.finishCut(d.points);
    }
    this.drag = null;
    this.drawOverlay();
    const t = this.tree();
    if (t) this.drawLinks(t);
  }

  private cancelDrag(): void {
    if (this.drag?.kind === 'move') this.preview(null);
    this.drag = null;
    this.drawOverlay();
    this.render();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const p = this.local(e);
    const before = this.toCanvas(p);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.view.zoom * factor));
    this.view.x = p.x - before.x * this.view.zoom;
    this.view.y = p.y - before.y * this.view.zoom;
    this.applyView();
  }

  // --- Selection -------------------------------------------------------------------------

  private setSelection(ids: Iterable<string>, active: string | null): void {
    this.selected = new Set(ids);
    this.active = active;
    this.render();
  }

  private selectOnly(id: string): void {
    this.setSelection([id], id);
  }

  /** Left click: select only; Shift: add, make active, or deselect the active one. */
  private clickSelect(id: string, shift: boolean): void {
    if (!shift) return this.selectOnly(id);
    const next = new Set(this.selected);
    if (next.has(id) && this.active === id) {
      next.delete(id);
      this.setSelection(next, null);
    } else {
      next.add(id);
      this.setSelection(next, id);
    }
  }

  private boxSelect(d: Extract<Drag, { kind: 'box' }>): void {
    const a = this.toCanvas(d.start);
    const b = this.toCanvas(d.now);
    const box = { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
    const t = this.tree();
    if (!t) return;
    const hits = t.nodes.filter((n) => {
      const o = this.nodeOrigin(n);
      const v = this.views.get(n.id)!;
      return rectsOverlap(box, { x0: o.x, y0: o.y, x1: o.x + v.element.offsetWidth, y1: o.y + v.element.offsetHeight });
    });
    const ids = d.shift ? [...this.selected, ...hits.map((n) => n.id)] : hits.map((n) => n.id);
    this.setSelection(ids, hits[0]?.id ?? this.active);
  }

  // --- Moving ----------------------------------------------------------------------------

  private startMove(from: P, modal: boolean): void {
    const ids = [...this.selected];
    if (ids.length === 0) return;
    this.drag = { kind: 'move', start: from, ids, insert: null, modal };
  }

  private updateMove(p: P): void {
    const d = this.drag;
    if (d?.kind !== 'move') return;
    const dx = (p.x - d.start.x) / this.view.zoom;
    const dy = (p.y - d.start.y) / this.view.zoom;
    // Blender's y is up.
    this.preview((t) => moveNodes(t, d.ids, dx, -dy));
    d.insert = this.insertTarget(d.ids);
    const t = this.tree();
    if (t) this.drawLinks(t);
  }

  /** A single node without links, dragged over a link, will be inserted into it. */
  private insertTarget(ids: readonly string[]): string | null {
    const t = this.tree();
    if (!t || ids.length !== 1) return null;
    const id = ids[0]!;
    if (t.links.some((l) => l.from.node === id || l.to.node === id)) return null;
    const v = this.views.get(id);
    const n = nodeById(t, id);
    if (!v || !n) return null;
    const o = this.nodeOrigin(n);
    const centre = { x: o.x + v.element.offsetWidth / 2, y: o.y + 10 };
    let best: { id: string; d: number } | null = null;
    for (const l of t.links) {
      const a = this.socketPoint(t, l.from, 'out');
      const b = this.socketPoint(t, l.to, 'in');
      if (!a || !b) continue;
      const dist = distanceToLink(centre, a, b);
      if (dist < INSERT_DISTANCE && (!best || dist < best.d)) best = { id: l.id, d: dist };
    }
    return best?.id ?? null;
  }

  private finishMove(): void {
    const d = this.drag;
    if (d?.kind !== 'move' || !this.materialId) return;
    const dx = (this.pointer.x - d.start.x) / this.view.zoom;
    const dy = (this.pointer.y - d.start.y) / this.view.zoom;
    const insert = d.insert;
    this.drag = null;
    this.opts.store.setPreview(null);
    this.run(
      Ops.editTree('Move', this.materialId, (t) => {
        const moved = dx === 0 && dy === 0 ? t : moveNodes(t, d.ids, dx, -dy);
        return insert ? insertOnLink(moved, d.ids[0]!, insert) : moved;
      }),
    );
    this.render();
  }

  // --- Links -----------------------------------------------------------------------------

  private finishLink(d: Extract<Drag, { kind: 'link' }>, e: PointerEvent): void {
    const id = this.materialId;
    if (!id) return;
    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const socket = under?.closest<HTMLElement>('.ne-socket');
    const nodeEl = under?.closest<HTMLElement>('.ne-node');
    const wantSide = d.fixedSide === 'out' ? 'in' : 'out';
    if (socket && nodeEl && socket.dataset.side === wantSide && nodeEl.dataset.node !== d.fixed.node) {
      const other: SocketRef = { node: nodeEl.dataset.node!, socket: socket.dataset.socket! };
      const [from, to] = d.fixedSide === 'out' ? [d.fixed, other] : [other, d.fixed];
      const detached = d.detached;
      this.run(
        Ops.editTree('Link Nodes', id, (t) => {
          const base = detached ? { ...t, links: t.links.filter((l) => l.id !== detached) } : t;
          return connect(base, from, to);
        }),
      );
    } else if (d.detached) {
      // A picked-up link dropped on nothing is removed.
      this.run(Ops.unlinkOp(id, d.detached));
    }
  }

  private finishCut(points: readonly P[]): void {
    const t = this.tree();
    const id = this.materialId;
    if (!t || !id || points.length < 2) return;
    const stroke = points.map((p) => this.toCanvas(p));
    const cut = t.links.filter((l) => {
      const a = this.socketPoint(t, l.from, 'out');
      const b = this.socketPoint(t, l.to, 'in');
      return a && b && strokeCrossesLink(stroke, a, b);
    });
    this.run(Ops.cutLinksOp(id, cut.map((l) => l.id)));
  }

  // --- Keys ------------------------------------------------------------------------------

  private onKey = (e: KeyboardEvent): void => {
    if (!this.hovering && !(this.drag?.kind === 'move' && this.drag.modal)) return;
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    const id = this.materialId;
    const t = this.tree();
    if (!id || !t) return;
    const d = this.drag;
    if (d?.kind === 'move' && d.modal) {
      if (e.code === 'Escape') this.cancelDrag();
      else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') this.finishMove();
      else return;
      e.preventDefault();
      return;
    }
    if (this.drag) return;
    const ids = [...this.selected];
    const k = e.code;
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey;
    if (k === 'KeyA' && e.shiftKey && plain) this.openAddMenu(this.pointer);
    else if (k === 'KeyA' && !e.shiftKey && plain) this.setSelection(t.nodes.map((n) => n.id), this.active);
    else if (k === 'KeyA' && e.altKey && !e.ctrlKey && !e.shiftKey) this.setSelection([], null);
    else if (k === 'KeyG' && plain && !e.shiftKey) this.startMove(this.pointer, true);
    else if (k === 'KeyD' && e.shiftKey && plain) this.duplicate(t, ids);
    else if ((k === 'KeyX' || k === 'Delete') && plain && !e.shiftKey) this.run(Ops.deleteNodesOp(id, ids));
    else if (k === 'KeyX' && e.ctrlKey && !e.shiftKey && !e.altKey) this.run(Ops.dissolveNodesOp(id, ids));
    else if (k === 'KeyM' && plain && !e.shiftKey) this.run(Ops.muteOp(id, ids));
    else if (k === 'KeyH' && plain && !e.shiftKey) this.run(Ops.collapseOp(id, ids));
    else if (k === 'KeyH' && e.ctrlKey && !e.shiftKey && !e.altKey) this.run(Ops.hideSocketsOp(id, ids));
    else if (k === 'Home' && plain) this.frameAll();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  private duplicate(t: NodeTree, ids: readonly string[]): void {
    const id = this.materialId;
    if (!id || ids.length === 0) return;
    const before = new Set(t.nodes.map((n) => n.id));
    if (!this.run(Ops.duplicateNodesOp(id, ids, { x: 0, y: 0 }))) return;
    const copies = (this.tree(this.opts.store.state)?.nodes ?? []).filter((n) => !before.has(n.id)).map((n) => n.id);
    this.setSelection(copies, copies[copies.length - 1] ?? null);
    this.startMove(this.pointer, true);
  }

  /** Shift+A: Blender 5.2's Add menu; the new node appears under the pointer and follows it until a click. */
  private openAddMenu(at: P): void {
    const toItems = (entries: readonly AddMenuEntry[]): MenuItem[] =>
      entries.map((e): MenuItem => {
        if (e.kind === 'separator') return 'separator';
        if (e.kind === 'off') return { label: e.label, disabled: true };
        if (e.kind === 'menu') return { label: e.label, submenu: toItems(ADD_MENUS[e.label] ?? []) };
        return { label: e.label, action: () => this.addNode(e.type, e.props) };
      });
    openMenuAt(this.region, at.x, at.y, toItems(ADD_MENU_ROOT), 'Add');
  }

  private addNode(type: string, props?: Readonly<Record<string, PropValue>>): void {
    const id = this.materialId;
    const t = this.tree(this.opts.store.state);
    if (!id || !t) return;
    const c = this.toCanvas(this.pointer);
    const before = new Set(t.nodes.map((n) => n.id));
    // The node's top-left a little left of and above the pointer, as Blender centres it.
    if (!this.run(Ops.addNodeOp(id, type, { x: c.x - 70, y: -(c.y - 10) }, props))) return;
    const added = (this.tree(this.opts.store.state)?.nodes ?? []).find((n) => !before.has(n.id));
    if (!added) return;
    this.setSelection([added.id], added.id);
    this.startMove(this.pointer, true);
  }
}

