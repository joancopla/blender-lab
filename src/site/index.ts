/**
 * Collection index (DESIGN.md, "Pàgina índex"): top bar, split hero with the
 * main action and the three-view blueprint, and each program's labs as
 * illustrated cards.
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
import { LAB_ILLUSTRATIONS } from './illustrations';
import '../core/shell/shell.css';
import './site.css';

interface LabEntry {
  readonly lab: LabDefinition;
  readonly href: string;
  /** Key ids (keys.<id>) shown on the card: the lab's signature shortcuts. */
  readonly keys: readonly string[];
}

const LABS: readonly LabEntry[] = [
  { lab: lab01, href: 'labs/01-viewport/', keys: ['numpad1', 'numpad7', 'g', 'r', 's'] },
  { lab: lab02, href: 'labs/02-edit-mode/', keys: ['tab', 'e', 'i', 'ctrlR', 'ctrlB'] },
  { lab: lab03, href: 'labs/03-modifiers/', keys: ['ctrlA', 'ctrlR', 'tab'] },
  { lab: lab04, href: 'labs/04-lights/', keys: ['shiftA', 'z', 'g', 'r'] },
];

const SHORTCUTS: readonly { labelKey: string; keys: readonly string[] }[] = [
  { labelKey: 'shortcuts.grab', keys: ['g'] },
  { labelKey: 'shortcuts.rotate', keys: ['r'] },
  { labelKey: 'shortcuts.scale', keys: ['s'] },
  { labelKey: 'shortcuts.axis', keys: ['g', 'x'] },
  { labelKey: 'shortcuts.views', keys: ['numpad1', 'numpad3', 'numpad7'] },
  { labelKey: 'shortcuts.editMode', keys: ['tab'] },
  { labelKey: 'shortcuts.extrude', keys: ['e'] },
  { labelKey: 'shortcuts.undo', keys: ['ctrlZ'] },
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
  const bar = el('header', 'site-top');
  const name = el('a', 'site-name');
  name.href = './';
  name.append(el('span', 'site-name-mark'), el('span', undefined, t('site.title')));
  const tools = el('div', 'site-top-tools');

  const labsLink = el('a', 'site-top-link', t('site.labsTitle'));
  labsLink.href = '#labs';

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

  tools.append(labsLink, prefs, themeButton('site-top-button'));
  bar.append(name, tools);
  return bar;
}

function blueprint(): HTMLElement {
  const earned = earnedLineIds(STOOL_BLUEPRINT, (labId, stageId) => ProgressStore.read(labId).completed.includes(stageId));
  const figure = el('figure', 'site-blueprint');
  figure.setAttribute('aria-label', t('site.blueprintTitle'));
  const grid = el('div', 'site-blueprint-views');
  for (const v of ['front', 'side', 'top'] as const) {
    const view = el('div', `site-view site-view-${v}`);
    const drawing = el('div', 'site-view-drawing');
    drawing.dataset.view = v;
    drawing.append(renderBlueprintView(STOOL_BLUEPRINT, v as BlueprintView, earned));
    view.append(drawing, el('span', 'site-view-label', t(`site.views.${v}`)));
    grid.append(view);
  }
  const note = el('div', 'site-view site-blueprint-note');
  note.append(el('span', 'site-eyebrow', t('site.blueprintLabel')), el('p', undefined, t('site.blueprintEmpty')));
  grid.append(note);
  figure.append(grid);
  return figure;
}

function mainAction(): HTMLAnchorElement {
  // Labs still being built are never the main action.
  const all = LABS.filter((e) => !e.lab.preview);
  const next = all.find((e) => {
    const p = progressOf(e.lab);
    return p.done < p.total;
  });
  const entry = next ?? all[0]!;
  const p = progressOf(entry.lab);
  const key = !next ? 'site.review' : p.started ? 'site.continue' : 'site.start';
  const a = el('a', 'site-button site-button-primary', t(key, { n: entry.lab.number }));
  a.href = entry.href;
  return a;
}

function hero(figure: HTMLElement): HTMLElement {
  const section = el('section', 'site-hero');
  const text = el('div', 'site-hero-text');
  const title = el('h1', 'site-hero-title');
  title.append(el('span', undefined, t('site.heroLead')), ' ', el('span', 'site-accent', t('site.heroAccent')));
  const actions = el('div', 'site-hero-actions');
  const secondary = el('a', 'site-button site-button-ghost', t('site.seeLabs'));
  secondary.href = '#labs';
  actions.append(mainAction(), secondary);
  text.append(el('p', 'site-eyebrow site-eyebrow-dot', t('site.eyebrow')), title, el('p', 'site-hero-lead', t('site.tagline')), actions);
  const art = el('div', 'site-hero-art');
  art.append(figure);
  section.append(text, art);
  return section;
}

function keyChain(keys: readonly string[]): HTMLElement {
  const chain = el('span', 'site-card-keys');
  keys.forEach((k, i) => {
    if (i > 0) chain.append(el('span', 'site-card-keys-sep', '·'));
    chain.append(el('span', undefined, t(`keys.${k}`)));
  });
  return chain;
}

function card(entry: LabEntry, figure: HTMLElement): HTMLLIElement {
  const { lab } = entry;
  const p = progressOf(lab);
  const done = !lab.preview && p.done === p.total;
  const current = !lab.preview && p.started && !done;
  const li = el('li', 'site-card');
  if (current) li.classList.add('is-current');
  if (done) li.classList.add('is-done');

  const art = el('a', 'site-card-art');
  art.href = entry.href;
  art.tabIndex = -1;
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = LAB_ILLUSTRATIONS[lab.id] ?? '';
  art.append(keyChain(entry.keys));

  const body = el('div', 'site-card-body');
  const meta = el('div', 'site-card-meta');
  const count = lab.preview ? t('site.freeOnly') : t('site.cardStages', { total: p.total });
  meta.append(el('span', 'site-card-n', lab.number), el('span', 'site-card-count', count));
  const status = lab.preview
    ? t('site.statusPreview')
    : done
      ? t('site.statusDone')
      : current
        ? t('site.statusInProgress')
        : t('site.statusNotStarted');
  meta.append(el('span', `site-status${done ? ' is-done' : current ? ' is-current' : ''}`, status));

  const title = el('h3', 'site-card-title');
  const link = el('a', undefined, t(lab.nameKey));
  link.href = entry.href;
  title.append(link);

  const foot = el('div', 'site-card-foot');
  if (!lab.preview) {
    const bar = el('div', 'site-progress');
    bar.setAttribute('aria-hidden', 'true');
    const fill = el('div');
    fill.style.width = `${(p.done / p.total) * 100}%`;
    bar.append(fill);
    const row = el('div', 'site-card-foot-row');
    row.append(el('span', 'site-card-progress-text', t('site.stages', { n: p.done, total: p.total })));
    if (justReset === lab.id) row.append(el('span', 'site-card-note', t('site.progressReset')));
    else if (p.started) row.append(resetButton(lab));
    const go = el('a', 'site-card-go', t(done ? 'site.cardReview' : current ? 'site.cardContinue' : 'site.cardStart'));
    go.href = entry.href;
    go.setAttribute('aria-label', `${go.textContent}: ${t(lab.nameKey)}`);
    row.append(go);
    foot.append(bar, row);
  } else {
    const row = el('div', 'site-card-foot-row');
    const go = el('a', 'site-card-go', t('site.cardOpen'));
    go.href = entry.href;
    row.append(go);
    foot.append(row);
  }

  body.append(meta, title, el('p', 'site-card-desc', t(lab.descKey)), foot);
  li.append(art, body);

  // Highlights this lab's lines in the blueprint.
  const highlight = (on: boolean) => highlightLab(figure, on ? lab.id : null);
  li.addEventListener('mouseenter', () => highlight(true));
  li.addEventListener('mouseleave', () => highlight(false));
  li.addEventListener('focusin', () => highlight(true));
  li.addEventListener('focusout', () => highlight(false));
  return li;
}

function resetButton(lab: LabDefinition): HTMLButtonElement {
  let armed = false;
  const reset = el('button', 'site-card-reset', t('site.resetProgress'));
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
  return reset;
}

function program(figure: HTMLElement): HTMLElement {
  const section = el('section', 'site-program');
  section.id = 'labs';
  section.setAttribute('aria-labelledby', 'site-program-title');
  const head = el('div', 'site-program-head');
  const titles = el('div');
  const h = el('h2', 'site-program-title', t('app.name'));
  h.id = 'site-program-title';
  titles.append(el('p', 'site-eyebrow', t('site.programEyebrow', { n: LABS.length })), h);
  head.append(titles, el('p', 'site-program-lead', t('site.programLead')));
  const list = el('ol', 'site-cards');
  for (const entry of LABS) list.append(card(entry, figure));
  section.append(head, list);
  return section;
}

function shortcuts(): HTMLElement {
  const section = el('section', 'site-shortcuts');
  const head = el('div', 'site-shortcuts-head');
  head.append(el('h2', undefined, t('site.shortcutsTitle')), el('p', undefined, t('site.shortcutsLead')));
  const list = el('ul', 'site-shortcuts-list');
  for (const sc of SHORTCUTS) {
    const li = el('li');
    const keys = el('span', 'site-shortcut-keys');
    for (const k of sc.keys) {
      const kbd = el('kbd', 'lab-kbd');
      kbd.append(axisText(t(`keys.${k}`)));
      keys.append(kbd);
    }
    const label = el('span', 'site-shortcut-label');
    label.append(axisText(t(sc.labelKey)));
    li.append(keys, label);
    list.append(li);
  }
  section.append(head, list);
  return section;
}


function render(): void {
  const figure = blueprint();
  const main = el('main', 'site-main');
  main.append(hero(figure), program(figure), shortcuts());
  root.replaceChildren(topBar(), main, el('footer', 'site-footer', t('site.footer')));
}

render();
