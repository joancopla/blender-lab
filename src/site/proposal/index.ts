/**
 * Home redesign proposal (not part of the build, only served by `vite dev` at
 * /proposta/). Same data as the real index (labs, progress, blueprint,
 * preferences); only the layout and the look change. If it is accepted it
 * replaces src/site/index.ts and DESIGN.md is rewritten to match.
 */
import type { LabDefinition } from '../../core/lab';
import { ProgressStore } from '../../core/stages/progress';
import { t } from '../../core/i18n';
import { KEY_OVERLAY_PREF, type PrefValues, loadPrefs, savePrefs } from '../../core/shell/prefs';
import { renderPrefSwitches } from '../../core/shell/prefs-panel';
import { themeButton } from '../../core/shell/theme';
import { BLENDER_PREFERENCES } from '../../apps/blender/blender-app';
import { axisText } from '../../core/shell/axis-text';
import { type BlueprintView, earnedLineIds, highlightLab, renderBlueprintView } from '../../core/shell/blueprint';
import { STOOL_BLUEPRINT } from '../../labs/blender/blueprint';
import { lab01 } from '../../labs/blender/01-viewport';
import { lab02 } from '../../labs/blender/02-edit-mode';
import { lab03 } from '../../labs/blender/03-modifiers';
import { lab04 } from '../../labs/blender/04-lights';
import { LAB_ILLUSTRATIONS } from './illustrations';
import '../../core/shell/shell.css';
import './proposal.css';

interface LabEntry {
  readonly lab: LabDefinition;
  readonly href: string;
  /** Key ids (keys.<id>) shown on the card: the lab's signature shortcuts. */
  readonly keys: readonly string[];
}

const LABS: readonly LabEntry[] = [
  { lab: lab01, href: '../labs/01-viewport/', keys: ['numpad1', 'numpad7', 'g', 'r', 's'] },
  { lab: lab02, href: '../labs/02-edit-mode/', keys: ['tab', 'e', 'i', 'ctrlR', 'ctrlB'] },
  { lab: lab03, href: '../labs/03-modifiers/', keys: ['ctrlA', 'ctrlR', 'tab'] },
  { lab: lab04, href: '../labs/04-lights/', keys: ['shiftA', 'z', 'g', 'r'] },
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

const ACCENTS = [
  { id: 'amber', labelKey: 'siteProposal.accentAmber' },
  { id: 'teal', labelKey: 'siteProposal.accentTeal' },
  { id: 'orange', labelKey: 'siteProposal.accentOrange' },
] as const;
const ACCENT_KEY = 'blender-lab:proposal-accent';

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
root.className = 'lab-page pp-page';
let justReset: string | null = null;

function topBar(): HTMLElement {
  const bar = el('header', 'pp-top');
  const name = el('a', 'pp-name');
  name.href = './';
  name.append(el('span', 'pp-name-mark'), el('span', undefined, t('site.title')));
  const tools = el('div', 'pp-top-tools');

  const labsLink = el('a', 'pp-top-link', t('site.labsTitle'));
  labsLink.href = '#labs';

  const prefs = el('details', 'pp-prefs');
  const list = el('div', 'pp-prefs-list');
  prefs.append(el('summary', 'pp-top-button', t('prefs.title')), list);
  const defaults: PrefValues = {
    ...Object.fromEntries(BLENDER_PREFERENCES.map((p) => [p.key, p.default])),
    [KEY_OVERLAY_PREF]: true,
  };
  const set = (next: PrefValues) => {
    savePrefs(next);
    renderPrefSwitches(list, PREF_TOGGLES, next, set);
  };
  renderPrefSwitches(list, PREF_TOGGLES, loadPrefs(defaults), set);

  tools.append(labsLink, prefs, themeButton('pp-top-button'));
  bar.append(name, tools);
  return bar;
}

function blueprint(): HTMLElement {
  const earned = earnedLineIds(STOOL_BLUEPRINT, (labId, stageId) => ProgressStore.read(labId).completed.includes(stageId));
  const figure = el('figure', 'pp-blueprint');
  figure.setAttribute('aria-label', t('site.blueprintTitle'));
  const grid = el('div', 'pp-blueprint-views');
  for (const v of ['front', 'side', 'top'] as const) {
    const view = el('div', `pp-view pp-view-${v}`);
    const drawing = el('div', 'pp-view-drawing');
    drawing.dataset.view = v;
    drawing.append(renderBlueprintView(STOOL_BLUEPRINT, v as BlueprintView, earned));
    view.append(drawing, el('span', 'pp-view-label', t(`site.views.${v}`)));
    grid.append(view);
  }
  const note = el('div', 'pp-view pp-blueprint-note');
  note.append(el('span', 'pp-eyebrow', t('siteProposal.blueprintLabel')), el('p', undefined, t('site.blueprintEmpty')));
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
  const a = el('a', 'pp-button pp-button-primary', t(key, { n: entry.lab.number }));
  a.href = entry.href;
  return a;
}

function hero(figure: HTMLElement): HTMLElement {
  const section = el('section', 'pp-hero');
  const text = el('div', 'pp-hero-text');
  const title = el('h1', 'pp-hero-title');
  title.append(el('span', undefined, t('siteProposal.heroLead')), ' ', el('span', 'pp-accent', t('siteProposal.heroAccent')));
  const actions = el('div', 'pp-hero-actions');
  const secondary = el('a', 'pp-button pp-button-ghost', t('siteProposal.seeLabs'));
  secondary.href = '#labs';
  actions.append(mainAction(), secondary);
  text.append(el('p', 'pp-eyebrow pp-eyebrow-dot', t('siteProposal.eyebrow')), title, el('p', 'pp-hero-lead', t('site.tagline')), actions);
  const art = el('div', 'pp-hero-art');
  art.append(figure);
  section.append(text, art);
  return section;
}

function keyChain(keys: readonly string[]): HTMLElement {
  const chain = el('span', 'pp-card-keys');
  keys.forEach((k, i) => {
    if (i > 0) chain.append(el('span', 'pp-card-keys-sep', '·'));
    chain.append(el('span', undefined, t(`keys.${k}`)));
  });
  return chain;
}

function card(entry: LabEntry, figure: HTMLElement): HTMLLIElement {
  const { lab } = entry;
  const p = progressOf(lab);
  const done = !lab.preview && p.done === p.total;
  const current = !lab.preview && p.started && !done;
  const li = el('li', 'pp-card');
  if (current) li.classList.add('is-current');
  if (done) li.classList.add('is-done');

  const art = el('a', 'pp-card-art');
  art.href = entry.href;
  art.tabIndex = -1;
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = LAB_ILLUSTRATIONS[lab.id] ?? '';
  art.append(keyChain(entry.keys));

  const body = el('div', 'pp-card-body');
  const meta = el('div', 'pp-card-meta');
  const count = lab.preview ? t('site.freeOnly') : t('siteProposal.cardStages', { total: p.total });
  meta.append(el('span', 'pp-card-n', lab.number), el('span', 'pp-card-count', count));
  const status = lab.preview
    ? t('site.statusPreview')
    : done
      ? t('site.statusDone')
      : current
        ? t('site.statusInProgress')
        : t('site.statusNotStarted');
  meta.append(el('span', `pp-status${done ? ' is-done' : current ? ' is-current' : ''}`, status));

  const title = el('h3', 'pp-card-title');
  const link = el('a', undefined, t(lab.nameKey));
  link.href = entry.href;
  title.append(link);

  const foot = el('div', 'pp-card-foot');
  if (!lab.preview) {
    const bar = el('div', 'pp-progress');
    bar.setAttribute('aria-hidden', 'true');
    const fill = el('div');
    fill.style.width = `${(p.done / p.total) * 100}%`;
    bar.append(fill);
    const row = el('div', 'pp-card-foot-row');
    row.append(el('span', 'pp-card-progress-text', t('site.stages', { n: p.done, total: p.total })));
    if (justReset === lab.id) row.append(el('span', 'pp-card-note', t('site.progressReset')));
    else if (p.started) row.append(resetButton(lab));
    const go = el('a', 'pp-card-go', t(done ? 'siteProposal.cardReview' : current ? 'siteProposal.cardContinue' : 'siteProposal.cardStart'));
    go.href = entry.href;
    go.setAttribute('aria-label', `${go.textContent}: ${t(lab.nameKey)}`);
    row.append(go);
    foot.append(bar, row);
  } else {
    const row = el('div', 'pp-card-foot-row');
    const go = el('a', 'pp-card-go', t('siteProposal.cardOpen'));
    go.href = entry.href;
    row.append(go);
    foot.append(row);
  }

  body.append(meta, title, el('p', 'pp-card-desc', t(lab.descKey)), foot);
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
  const reset = el('button', 'pp-card-reset', t('site.resetProgress'));
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
  const section = el('section', 'pp-program');
  section.id = 'labs';
  section.setAttribute('aria-labelledby', 'pp-program-title');
  const head = el('div', 'pp-program-head');
  const titles = el('div');
  const h = el('h2', 'pp-program-title', t('app.name'));
  h.id = 'pp-program-title';
  titles.append(el('p', 'pp-eyebrow', t('siteProposal.programEyebrow', { n: LABS.length })), h);
  head.append(titles, el('p', 'pp-program-lead', t('siteProposal.programLead')));
  const list = el('ol', 'pp-cards');
  for (const entry of LABS) list.append(card(entry, figure));
  section.append(head, list);
  return section;
}

function shortcuts(): HTMLElement {
  const section = el('section', 'pp-shortcuts');
  const head = el('div', 'pp-shortcuts-head');
  head.append(el('h2', undefined, t('site.shortcutsTitle')), el('p', undefined, t('site.shortcutsLead')));
  const list = el('ul', 'pp-shortcuts-list');
  for (const sc of SHORTCUTS) {
    const li = el('li');
    const keys = el('span', 'pp-shortcut-keys');
    for (const k of sc.keys) {
      const kbd = el('kbd', 'lab-kbd');
      kbd.append(axisText(t(`keys.${k}`)));
      keys.append(kbd);
    }
    const label = el('span', 'pp-shortcut-label');
    label.append(axisText(t(sc.labelKey)));
    li.append(keys, label);
    list.append(li);
  }
  section.append(head, list);
  return section;
}

/** Review-only control: switches the accent to compare options side by side. */
function proposalPanel(): HTMLElement {
  const panel = el('aside', 'pp-review');
  panel.setAttribute('aria-label', t('siteProposal.panelTitle'));
  const head = el('div', 'pp-review-head');
  const hide = el('button', 'pp-review-hide', t('siteProposal.panelHide'));
  hide.type = 'button';
  hide.addEventListener('click', () => (panel.hidden = true));
  head.append(el('strong', undefined, t('siteProposal.panelTitle')), hide);
  const group = el('div', 'pp-review-accents');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t('siteProposal.panelAccent'));
  const html = document.documentElement;
  const buttons = ACCENTS.map((a) => {
    const b = el('button', 'pp-review-accent');
    b.type = 'button';
    b.dataset.accent = a.id;
    b.append(el('span', 'pp-review-swatch'), el('span', undefined, t(a.labelKey)));
    b.addEventListener('click', () => {
      html.dataset.accent = a.id;
      try {
        localStorage.setItem(ACCENT_KEY, a.id);
      } catch {
        // Private mode: the choice just isn't remembered.
      }
      sync();
    });
    return b;
  });
  const sync = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === html.dataset.accent)));
  sync();
  group.append(...buttons);
  const current = el('a', 'pp-review-link', t('siteProposal.panelCurrent'));
  current.href = '../';
  panel.append(head, el('span', 'pp-review-label', t('siteProposal.panelAccent')), group, current);
  return panel;
}

let panel: HTMLElement | null = null;

function render(): void {
  const figure = blueprint();
  const main = el('main', 'pp-main');
  main.append(hero(figure), program(figure), shortcuts());
  panel ??= proposalPanel();
  root.replaceChildren(topBar(), main, el('footer', 'pp-footer', t('site.footer')), panel);
}

render();
