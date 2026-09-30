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
import { labArt } from '../core/shell/lab-art';
import { progressOf } from '../core/shell/lab-progress';
import { topBar } from '../core/shell/top-bar';
import { type CatalogEntry, PROGRAMS, type ProgramGroup } from './catalog';
import '../core/shell/shell.css';
import './site.css';

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

const root = document.getElementById('site')!;
root.className = 'lab-page site-page';
let justReset: string | null = null;

function siteTopBar(): HTMLElement {
  const labsLink = el('a', 'shell-top-link', t('site.labsTitle'));
  labsLink.href = '#labs';

  const prefs = el('details', 'site-prefs');
  const list = el('div', 'site-prefs-list');
  prefs.append(el('summary', 'shell-top-button', t('prefs.title')), list);
  const defaults: PrefValues = {
    ...Object.fromEntries(BLENDER_PREFERENCES.map((p) => [p.key, p.default])),
    [KEY_OVERLAY_PREF]: true,
  };
  const set = (next: PrefValues) => {
    savePrefs(next);
    renderPrefSwitches(list, PREF_TOGGLES, next, set);
  };
  renderPrefSwitches(list, PREF_TOGGLES, loadPrefs(defaults), set);

  return topBar('./', [labsLink, prefs, themeButton('shell-top-button')]);
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
  note.append(el('span', 'shell-eyebrow', t('site.blueprintLabel')), el('p', undefined, t('site.blueprintEmpty')));
  grid.append(note);
  figure.append(grid);
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
  const a = el('a', 'shell-button shell-button-primary', t(key, { n: entry.lab.number }));
  a.href = entry.path;
  return a;
}

function hero(figure: HTMLElement): HTMLElement {
  const section = el('section', 'site-hero');
  const text = el('div', 'site-hero-text');
  const title = el('h1', 'site-hero-title');
  title.append(el('span', undefined, t('site.heroLead')), ' ', el('span', 'site-accent', t('site.heroAccent')));
  const actions = el('div', 'site-hero-actions');
  const secondary = el('a', 'shell-button shell-button-ghost', t('site.seeLabs'));
  secondary.href = '#labs';
  actions.append(mainAction(), secondary);
  text.append(el('p', 'shell-eyebrow shell-eyebrow-dot', t('site.eyebrow')), title, el('p', 'site-hero-lead', t('site.tagline')), actions);
  const art = el('div', 'site-hero-art');
  art.append(figure);
  section.append(text, art);
  return section;
}

function card(entry: CatalogEntry, figure: HTMLElement): HTMLLIElement {
  const { lab } = entry;
  const p = progressOf(lab);
  const done = !lab.preview && p.done === p.total;
  const current = !lab.preview && p.started && !done;
  const li = el('li', 'site-card');
  if (current) li.classList.add('is-current');
  if (done) li.classList.add('is-done');

  const art = labArt(lab, 'a', 'site-card-art');
  art.href = entry.path;
  art.tabIndex = -1;

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
  link.href = entry.path;
  title.append(link);

  const foot = el('div', 'site-card-foot');
  if (!lab.preview) {
    const bar = el('div', 'shell-progress');
    bar.setAttribute('aria-hidden', 'true');
    const fill = el('div');
    fill.style.width = `${(p.done / p.total) * 100}%`;
    bar.append(fill);
    const row = el('div', 'site-card-foot-row');
    row.append(el('span', 'site-card-progress-text', t('site.stages', { n: p.done, total: p.total })));
    if (justReset === lab.id) row.append(el('span', 'site-card-note', t('site.progressReset')));
    else if (p.started) row.append(resetButton(lab));
    const go = el('a', 'site-card-go', t(done ? 'site.cardReview' : current ? 'site.cardContinue' : 'site.cardStart'));
    go.href = entry.path;
    go.setAttribute('aria-label', `${go.textContent}: ${t(lab.nameKey)}`);
    row.append(go);
    foot.append(bar, row);
  } else {
    const row = el('div', 'site-card-foot-row');
    const go = el('a', 'site-card-go', t('site.cardOpen'));
    go.href = entry.path;
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

function program(group: ProgramGroup, figure: HTMLElement): HTMLElement {
  const section = el('section', 'site-program');
  // The first program is the target of the "Labs" links.
  if (group === PROGRAMS[0]) section.id = 'labs';
  const titleId = `site-program-${group.nameKey}`;
  section.setAttribute('aria-labelledby', titleId);
  const head = el('div', 'site-program-head');
  const titles = el('div');
  const h = el('h2', 'site-program-title', t(group.nameKey));
  h.id = titleId;
  titles.append(el('p', 'shell-eyebrow', t('site.programEyebrow', { n: group.labs.length })), h);
  head.append(titles, el('p', 'site-program-lead', t('site.programLead')));
  const list = el('ol', 'site-cards');
  for (const entry of group.labs) list.append(card(entry, figure));
  section.append(head, list);
  return section;
}

function shortcuts(group: ProgramGroup): HTMLElement {
  const section = el('section', 'site-shortcuts');
  const head = el('div', 'site-shortcuts-head');
  head.append(el('h2', undefined, t('site.shortcutsTitle')), el('p', undefined, t('site.shortcutsLead')));
  const list = el('ul', 'site-shortcuts-list');
  for (const sc of group.shortcuts) {
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
  main.append(hero(figure), ...PROGRAMS.flatMap((g) => [program(g, figure), shortcuts(g)]));
  root.replaceChildren(siteTopBar(), main, el('footer', 'site-footer', t('site.footer')));
}

render();
