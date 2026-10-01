/**
 * Lab page, shared by every lab and every program (DESIGN.md, "Pàgina de lab"):
 * top bar and split introduction (text and the lab's illustration), key
 * controls, then the lab itself (title block, replicated program and a foldable
 * stage panel on the right), the "In the real program" block and the next lab.
 * It only talks to the program through the app contract.
 */
import type { LabDefinition } from '../lab';
import { KEY_OVERLAY_PREF, type PrefValues, loadPrefs, savePrefs } from './prefs';
import { ProgressStore } from '../stages/progress';
import { StageRunner } from '../stages/runner';
import { t } from '../i18n';
import { showDeviceWarningIfNeeded } from './device-warning';
import { KeyOverlay } from './key-overlay';
import { renderPrefSwitches } from './prefs-panel';
import { StagePanel } from './stage-panel';
import { themeButton } from './theme';
import { topBar } from './top-bar';
import { labArt } from './lab-art';
import { progressOf } from './lab-progress';
import { BLUEPRINT_VIEWS, type IsCompleted, earnedLineIds, newlyEarned, renderBlueprintView, updateBlueprint } from './blueprint';
import './shell.css';

const PANEL_KEY = 'blender-lab:panel';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function loadFolded(): boolean {
  try {
    return window.localStorage.getItem(PANEL_KEY) === 'folded';
  } catch {
    return false;
  }
}

function saveFolded(folded: boolean): void {
  try {
    window.localStorage.setItem(PANEL_KEY, folded ? 'folded' : 'open');
  } catch {
    // Not saved: it still applies for this visit.
  }
}

/** Where the page sits in the site; given by the site, never guessed by the core. */
export interface LabPageOptions {
  /** i18n key of the program name, shown next to the lab number. */
  readonly programKey?: string;
  /** Link to the index (default: two folders up). */
  readonly indexHref?: string;
  /** The lab after this one, for the closing card. */
  readonly next?: { readonly lab: LabDefinition; readonly href: string };
  /** i18n key of the "In the real program" title (default: page.realTitle). */
  readonly realTitleKey?: string;
  /** i18n keys of the small-screen notice (default: mobile.title / mobile.text). */
  readonly deviceWarning?: { readonly titleKey: string; readonly textKey: string };
}

/** "Label: keys" texts (controls, real program) split at the given colon. */
function splitAt(text: string, last: boolean): [string, string] | null {
  const i = last ? text.lastIndexOf(': ') : text.indexOf(': ');
  return i > 0 ? [text.slice(0, i), text.slice(i + 2)] : null;
}

function progressBar(): { bar: HTMLElement; set(done: number, total: number): void } {
  const bar = el('div', 'shell-progress');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('div');
  bar.append(fill);
  return { bar, set: (done, total) => (fill.style.width = `${total > 0 ? (done / total) * 100 : 0}%`) };
}

export function mountLabPage<State, Setup, Decorations>(
  lab: LabDefinition<State, Setup, Decorations>,
  options: LabPageOptions = {},
): void {
  const P = lab.page.prefix;
  const labLabel = t('page.labNumber', { n: lab.number });
  const home = options.indexHref ?? '../../';
  document.title = `${labLabel} · ${t(lab.nameKey)} — ${t('site.title')}`;
  const page = document.getElementById('app')!;
  page.className = 'lab-page';
  const total = lab.stages.stages.length;
  const saved = progressOf(lab);

  // --- Top bar and introduction ------------------------------------------------------
  const allLabs = el('a', 'shell-top-link', t('page.allLabs'));
  allLabs.href = `${home}#labs`;
  const top = topBar(home, [allLabs, themeButton('shell-top-button')]);

  const intro = el('header', lab.illustration ? 'lab-hero' : 'lab-hero is-plain');
  const heroText = el('div', 'lab-hero-text');
  const eyebrow = options.programKey ? `${labLabel} · ${t(options.programKey)}` : labLabel;
  const heroMeta = el('div', 'lab-hero-meta');
  const heroBar = progressBar();
  const heroDone = el('span', 'lab-hero-done');
  if (total > 0) heroMeta.append(el('span', undefined, t('page.stagesCount', { total })), heroBar.bar, heroDone);
  const start = el('a', 'shell-button shell-button-primary', t(saved.started ? 'page.continue' : 'page.start'));
  start.href = '#lab';
  const toControls = el('a', 'shell-button shell-button-ghost', t('page.controlsTitle'));
  toControls.href = '#lab-controls';
  const actions = el('div', 'lab-hero-actions');
  actions.append(start, toControls);
  heroText.append(
    el('p', 'shell-eyebrow shell-eyebrow-dot', eyebrow),
    el('h1', 'lab-title', t(lab.nameKey)),
    el('p', 'lab-hero-lead', t(`${P}.intro.lead`)),
    ...(lab.preview ? [el('p', 'lab-note', t('page.previewNotice'))] : []),
    ...(total > 0 ? [heroMeta] : []),
    actions,
  );
  intro.append(heroText);
  if (lab.illustration) {
    const art = el('div', 'lab-hero-art');
    art.append(labArt(lab, 'div', 'lab-hero-art-panel'));
    intro.append(art);
  }

  const controlsSection = el('section', 'lab-controls-section');
  controlsSection.id = 'lab-controls';
  const controls = el('ul', 'lab-controls');
  for (const k of lab.page.controls) {
    const text = t(`${P}.intro.controls.${k}`);
    const parts = splitAt(text, true);
    const li = el('li');
    if (parts) li.append(el('span', 'lab-control-label', parts[0]), el('span', 'lab-control-keys', parts[1]));
    else li.append(el('span', 'lab-control-label', text));
    controls.append(li);
  }
  controlsSection.append(el('h2', 'lab-section-title', t('page.controlsTitle')), controls);

  // --- The lab: title block, replica and stage panel -----------------------------
  const shell = el('section', 'lab-shell');
  shell.id = 'lab';
  shell.setAttribute('aria-label', t(lab.nameKey));

  const titleBlock = el('header', 'lab-titleblock');
  const stageCell = el('span', 'lab-tb-cell lab-tb-stage');
  const stageLabel = el('span');
  const tbBar = progressBar();
  stageCell.append(stageLabel, ...(total > 0 ? [tbBar.bar] : []));
  const index = el('a', 'lab-tb-cell lab-tb-link', t('page.index'));
  index.href = home;
  titleBlock.append(
    el('span', 'lab-tb-cell lab-tb-number', lab.number),
    el('span', 'lab-tb-cell lab-tb-title', t(lab.nameKey)),
    stageCell,
    themeButton('lab-tb-cell lab-tb-button'),
    index,
  );

  const body = el('div', 'lab-body');
  const replica = el('div', 'lab-replica');
  const panel = el('aside', 'lab-panel');
  panel.id = 'lab-panel';
  panel.setAttribute('aria-label', t('ui.panel'));
  body.append(replica, panel);
  shell.append(titleBlock, body);

  const panelHead = el('div', 'lab-panel-head');
  const fold = el('button', 'lab-fold', t('ui.fold'));
  fold.type = 'button';
  fold.setAttribute('aria-controls', panel.id);
  const panelCount = el('span', 'lab-panel-count');
  const panelTitle = el('div', 'lab-panel-title');
  panelTitle.append(el('h2', undefined, t('ui.stagesNav')), ...(total > 0 ? [panelCount] : []));
  panelHead.append(panelTitle, fold);
  const panelScroll = el('div', 'lab-panel-scroll');
  const tab = el('button', 'lab-panel-tab');
  tab.type = 'button';
  tab.setAttribute('aria-controls', panel.id);
  panel.append(panelHead, panelScroll, tab);

  function setFolded(folded: boolean, focus: boolean): void {
    body.classList.toggle('is-folded', folded);
    fold.setAttribute('aria-expanded', String(!folded));
    tab.setAttribute('aria-expanded', String(!folded));
    panelHead.hidden = folded;
    panelScroll.hidden = folded;
    tab.hidden = !folded;
    saveFolded(folded);
    if (focus) (folded ? tab : fold).focus();
  }
  fold.addEventListener('click', () => setFolded(true, true));
  tab.addEventListener('click', () => setFolded(false, true));

  // --- In the real program -------------------------------------------------------
  const real = el('section', 'lab-real');
  const realHead = el('div', 'lab-real-head');
  const realTitles = el('div');
  realTitles.append(el('p', 'shell-eyebrow', t('page.realEyebrow')), el('h2', 'lab-section-title', t(options.realTitleKey ?? 'page.realTitle')));
  realHead.append(realTitles, el('p', 'lab-real-lead', t(`${P}.real.lead`)));
  const realList = el('ul', 'lab-real-list');
  for (const k of lab.page.real) {
    const text = t(`${P}.real.${k}`);
    const parts = splitAt(text, false);
    const li = el('li');
    if (parts) li.append(el('strong', undefined, parts[0]), el('span', undefined, parts[1]));
    else li.append(el('span', undefined, text));
    realList.append(li);
  }
  real.append(realHead, realList);

  const closing: HTMLElement[] = [real];
  if (options.next) {
    const { lab: nextLab, href } = options.next;
    const section = el('section', 'lab-next');
    const card = el('a', 'lab-next-card');
    card.href = href;
    const body = el('div', 'lab-next-body');
    const meta = el('p', 'lab-next-meta');
    meta.append(el('span', 'lab-next-n', nextLab.number));
    if (!nextLab.preview) meta.append(el('span', undefined, t('page.stagesCount', { total: nextLab.stages.stages.length })));
    body.append(
      meta,
      el('h3', 'lab-next-title', t(nextLab.nameKey)),
      el('p', 'lab-next-desc', t(nextLab.descKey)),
      el('span', 'lab-next-go', t('site.start', { n: nextLab.number })),
    );
    if (nextLab.illustration) card.append(labArt(nextLab, 'div', 'lab-next-art'));
    card.append(body);
    section.append(el('p', 'shell-eyebrow', t('page.nextEyebrow')), card);
    closing.push(section);
  }

  page.append(top, intro, controlsSection, shell, ...closing, el('footer', 'lab-footer', t('site.footer')));

  // --- The program ---------------------------------------------------------------
  const app = lab.createApp();
  const defaults: PrefValues = {
    ...Object.fromEntries(app.preferences.map((p) => [p.key, p.default])),
    [KEY_OVERLAY_PREF]: true,
  };
  let prefs = loadPrefs(defaults);

  const toast = el('div', 'lab-toast');
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  replica.append(toast);
  const dismissed = new Set<string>();

  /** The program asks to suggest a preference (e.g. Emulate 3 Button Mouse). */
  function suggest(key: string): void {
    const def = app.preferences.find((p) => p.key === key);
    if (!def?.suggestKey || dismissed.has(key) || prefs[key] || !toast.hidden) return;
    const close = () => {
      toast.hidden = true;
      dismissed.add(key);
    };
    const yes = el('button', 'lab-button lab-button-primary', t('prefs.suggestYes'));
    yes.type = 'button';
    yes.addEventListener('click', () => {
      setPrefs({ ...prefs, [key]: true });
      close();
    });
    const no = el('button', 'lab-button', t('prefs.suggestNo'));
    no.type = 'button';
    no.addEventListener('click', close);
    const actions = el('div', 'lab-actions');
    actions.append(yes, no);
    toast.replaceChildren(el('p', undefined, t(def.suggestKey)), actions);
    toast.hidden = false;
  }

  // The program gets its own element: its root must not share an element with
  // shell classes, or the result would depend on stylesheet order (it differs
  // between dev and build).
  const host = el('div', 'lab-replica-host');
  replica.prepend(host);
  app.mount(host, { preferences: () => prefs, suggestPreference: suggest });
  const keyOverlay = new KeyOverlay(app.overlayHost(), app.inputHost());
  keyOverlay.setEnabled(prefs[KEY_OVERLAY_PREF] === true);

  const prefsSection = el('details', 'lab-prefs');
  const prefsList = el('div');
  prefsSection.append(el('summary', undefined, t('prefs.title')), prefsList);
  const toggles = [
    ...app.preferences,
    { key: KEY_OVERLAY_PREF, labelKey: 'prefs.keyOverlay', helpKey: 'prefs.keyOverlayHelp' },
  ];
  function setPrefs(next: PrefValues): void {
    prefs = next;
    savePrefs(prefs);
    renderPrefSwitches(prefsList, toggles, prefs, setPrefs);
    keyOverlay.setEnabled(prefs[KEY_OVERLAY_PREF] === true);
  }
  renderPrefSwitches(prefsList, toggles, prefs, setPrefs);

  // --- Stages --------------------------------------------------------------------
  const progress = new ProgressStore(lab.id);
  const runner = new StageRunner(lab.stages, { app, progress, now: () => performance.now() });
  app.onChange(() => runner.notifyActivity());
  runner.onChange(() => app.decorate(runner.status.result.decorations));

  const updateStageLabels = () => {
    const i = runner.status.index;
    const label = i === -1 ? t('ui.free') : t('ui.stageOf', { n: i + 1, total });
    stageLabel.textContent = label;
    tab.textContent = i === -1 ? t('ui.free') : t('ui.stageShort', { n: i + 1 });
    tab.title = `${t('ui.unfold')} · ${label}`;
    const done = lab.stages.stages.filter((st) => progress.isCompleted(st.id)).length;
    tbBar.set(done, total);
    heroBar.set(done, total);
    heroDone.textContent = t('page.stagesDone', { n: done, total });
    panelCount.textContent = t('ui.progress', { n: done, total });
  };
  runner.onChange(updateStageLabels);

  const stageBox = el('div');
  const tools = el('section', 'lab-tools');
  panelScroll.append(stageBox, tools, prefsSection);

  // Blueprint miniature: the line earned with a stage draws itself next to the seal.
  const blueprint = lab.blueprint;
  if (blueprint) {
    const others = new Map<string, readonly string[]>();
    const isCompleted: IsCompleted = (labId, stageId) => {
      if (labId === lab.id) return progress.isCompleted(stageId);
      if (!others.has(labId)) others.set(labId, ProgressStore.read(labId).completed);
      return others.get(labId)!.includes(stageId);
    };
    let earned = earnedLineIds(blueprint, isCompleted);
    const miniCard = el('div', 'lab-blueprint-card');
    const mini = el('figure', 'lab-blueprint');
    mini.setAttribute('aria-label', t('site.blueprintTitle'));
    miniCard.append(el('span', 'shell-eyebrow', t('site.blueprintLabel')), mini);
    // Only the views the blueprint draws (a lighting plot has just the front view).
    const views = BLUEPRINT_VIEWS.filter((v) => blueprint.lines.some((l) => l.view === v));
    if (views.length === 1) mini.classList.add('is-single');
    for (const v of views) {
      const cell = el('div', 'lab-blueprint-view');
      cell.title = t(`site.views.${v}`);
      cell.append(renderBlueprintView(blueprint, v, earned));
      mini.append(cell);
    }
    panelScroll.prepend(miniCard);
    runner.onChange(() => {
      const next = earnedLineIds(blueprint, isCompleted);
      const fresh = newlyEarned(earned, next);
      if (fresh.length === 0 && next.size === earned.size) return;
      earned = next;
      updateBlueprint(mini, earned, fresh);
    });
  }
  const stagePanel = new StagePanel(stageBox, runner, (id) => progress.isCompleted(id));
  keyOverlay.onPress((text) => stagePanel.pressed(text));
  if (app.renderLabTools) app.renderLabTools(tools);
  else tools.remove();

  const current = progress.progress.current;
  runner.load(current >= -1 && current < total ? current : 0);
  updateStageLabels();
  setFolded(loadFolded(), false);
  window.setInterval(() => runner.tick(), 5000);

  showDeviceWarningIfNeeded(options.deviceWarning);
}
