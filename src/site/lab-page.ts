/**
 * Lab page: the lab column (instructions, preferences) next to the Blender
 * replica. Everything in the lab column is lab UI, in Catalan, with its own style.
 */
import { mountLab } from '../engine/app';
import { type LabPrefs, loadPrefs, savePrefs } from '../engine/lab-prefs';
import { t } from '../i18n';
import { lab01 } from '../labs/01-viewport';
import './lab.css';

const root = document.getElementById('app')!;
root.className = 'lab-shell';

const panel = document.createElement('aside');
panel.className = 'lab-panel';
const replica = document.createElement('div');
replica.className = 'lab-replica';
root.append(panel, replica);

let prefs: LabPrefs = loadPrefs();
const setPrefs = (next: LabPrefs) => {
  prefs = next;
  savePrefs(prefs);
  renderPrefs();
  app.keyOverlay.setEnabled(prefs.keyOverlay);
};

// --- Suggestion to enable Emulate 3 Button Mouse -----------------------------
let suggestionDismissed = false;
const toast = document.createElement('div');
toast.className = 'lab-toast';
toast.hidden = true;
toast.setAttribute('role', 'status');
replica.append(toast);

function suggestEmulation(): void {
  if (suggestionDismissed || prefs.emulate3ButtonMouse || !toast.hidden) return;
  toast.replaceChildren();
  const p = document.createElement('p');
  p.textContent = t('prefs.suggestEmulate3');
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.className = 'lab-button lab-button-primary';
  yes.textContent = t('prefs.suggestYes');
  const no = document.createElement('button');
  no.type = 'button';
  no.className = 'lab-button';
  no.textContent = t('prefs.suggestNo');
  const close = () => {
    toast.hidden = true;
    suggestionDismissed = true;
  };
  yes.addEventListener('click', () => {
    setPrefs({ ...prefs, emulate3ButtonMouse: true });
    close();
  });
  no.addEventListener('click', close);
  const actions = document.createElement('div');
  actions.className = 'lab-toast-actions';
  actions.append(yes, no);
  toast.append(p, actions);
  toast.hidden = false;
}

const app = mountLab(replica, lab01, {
  inputPrefs: () => prefs,
  onNavigateWithoutMiddle: suggestEmulation,
});
app.keyOverlay.setEnabled(prefs.keyOverlay);

// --- Lab column ---------------------------------------------------------------
const stageArea = document.createElement('section');
stageArea.className = 'lab-stage';
const prefsSection = document.createElement('section');
prefsSection.className = 'lab-prefs';
panel.append(stageArea, prefsSection);

function renderPrefs(): void {
  prefsSection.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = t('prefs.title');
  prefsSection.append(h);
  const toggles: [keyof LabPrefs, string, string][] = [
    ['emulate3ButtonMouse', 'prefs.emulate3', 'prefs.emulate3Help'],
    ['emulateNumpad', 'prefs.emulateNumpad', 'prefs.emulateNumpadHelp'],
    ['keyOverlay', 'prefs.keyOverlay', 'prefs.keyOverlayHelp'],
  ];
  for (const [key, label, help] of toggles) {
    const row = document.createElement('label');
    row.className = 'lab-switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = prefs[key];
    input.addEventListener('change', () => setPrefs({ ...prefs, [key]: input.checked }));
    const text = document.createElement('span');
    text.className = 'lab-switch-text';
    const name = document.createElement('strong');
    name.textContent = t(label);
    const desc = document.createElement('small');
    desc.textContent = t(help);
    text.append(name, desc);
    row.append(input, text);
    prefsSection.append(row);
  }
}
renderPrefs();

