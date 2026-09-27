/**
 * Lab page, shared by every lab and every program: short introduction, the lab
 * (lab panel + replicated program) and the "In the real program" block. It only
 * talks to the program through the app contract.
 */
import type { LabDefinition } from '../lab';
import { KEY_OVERLAY_PREF, type PrefValues, loadPrefs, savePrefs } from './prefs';
import { ProgressStore } from '../stages/progress';
import { StageRunner } from '../stages/runner';
import { t } from '../i18n';
import { showDeviceWarningIfNeeded } from './device-warning';
import { KeyOverlay } from './key-overlay';
import { StagePanel } from './stage-panel';
import './shell.css';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function mountLabPage<State, Setup, Decorations>(lab: LabDefinition<State, Setup, Decorations>): void {
  const P = lab.page.prefix;
  document.title = `${t(lab.nameKey)} · ${t('site.title')}`;
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
    el('p', 'lab-eyebrow', t(`${P}.intro.eyebrow`)),
    el('h1', undefined, t(lab.nameKey)),
    el('p', 'lab-lead', t(`${P}.intro.lead`)),
    el('h2', undefined, t('page.controlsTitle')),
    controls,
    start,
  );

  // --- The lab -------------------------------------------------------------------
  const shell = el('section', 'lab-shell');
  shell.id = 'lab';
  const panel = el('aside', 'lab-panel');
  const replica = el('div', 'lab-replica');
  shell.append(panel, replica);

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
    const actions = el('div', 'lab-toast-actions');
    actions.append(yes, no);
    toast.replaceChildren(el('p', undefined, t(def.suggestKey)), actions);
    toast.hidden = false;
  }

  // The program gets its own element: its root must not share an element with
  // shell classes, or the result would depend on stylesheet order (it differs
  // between dev and build).
  const host = el('div');
  replica.prepend(host);
  app.mount(host, { preferences: () => prefs, suggestPreference: suggest });
  const keyOverlay = new KeyOverlay(app.overlayHost(), app.inputHost());
  keyOverlay.setEnabled(prefs[KEY_OVERLAY_PREF] === true);

  const prefsSection = el('section', 'lab-prefs');
  function setPrefs(next: PrefValues): void {
    prefs = next;
    savePrefs(prefs);
    renderPrefs();
    keyOverlay.setEnabled(prefs[KEY_OVERLAY_PREF] === true);
  }
  function renderPrefs(): void {
    prefsSection.replaceChildren(el('h2', undefined, t('prefs.title')));
    const toggles = [
      ...app.preferences,
      { key: KEY_OVERLAY_PREF, labelKey: 'prefs.keyOverlay', helpKey: 'prefs.keyOverlayHelp' },
    ];
    for (const { key, labelKey, helpKey } of toggles) {
      const row = el('label', 'lab-switch');
      const input = el('input');
      input.type = 'checkbox';
      input.setAttribute('role', 'switch');
      input.checked = prefs[key] === true;
      input.addEventListener('change', () => setPrefs({ ...prefs, [key]: input.checked }));
      const text = el('span', 'lab-switch-text');
      text.append(el('strong', undefined, t(labelKey)), el('small', undefined, t(helpKey)));
      row.append(input, text);
      prefsSection.append(row);
    }
  }
  renderPrefs();

  // --- Stages --------------------------------------------------------------------
  const progress = new ProgressStore(lab.id);
  const runner = new StageRunner(lab.stages, { app, progress, now: () => performance.now() });
  app.onChange(() => runner.notifyActivity());
  runner.onChange(() => app.decorate(runner.status.result.decorations));

  const stageBox = el('div');
  const tools = el('section');
  panel.append(stageBox, tools, prefsSection);
  new StagePanel(stageBox, runner, (id) => progress.isCompleted(id));
  if (app.renderLabTools) app.renderLabTools(tools);
  else tools.remove();

  const saved = progress.progress.current;
  runner.load(saved >= -1 && saved < lab.stages.stages.length ? saved : 0);
  window.setInterval(() => runner.tick(), 5000);

  showDeviceWarningIfNeeded();
}
