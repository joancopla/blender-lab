/**
 * Lab page: short introduction, the lab (lab column + Blender replica) and the
 * "Al Blender real" block. Lab UI in Catalan, with its own style.
 */
import { mountLab } from '../engine/app';
import { type LabPrefs, loadPrefs, savePrefs } from '../engine/lab-prefs';
import { ProgressStore } from '../engine/stages/progress';
import { StageRunner } from '../engine/stages/runner';
import { t } from '../i18n';
import { lab01 } from '../labs/01-viewport';
import { showDeviceWarningIfNeeded } from './device-warning';
import { StagePanel } from './stage-panel';
import './lab.css';

const lab = lab01;
document.title = `${t(lab.nameKey)} · Blender Lab`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const page = document.getElementById('app')!;
page.className = 'lab-page';

// --- Introduction ----------------------------------------------------------------
const intro = el('header', 'lab-intro');
const back = el('a', 'lab-back', t('ui.backToIndex'));
back.href = '../../';
const controls = el('ul', 'lab-controls');
for (const k of ['orbit', 'pan', 'zoom', 'views', 'select', 'transform', 'undo']) {
  controls.append(el('li', undefined, t(`intro.controls.${k}`)));
}
const start = el('a', 'lab-button lab-button-primary', t('intro.start'));
start.href = '#lab';
intro.append(
  back,
  el('p', 'lab-eyebrow', t('intro.eyebrow')),
  el('h1', undefined, t(lab.nameKey)),
  el('p', 'lab-lead', t('intro.lead')),
  el('h2', undefined, t('intro.controlsTitle')),
  controls,
  start,
);

// --- The lab -------------------------------------------------------------------
const shell = el('section', 'lab-shell');
shell.id = 'lab';
const panel = el('aside', 'lab-panel');
const replica = el('div', 'lab-replica');
shell.append(panel, replica);

// --- In real Blender -----------------------------------------------------------
const real = el('section', 'lab-real');
const realList = el('ul');
for (const k of ['navigation', 'emulation', 'views', 'frame', 'select', 'transform', 'clear', 'undo']) {
  realList.append(el('li', undefined, t(`real.${k}`)));
}
real.append(el('h2', undefined, t('real.title')), el('p', 'lab-lead', t('real.lead')), realList);

const footer = el('footer', 'lab-footer', t('site.footer'));
page.append(intro, shell, real, footer);

// --- Preferences and the suggestion to enable Emulate 3 Button Mouse ------------
let prefs: LabPrefs = loadPrefs();
const prefsSection = el('section', 'lab-prefs');

const toast = el('div', 'lab-toast');
toast.hidden = true;
toast.setAttribute('role', 'status');
replica.append(toast);
let suggestionDismissed = false;

function suggestEmulation(): void {
  if (suggestionDismissed || prefs.emulate3ButtonMouse || !toast.hidden) return;
  const close = () => {
    toast.hidden = true;
    suggestionDismissed = true;
  };
  const yes = el('button', 'lab-button lab-button-primary', t('prefs.suggestYes'));
  yes.type = 'button';
  yes.addEventListener('click', () => {
    setPrefs({ ...prefs, emulate3ButtonMouse: true });
    close();
  });
  const no = el('button', 'lab-button', t('prefs.suggestNo'));
  no.type = 'button';
  no.addEventListener('click', close);
  const actions = el('div', 'lab-toast-actions');
  actions.append(yes, no);
  toast.replaceChildren(el('p', undefined, t('prefs.suggestEmulate3')), actions);
  toast.hidden = false;
}

const app = mountLab(replica, lab, {
  inputPrefs: () => prefs,
  onNavigateWithoutMiddle: suggestEmulation,
});

function setPrefs(next: LabPrefs): void {
  prefs = next;
  savePrefs(prefs);
  renderPrefs();
  app.keyOverlay.setEnabled(prefs.keyOverlay);
}
app.keyOverlay.setEnabled(prefs.keyOverlay);

function renderPrefs(): void {
  prefsSection.replaceChildren(el('h2', undefined, t('prefs.title')));
  const toggles: [keyof LabPrefs, string, string][] = [
    ['emulate3ButtonMouse', 'prefs.emulate3', 'prefs.emulate3Help'],
    ['emulateNumpad', 'prefs.emulateNumpad', 'prefs.emulateNumpadHelp'],
    ['keyOverlay', 'prefs.keyOverlay', 'prefs.keyOverlayHelp'],
  ];
  for (const [key, label, help] of toggles) {
    const row = el('label', 'lab-switch');
    const input = el('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = prefs[key];
    input.addEventListener('change', () => setPrefs({ ...prefs, [key]: input.checked }));
    const text = el('span', 'lab-switch-text');
    text.append(el('strong', undefined, t(label)), el('small', undefined, t(help)));
    row.append(input, text);
    prefsSection.append(row);
  }
}
renderPrefs();

// --- Stages --------------------------------------------------------------------
const progress = new ProgressStore(lab.id);
const runner = new StageRunner(lab.stages, {
  store: app.store,
  view: () => app.navigator.state,
  projection: () => app.settledProjection(),
  resetView: (v) => app.navigator.reset(v),
  progress,
  now: () => performance.now(),
});
app.store.onChange(() => runner.notifyActivity());
app.navigator.onChange(() => runner.notifyActivity());

let loadedIndex: number | null = null;
runner.onChange(() => {
  const s = runner.status;
  if (s.index !== loadedIndex) {
    loadedIndex = s.index;
    app.renderer.setLabElements(s.stage?.ghosts ?? [], s.stage?.markers ?? []);
  }
  app.renderer.setSeenMarkers(s.result.seenMarkers ?? []);
});

const stageBox = el('div');
panel.append(stageBox, prefsSection);
new StagePanel(stageBox, runner, (id) => progress.isCompleted(id));

const saved = progress.progress.current;
runner.load(saved >= -1 && saved < lab.stages.stages.length ? saved : 0);
window.setInterval(() => runner.tick(), 5000);

showDeviceWarningIfNeeded();
