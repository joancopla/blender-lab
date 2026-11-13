/**
 * The Photoshop replica as seen by the core (app contract): a document with
 * layers, the transform box and the minimum of the window around it (menu bar,
 * options bar, tools, document tab and a reduced Layers panel).
 *
 * Interface texts are Spanish, as in the classroom (ui/labels.ts). Everything
 * replicated is listed in docs/fidelity/photoshop.md.
 */
import type { AppMountOptions, PreferenceDefinition, ReplicatedApp } from '../../core/app-contract';
import { HistoryStore, type LogEntry } from '../../core/history/store';
import { t } from '../../core/i18n';
import { EMPTY_DOC, type PsDecorations, type PsDoc, type PsSetup, type PsState, initialDoc, layerById, setLayerQuad, withLayerQuad } from './document/state';
import { type Point, type Quad, mapQuad, pt, quadBounds } from './geometry';
import { Compositor } from './render/compositor';
import { type TransformSession, beginSession, isUntouched, pushBox, sessionLayerQuad, undoBox, withMode } from './transform/session';
import { type QuickTransform, type TransformMode, quickTransform } from './transform/transform';
import { EDIT, HISTORY, MENU_BAR, MODE_LABELS, QUICK_LABELS, SHORTCUTS, TOOLS, WARP, tabTitle, formatNumber } from './ui/labels';
import { ICONS } from './ui/icons';
import { LayersPanel } from './ui/layers-panel';
import { type MenuEntry, MenuHost } from './ui/menu';
import { OptionsBar } from './ui/options-bar';
import { StageView } from './ui/stage-view';
import './texts';
import './ui/ps.css';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** What the parts of the window (stage, options bar, Layers panel) can ask the app. */
export interface PsController {
  state(): PsState;
  session(): TransformSession | null;
  /** The transform box as drawn now (while dragging, the uncommitted one). */
  box(): Quad | null;
  contentCanvas(id: string): HTMLCanvasElement | undefined;
  selectLayer(id: string): void;
  toggleVisible(id: string): void;
  /** Shows a box while a handle is being dragged (null: back to the last adjustment). */
  previewBox(box: Quad | null): void;
  /** Records a finished adjustment of the box (one Ctrl + Z step inside the transform). */
  adjustBox(box: Quad): void;
  commit(): void;
  cancel(): void;
  /** Move tool: shows the active layer displaced while dragging (null: back). */
  previewMove(delta: Point | null): void;
  commitMove(delta: Point): void;
  contextMenu(x: number, y: number): void;
}

export class PhotoshopApp implements ReplicatedApp<PsState, PsSetup, PsDecorations>, PsController {
  readonly preferences: readonly PreferenceDefinition[] = [];
  private store = new HistoryStore<PsDoc>(EMPTY_DOC);
  private compositor = new Compositor();
  private listeners = new Set<() => void>();
  private root: HTMLElement | null = null;
  private menus!: MenuHost;
  private options!: OptionsBar;
  private stage!: StageView;
  private layers!: LayersPanel;
  private tab!: HTMLElement;

  // What Photoshop keeps out of its history: the selected layer and visibility.
  // FIDELITY? "Make Layer Visibility Changes Undoable" is off by default.
  private activeLayerId: string | null = null;
  private hidden = new Set<string>();
  private current: TransformSession | null = null;
  private dragBox: Quad | null = null;
  private composed: PsState | null = null;

  mount(container: HTMLElement, _options: AppMountOptions): void {
    const root = el('div', 'ps');
    root.tabIndex = -1;
    this.root = root;
    this.menus = new MenuHost(root);

    const menubar = el('div', 'ps-menubar');
    menubar.setAttribute('role', 'menubar');
    for (const name of MENU_BAR) {
      const b = el('button', 'ps-menubar-item', name);
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      if (name === 'Edición') b.addEventListener('click', () => this.toggleEditMenu(b));
      menubar.append(b);
    }

    this.options = new OptionsBar(this);
    const main = el('div', 'ps-main');
    const tools = el('div', 'ps-tools');
    for (const [id, title] of Object.entries(TOOLS)) {
      const b = el('button', id === 'move' ? 'ps-tool is-active' : 'ps-tool');
      b.type = 'button';
      b.title = title;
      b.innerHTML = ICONS[id as keyof typeof TOOLS];
      // Only the Move tool works in this lab.
      if (id !== 'move') b.setAttribute('aria-disabled', 'true');
      tools.append(b);
    }
    const work = el('div', 'ps-work');
    const tabs = el('div', 'ps-tabs');
    this.tab = el('div', 'ps-tab');
    tabs.append(this.tab);
    this.stage = new StageView(this, this.compositor);
    work.append(tabs, this.stage.element);
    this.layers = new LayersPanel(this);
    const panels = el('div', 'ps-panels');
    panels.append(this.layers.element);
    main.append(tools, work, panels);
    root.append(menubar, this.options.element, main);
    container.append(root);

    root.addEventListener('keydown', (e) => this.onKey(e));
    // Alt on its own would move the focus to the browser's menu on Windows.
    root.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') e.preventDefault();
    });
    root.addEventListener('pointerdown', () => {
      if (!root.contains(document.activeElement) || document.activeElement === document.body) root.focus({ preventScroll: true });
    });
    // The zoom on the document tab follows the size of the window.
    root.addEventListener('ps-zoom', () => this.renderTab());
    this.store.onChange(() => this.changed());
  }

  unmount(): void {
    this.stage.dispose();
    this.root?.remove();
    this.root = null;
  }

  getState(): PsState {
    return this.state();
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  load(setup: PsSetup): void {
    this.compositor.setContents(setup.layers.map((l) => l.content));
    this.current = null;
    this.dragBox = null;
    this.hidden = new Set(setup.layers.filter((l) => l.visible === false).map((l) => l.id));
    this.activeLayerId = setup.active ?? setup.layers[setup.layers.length - 1]?.id ?? null;
    this.menus.close();
    this.layers.reset();
    this.store.reset(initialDoc(setup));
  }

  get log(): readonly LogEntry[] {
    return this.store.log;
  }

  decorate(decorations: PsDecorations | undefined): void {
    this.stage.setTargets(decorations?.targets ?? []);
  }

  overlayHost(): HTMLElement {
    return this.stage.element;
  }

  inputHost(): HTMLElement {
    return this.root!;
  }

  /** Lab tool (not Photoshop): full screen, where the browser lets the page receive Ctrl + T. */
  renderLabTools(container: HTMLElement): void {
    const keyboard = (navigator as Navigator & { keyboard?: { lock?(keys: string[]): Promise<void>; unlock?(): void } }).keyboard;
    if (!document.documentElement.requestFullscreen || !keyboard?.lock) return;
    const box = el('div', 'lab-tool');
    const button = el('button', 'lab-button', t('ps.tools.fullscreen'));
    button.type = 'button';
    const sync = () => (button.textContent = t(document.fullscreenElement ? 'ps.tools.fullscreenExit' : 'ps.tools.fullscreen'));
    button.addEventListener('click', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else {
        void document.documentElement
          .requestFullscreen()
          .then(() => keyboard.lock!(['KeyT']))
          .then(() => this.root?.focus({ preventScroll: true }))
          .catch(() => undefined);
      }
    });
    document.addEventListener('fullscreenchange', sync);
    box.append(el('p', 'lab-tool-help', t('ps.tools.fullscreenHelp')), button);
    container.append(box);
  }

  // --- Controller ----------------------------------------------------------------

  state(): PsState {
    if (this.composed) return this.composed;
    const doc = this.store.displayState;
    const s = this.current;
    this.composed = {
      name: doc.name,
      width: doc.width,
      height: doc.height,
      layers: doc.layers.map((l) => ({ ...l, visible: !this.hidden.has(l.id) })),
      activeLayerId: this.activeLayerId,
      transform: s ? { layerId: s.layerId, mode: s.mode } : null,
    };
    return this.composed;
  }

  session(): TransformSession | null {
    return this.current;
  }

  box(): Quad | null {
    return this.dragBox ?? this.current?.box ?? null;
  }

  contentCanvas(id: string): HTMLCanvasElement | undefined {
    return this.compositor.contentCanvas(id);
  }

  selectLayer(id: string): void {
    // FIDELITY? With a transform running, Photoshop asks to apply it first; the lab ignores the click.
    if (this.current || this.activeLayerId === id) return;
    this.activeLayerId = id;
    this.changed();
  }

  toggleVisible(id: string): void {
    if (this.hidden.has(id)) this.hidden.delete(id);
    else this.hidden.add(id);
    this.changed();
  }

  previewBox(box: Quad | null): void {
    this.dragBox = box;
    this.showSession();
  }

  adjustBox(box: Quad): void {
    if (!this.current) return;
    this.dragBox = null;
    this.current = pushBox(this.current, box);
    this.showSession();
  }

  commit(): void {
    const s = this.current;
    if (!s) return;
    this.current = null;
    this.dragBox = null;
    // FIDELITY? Applying a transform that changed nothing leaves no history step.
    if (isUntouched(s)) this.store.setPreview(null);
    else this.store.execute(setLayerQuad(s.layerId, sessionLayerQuad(s), HISTORY.freeTransform));
  }

  cancel(): void {
    if (!this.current) return;
    this.current = null;
    this.dragBox = null;
    this.store.logCancel(HISTORY.freeTransform, 'escape');
  }

  previewMove(delta: Point | null): void {
    const layer = this.activeLayer();
    if (!layer || !delta) this.store.setPreview(null);
    else this.store.setPreview(withLayerQuad(this.store.state, layer.id, mapQuad(layer.quad, (p) => pt(p.x + delta.x, p.y + delta.y))));
  }

  commitMove(delta: Point): void {
    const layer = this.activeLayer();
    if (!layer) return;
    this.store.execute(setLayerQuad(layer.id, mapQuad(layer.quad, (p) => pt(p.x + delta.x, p.y + delta.y)), HISTORY.move));
  }

  contextMenu(x: number, y: number): void {
    if (this.current) this.menus.show(this.transformEntries(), x, y);
  }

  // --- Commands ------------------------------------------------------------------

  /** The selected layer as committed (not the preview). */
  private activeLayer() {
    return layerById(this.store.state, this.activeLayerId);
  }

  private canTransform(): boolean {
    const layer = this.activeLayer();
    return layer !== undefined && !layer.background;
  }

  /** Edición > Transformación libre, or one of Edición > Transformar. */
  private begin(mode: TransformMode): void {
    if (this.current) {
      this.current = withMode(this.current, mode);
      this.showSession();
      return;
    }
    const layer = this.activeLayer();
    if (!layer || layer.background) return;
    this.current = beginSession(layer.id, layer.quad, mode);
    this.showSession();
  }

  /** Rotate 180°, Rotate 90° and Flip. */
  private quick(kind: QuickTransform): void {
    if (this.current) {
      // FIDELITY? Inside a running transform they change the box and still need committing.
      this.adjustBox(quickTransform(this.current.box, kind));
      return;
    }
    const layer = this.activeLayer();
    if (!layer || layer.background) return;
    const b = quadBounds(layer.quad);
    this.store.execute(setLayerQuad(layer.id, quickTransform(layer.quad, kind, pt(b.x + b.w / 2, b.y + b.h / 2)), QUICK_LABELS[kind]));
  }

  private undo(): void {
    if (this.current) {
      this.dragBox = null;
      this.current = undoBox(this.current);
      this.showSession();
    } else this.store.undo();
  }

  private redo(): void {
    if (!this.current) this.store.redo();
  }

  /** Draws the layer as the running transform leaves it. */
  private showSession(): void {
    const s = this.current;
    if (!s) return this.store.setPreview(null);
    const shown = this.dragBox ? { ...s, box: this.dragBox } : s;
    this.store.setPreview(withLayerQuad(this.store.state, s.layerId, sessionLayerQuad(shown)));
  }

  // --- Menus ---------------------------------------------------------------------

  private transformEntries(): MenuEntry[] {
    const can = this.canTransform();
    const mode = this.current?.mode;
    const modes = (Object.keys(MODE_LABELS) as (keyof typeof MODE_LABELS)[]).map(
      (m): MenuEntry => ({ label: MODE_LABELS[m], enabled: can, checked: mode === m, run: () => this.begin(m) }),
    );
    const quicks = (kinds: QuickTransform[]) => kinds.map((k): MenuEntry => ({ label: QUICK_LABELS[k], enabled: can, run: () => this.quick(k) }));
    return [
      { label: EDIT.freeTransform, enabled: can, checked: mode === 'free', run: () => this.begin('free') },
      ...modes,
      // Warp is not part of this lab.
      { label: WARP, enabled: false },
      'separator',
      ...quicks(['rotate180', 'rotate90cw', 'rotate90ccw']),
      'separator',
      ...quicks(['flipH', 'flipV']),
    ];
  }

  private editEntries(): MenuEntry[] {
    const inSession = this.current !== null;
    const can = this.canTransform();
    const steps = this.store.log;
    // FIDELITY? "Deshacer <paso>" names the step that would be undone.
    const last = this.store.canUndo ? [...steps].reverse().find((e) => e.kind === 'execute' || e.kind === 'redo') : undefined;
    const [, ...rest] = this.transformEntries();
    return [
      { label: last && !inSession ? `${EDIT.undo} ${last.name}` : EDIT.undo, shortcut: SHORTCUTS.undo, enabled: inSession ? this.current!.undo.length > 0 : this.store.canUndo, run: () => this.undo() },
      { label: EDIT.redo, shortcut: SHORTCUTS.redo, enabled: !inSession && this.store.canRedo, run: () => this.redo() },
      'separator',
      { label: EDIT.freeTransform, shortcut: SHORTCUTS.freeTransform, enabled: can, run: () => this.begin('free') },
      {
        label: EDIT.transform,
        enabled: can,
        // "Otra vez" (Transform Again) is not part of this lab.
        submenu: [{ label: EDIT.again, shortcut: SHORTCUTS.again, enabled: false }, 'separator', ...rest],
      },
    ];
  }

  private toggleEditMenu(button: HTMLButtonElement): void {
    if (button.classList.contains('is-open')) return this.menus.close();
    const r = button.getBoundingClientRect();
    const base = this.root!.getBoundingClientRect();
    button.classList.add('is-open');
    this.menus.show(this.editEntries(), r.left - base.left, r.bottom - base.top, () => button.classList.remove('is-open'));
  }

  // --- Keyboard ------------------------------------------------------------------

  private onKey(e: KeyboardEvent): void {
    const typing = (e.target as HTMLElement).matches('input');
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (e.key === 'Alt') return e.preventDefault();
    if (e.key === 'Escape') {
      if (this.menus.isOpen) this.menus.close();
      else if (typing) (e.target as HTMLElement).blur();
      else this.cancel();
      return e.preventDefault();
    }
    if (typing) return;
    if (e.key === 'Enter') {
      if (this.current) {
        this.commit();
        e.preventDefault();
      }
      return;
    }
    if (!ctrl) return;
    if (key === 'z') {
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (key === 't' && !e.shiftKey) {
      // Only arrives where the browser gives the key to the page (full screen with Keyboard Lock).
      if (this.canTransform()) this.begin('free');
    } else return;
    e.preventDefault();
  }

  // --- Drawing -------------------------------------------------------------------

  private changed(): void {
    this.composed = null;
    this.render();
    for (const fn of this.listeners) fn();
  }

  private render(): void {
    if (!this.root) return;
    const s = this.state();
    this.root.classList.toggle('is-transforming', s.transform !== null);
    this.stage.render();
    this.options.render();
    this.layers.render();
    this.renderTab();
  }

  private renderTab(): void {
    const s = this.state();
    const active = layerById(s, s.activeLayerId);
    const zoom = this.stage.zoom * 100;
    this.tab.textContent = tabTitle(s.name, formatNumber(zoom, Number.isInteger(Math.round(zoom * 10) / 10) ? 0 : 1), active?.name ?? '');
  }
}
