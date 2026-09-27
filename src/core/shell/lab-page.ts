/**
 * Lab page, shared by every lab and every program (DESIGN.md, "Pàgina de lab"):
 * short introduction, then the lab itself (title block, replicated program and
 * a foldable stage panel on the right), then the "In the real program" block.
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

export function mountLabPage<State, Setup, Decorations>(lab: LabDefinition<State, Setup, Decorations>): void {
  const P = lab.page.prefix;
  const labLabel = t('page.labNumber', { n: lab.number });
  document.title = `${labLabel} · ${t(lab.nameKey)} — ${t('site.title')}`;
  const page = document.getElementById('app')!;
  page.className = 'lab-page';

  // --- Introduction --------------------------------------------------------------
  const intro = el('header', 'lab-intro');
  const back = el('a', 'lab-back', t('ui.backToIndex'));
  back.href = '../../';
  const controls = el('ul', 'lab-controls');
  for (const k of lab.page.controls) controls.append(el('li', undefined, t(`${P}.intro.controls.${k}`)));
  const start = el('a', 'lab-button lab-button-primary', t('page.start'));
  start.href = '#lab';
  intro.append(
    back,
    el('p', 'lab-eyebrow', labLabel),
    el('h1', 'lab-title', t(lab.nameKey)),
    el('p', 'lab-lead', t(`${P}.intro.lead`)),
    el('h2', undefined, t('page.controlsTitle')),
    controls,
    start,
  );

  // --- The lab: title block, replica and stage panel -----------------------------
  const shell = el('section', 'lab-shell');
  shell.id = 'lab';
  shell.setAttribute('aria-label', t(lab.nameKey));

  const titleBlock = el('header', 'lab-titleblock');
  const stageCell = el('span', 'lab-tb-cell lab-tb-stage');
  const index = el('a', 'lab-tb-cell lab-tb-link', t('page.index'));
  index.href = '../../';
  titleBlock.append(
    el('span', 'lab-tb-cell lab-tb-number', labLabel),
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
  panelHead.append(el('h2', undefined, t('ui.stagesNav')), fold);
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
  const realList = el('ul');
  for (const k of lab.page.real) realList.append(el('li', undefined, t(`${P}.real.${k}`)));
  real.append(el('h2', undefined, t('page.realTitle')), el('p', 'lab-lead', t(`${P}.real.lead`)), realList);

  page.append(intro, shell, real, el('footer', 'lab-footer', t('site.footer')));

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

  const total = lab.stages.stages.length;
  const updateStageLabels = () => {
    const i = runner.status.index;
    const label = i === -1 ? t('ui.free') : t('ui.stageOf', { n: i + 1, total });
    stageCell.textContent = label;
    tab.textContent = i === -1 ? t('ui.free') : t('ui.stageShort', { n: i + 1 });
    tab.title = `${t('ui.unfold')} · ${label}`;
  };
  runner.onChange(updateStageLabels);

  const stageBox = el('div');
  const tools = el('section', 'lab-tools');
  panelScroll.append(stageBox, tools, prefsSection);
  const stagePanel = new StagePanel(stageBox, runner, (id) => progress.isCompleted(id));
  keyOverlay.onPress((text) => stagePanel.pressed(text));
  if (app.renderLabTools) app.renderLabTools(tools);
  else tools.remove();

  const saved = progress.progress.current;
  runner.load(saved >= -1 && saved < total ? saved : 0);
  updateStageLabels();
  setFolded(loadFolded(), false);
  window.setInterval(() => runner.tick(), 5000);

  showDeviceWarningIfNeeded();
}
