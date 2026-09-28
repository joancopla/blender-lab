/**
 * Collection index (DESIGN.md, "Pàgina índex"): title block bar, hero with the
 * three-view blueprint and the main action, and the labs as numbered rows
 * grouped by program.
 */
import type { LabDefinition } from '../core/lab';
import { ProgressStore } from '../core/stages/progress';
import { t } from '../core/i18n';
import { KEY_OVERLAY_PREF, type PrefValues, loadPrefs, savePrefs } from '../core/shell/prefs';
import { renderPrefSwitches } from '../core/shell/prefs-panel';
import { themeButton } from '../core/shell/theme';
import { BLENDER_PREFERENCES } from '../apps/blender/blender-app';
import { axisText } from '../core/shell/axis-text';
import { type BlueprintView, earnedLineIds, highlightLab, renderBlueprintView } from '../core/shell/blueprint';
import { STOOL_BLUEPRINT } from '../labs/blender/blueprint';
import { lab01 } from '../labs/blender/01-viewport';
import { lab02 } from '../labs/blender/02-edit-mode';
import { lab03 } from '../labs/blender/03-modifiers';
import { lab04 } from '../labs/blender/04-lights';
import '../core/shell/shell.css';
import './site.css';

interface LabEntry {
  readonly lab: LabDefinition;
  readonly href: string;
}

interface Shortcut {
  /** i18n key of what it does. */
  readonly labelKey: string;
  /** Key ids (keys.<id>). */
  readonly keys: readonly string[];
}

interface ProgramGroup {
  /** i18n key of the program name. */
  readonly nameKey: string;
  readonly labs: readonly LabEntry[];
  /** Real shortcuts taught in the labs, for the index strip. */
  readonly shortcuts: readonly Shortcut[];
}

const PROGRAMS: readonly ProgramGroup[] = [
  {
    nameKey: 'app.name',
    labs: [
      { lab: lab01, href: 'labs/01-viewport/' },
      { lab: lab02, href: 'labs/02-edit-mode/' },
      { lab: lab03, href: 'labs/03-modifiers/' },
      { lab: lab04, href: 'labs/04-lights/' },
    ],
    shortcuts: [
      { labelKey: 'shortcuts.grab', keys: ['g'] },
      { labelKey: 'shortcuts.rotate', keys: ['r'] },
      { labelKey: 'shortcuts.scale', keys: ['s'] },
      { labelKey: 'shortcuts.axis', keys: ['g', 'x'] },
      { labelKey: 'shortcuts.views', keys: ['numpad1', 'numpad3', 'numpad7'] },
      { labelKey: 'shortcuts.editMode', keys: ['tab'] },
      { labelKey: 'shortcuts.extrude', keys: ['e'] },
      { labelKey: 'shortcuts.undo', keys: ['ctrlZ'] },
    ],
  },
];

const PREF_TOGGLES = [
  ...BLENDER_PREFERENCES,
  { key: KEY_OVERLAY_PREF, labelKey: 'prefs.keyOverlay', helpKey: 'prefs.keyOverlayHelp' },
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

interface LabProgress {
  readonly done: number;
  readonly total: number;
  readonly started: boolean;
}

function progressOf(lab: LabDefinition): LabProgress {
  const p = ProgressStore.read(lab.id);
  const total = lab.stages.stages.length;
  const done = lab.stages.stages.filter((s) => p.completed.includes(s.id)).length;
  return { done, total, started: done > 0 || p.current !== 0 };
}

const root = document.getElementById('site')!;
root.className = 'lab-page site-page';
let justReset: string | null = null;

function topBar(): HTMLElement {
  const bar = el('header', 'site-top grid-paper');
  const name = el('a', 'site-name', t('site.title'));
  name.href = './';
  const tools = el('div', 'site-top-tools');

  const prefs = el('details', 'site-prefs');
  const list = el('div', 'site-prefs-list');
  prefs.append(el('summary', 'site-top-button', t('prefs.title')), list);
  const defaults: PrefValues = {
    ...Object.fromEntries(BLENDER_PREFERENCES.map((p) => [p.key, p.default])),
    [KEY_OVERLAY_PREF]: true,
  };
  const set = (next: PrefValues) => {
    savePrefs(next);
    renderPrefSwitches(list, PREF_TOGGLES, next, set);
  };
  renderPrefSwitches(list, PREF_TOGGLES, loadPrefs(defaults), set);

  tools.append(prefs, themeButton('site-top-button'));
  bar.append(name, tools);
  return bar;
}

function views(): HTMLElement {
  const earned = earnedLineIds(STOOL_BLUEPRINT, (labId, stageId) => ProgressStore.read(labId).completed.includes(stageId));
  const figure = el('figure', 'site-blueprint grid-paper');
  figure.setAttribute('aria-label', t('site.blueprintTitle'));
  for (const v of ['front', 'side', 'top'] as const) {
    const view = el('div', `site-view site-view-${v}`);
    const drawing = el('div', 'site-view-drawing');
    drawing.dataset.view = v;
    drawing.append(renderBlueprintView(STOOL_BLUEPRINT, v as BlueprintView, earned));
    view.append(drawing, el('span', 'site-view-label', t(`site.views.${v}`)));
    figure.append(view);
  }
  figure.append(el('figcaption', 'site-blueprint-note', t('site.blueprintEmpty')));
  return figure;
}

function mainAction(): HTMLAnchorElement {
  // Labs still being built are never the main action.
  const all = PROGRAMS.flatMap((g) => g.labs).filter((e) => !e.lab.preview);
  const next = all.find((e) => {
    const p = progressOf(e.lab);
    return p.done < p.total;
  });
  const entry = next ?? all[0]!;
  const p = progressOf(entry.lab);
  const key = !next ? 'site.review' : p.started ? 'site.continue' : 'site.start';
  const a = el('a', 'lab-button lab-button-primary site-cta', t(key, { n: entry.lab.number }));
  a.href = entry.href;
  return a;
}

function labRow(entry: LabEntry, blueprint: HTMLElement): HTMLLIElement {
  const { lab } = entry;
  const p = progressOf(lab);
  const row = el('li', 'site-row');
  row.dataset.lab = lab.id;
  if (lab.preview) return previewRow(entry, row, blueprint);
  if (p.started && p.done < p.total) row.classList.add('is-current');

  const title = el('div', 'site-row-title');
  const link = el('a', undefined, t(lab.nameKey));
  link.href = entry.href;
  title.append(link, el('p', 'site-row-desc', t(lab.descKey)));

  const status =
    p.done === p.total ? t('site.statusDone') : p.started ? t('site.statusInProgress') : t('site.statusNotStarted');
  const state = el('div', 'site-row-state');
  state.append(
    el('span', 'site-row-count', t('site.stages', { n: p.done, total: p.total })),
    el('span', p.done === p.total ? 'site-row-status is-done' : p.started ? 'site-row-status is-current' : 'site-row-status', status),
  );
  if (justReset === lab.id) state.append(el('span', 'site-row-note', t('site.progressReset')));
  else if (p.started) {
    let armed = false;
    const reset = el('button', 'lab-link-button site-row-reset', t('site.resetProgress'));
    reset.type = 'button';
    // Two clicks instead of a browser dialog.
    reset.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        reset.textContent = t('site.resetProgressConfirm');
        return;
      }
      new ProgressStore(lab.id).reset();
      justReset = lab.id;
      render();
    });
    state.append(reset);
  }

  const bar = el('div', 'site-row-progress');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('div');
  fill.style.width = `${(p.done / p.total) * 100}%`;
  bar.append(fill);
  row.append(el('span', 'site-row-n', lab.number), title, state, bar);
  // Highlights this lab's lines in the blueprint.
  const highlight = (on: boolean) => highlightLab(blueprint, on ? lab.id : null);
  row.addEventListener('mouseenter', () => highlight(true));
  row.addEventListener('mouseleave', () => highlight(false));
  row.addEventListener('focusin', () => highlight(true));
  row.addEventListener('focusout', () => highlight(false));
  return row;
}

/** A lab still being built: free mode only, no stage count or progress. */
function previewRow(entry: LabEntry, row: HTMLLIElement, blueprint: HTMLElement): HTMLLIElement {
  const { lab } = entry;
  const title = el('div', 'site-row-title');
  const link = el('a', undefined, t(lab.nameKey));
  link.href = entry.href;
  title.append(link, el('p', 'site-row-desc', t(lab.descKey)));
  const state = el('div', 'site-row-state');
  state.append(el('span', 'site-row-count', t('site.freeOnly')), el('span', 'site-row-status', t('site.statusPreview')));
  row.append(el('span', 'site-row-n', lab.number), title, state);
  row.addEventListener('mouseenter', () => highlightLab(blueprint, lab.id));
  row.addEventListener('mouseleave', () => highlightLab(blueprint, null));
  return row;
}

function shortcuts(group: ProgramGroup): HTMLElement {
  const section = el('section', 'site-shortcuts');
  const head = el('div', 'site-shortcuts-head');
  head.append(el('h2', undefined, t('site.shortcutsTitle')), el('p', 'lab-muted', t('site.shortcutsLead')));
  const list = el('ul', 'site-shortcuts-list');
  for (const sc of group.shortcuts) {
    const li = el('li', sc.keys.length > 2 ? 'is-wide' : undefined);
    const keys = el('span', 'site-shortcut-keys');
    for (const k of sc.keys) {
      const kbd = el('kbd', 'lab-kbd');
      kbd.append(axisText(t(`keys.${k}`)));
      keys.append(kbd);
    }
    const label = el('span', 'site-shortcut-label');
    label.append(axisText(t(sc.labelKey)));
    li.append(label, keys);
    list.append(li);
  }
  section.append(head, list);
  return section;
}

function render(): void {
  const hero = el('section', 'site-hero');
  const blueprint = views();
  const text = el('div', 'site-hero-text');
  text.append(el('h1', 'site-title', t('site.heroTitle')), el('p', 'lab-lead', t('site.tagline')), mainAction());
  hero.append(blueprint, text);

  const labs = el('section', 'site-labs');
  labs.setAttribute('aria-labelledby', 'site-labs-title');
  const h = el('h2', undefined, t('site.labsTitle'));
  h.id = 'site-labs-title';
  labs.append(h);
  for (const group of PROGRAMS) {
    labs.append(el('h3', 'site-program', t(group.nameKey)));
    const list = el('ol', 'site-rows');
    for (const entry of group.labs) list.append(labRow(entry, blueprint));
    labs.append(list);
  }

  const main = el('main', 'site');
  main.append(hero, labs, ...PROGRAMS.map(shortcuts));
  root.replaceChildren(topBar(), main, el('footer', 'lab-footer site-footer', t('site.footer')));
}

render();
