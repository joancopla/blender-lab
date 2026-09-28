/**
 * Properties Editor: the vertical tab strip and the active tab's content.
 * Tabs follow the active object (tabs.ts); the lab decides which ones work.
 * Each working tab provides a view that is mounted when the tab is shown and
 * updated on every scene change, so it can keep its own DOM (fields being
 * edited, expanded panels).
 */
import { t } from '../../../../core/i18n';
import type { SceneState } from '../../scene/scene';
import type { SceneStore } from '../../scene/store';
import { TAB_ICONS } from './icons';
import { type PropertiesTab, type PropertiesTabId, resolveActiveTab, tabsFor } from './tabs';

export interface TabView {
  update(state: SceneState): void;
  dispose?(): void;
}

/** What a tab can use: the history (every change goes through an operator). */
export interface TabContext {
  readonly store: SceneStore;
}

/** Builds a tab's content inside `body`. */
export type TabViewFactory = (body: HTMLElement, ctx: TabContext) => TabView;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class PropertiesEditor {
  private readonly strip: HTMLElement;
  private readonly body: HTMLElement;
  private shownKey = '';
  private active: PropertiesTabId | null = null;
  private view: { id: PropertiesTabId; view: TabView } | null = null;
  private state: SceneState | null = null;

  /** `views`: the tabs the lab enables, with their content. */
  constructor(
    area: HTMLElement,
    private readonly views: Partial<Record<PropertiesTabId, TabViewFactory>>,
    private readonly ctx: TabContext,
  ) {
    const header = el('div', 'bl-header');
    header.append(el('span', 'bl-editor-type', '⚙'), el('span', 'bl-search'));
    const main = el('div', 'bl-props');
    this.strip = el('div', 'bl-props-tabs');
    this.strip.setAttribute('role', 'tablist');
    this.body = el('div', 'bl-props-body');
    main.append(this.strip, this.body);
    area.append(header, main);
  }

  private get enabled(): Set<PropertiesTabId> {
    return new Set(Object.keys(this.views) as PropertiesTabId[]);
  }

  update(state: SceneState): void {
    this.state = state;
    const active = state.objects.find((o) => o.id === state.activeId);
    const shown = tabsFor(active?.type ?? null);
    const key = shown.map((s) => s.id).join(',');
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.active = resolveActiveTab(this.active, shown, this.enabled);
      this.drawStrip(shown);
    }
    this.syncView();
    this.view?.view.update(state);
  }

  /** Shows a tab (a click, or a lab stage opening it). Inactive or hidden tabs are ignored. */
  select(id: PropertiesTabId): void {
    if (!this.enabled.has(id) || !this.shownKey.split(',').includes(id) || this.active === id) return;
    this.active = id;
    for (const b of this.strip.querySelectorAll<HTMLElement>('[data-tab]')) {
      const on = b.dataset.tab === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    }
    this.syncView();
    if (this.state) this.view?.view.update(this.state);
  }

  get activeTab(): PropertiesTabId | null {
    return this.active;
  }

  private drawStrip(shown: readonly PropertiesTab[]): void {
    const enabled = this.enabled;
    this.strip.replaceChildren();
    let group = shown[0]?.group;
    for (const tab of shown) {
      if (tab.group !== group) {
        this.strip.append(el('div', 'bl-props-tab-gap'));
        group = tab.group;
      }
      const b = el('button', 'bl-props-tab');
      b.type = 'button';
      b.dataset.tab = tab.id;
      b.title = tab.label;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', tab.label);
      b.setAttribute('aria-selected', String(tab.id === this.active));
      b.innerHTML = TAB_ICONS[tab.id];
      b.classList.toggle('is-active', tab.id === this.active);
      if (enabled.has(tab.id)) {
        b.addEventListener('click', () => this.select(tab.id));
      } else {
        b.disabled = true;
        b.classList.add('is-inactive');
      }
      // Keep keyboard focus in the viewport: Enter or Space would press the tab again.
      b.addEventListener('mousedown', (e) => e.preventDefault());
      this.strip.append(b);
    }
  }

  /** Mounts the active tab's view if it changed. */
  private syncView(): void {
    if (this.view?.id === this.active) return;
    this.view?.view.dispose?.();
    this.view = null;
    this.body.replaceChildren();
    if (this.active === null) {
      this.body.append(el('p', 'bl-props-note', t('lab.propertiesUnused')));
      return;
    }
    this.view = { id: this.active, view: this.views[this.active]!(this.body, this.ctx) };
  }
}

/**
 * Context path at the top of a tab (Blender's breadcrumb), e.g. "Cube".
 * FIDELITY? What each tab shows there.
 */
export function contextPath(parts: readonly string[]): HTMLElement {
  const path = el('div', 'bl-props-context');
  parts.forEach((p, i) => {
    if (i > 0) path.append(el('span', 'bl-props-context-sep', '›'));
    path.append(el('span', undefined, p));
  });
  return path;
}
