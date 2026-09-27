/**
 * Lab page, shared by every lab: short introduction, the lab (lab column +
 * Blender replica) and the "Al Blender real" block. Each lab only provides data
 * (texts, stages, options) through its LabDefinition.
 */
import { mountLab } from '../engine/app';
import type { LabDefinition } from '../engine/lab';
import { type LabPrefs, loadPrefs, savePrefs } from '../engine/lab-prefs';
import { analyzeMesh } from '../engine/mesh/analyze';
import { ProgressStore } from '../engine/stages/progress';
import { StageRunner } from '../engine/stages/runner';
import { activeObject, meshOf } from '../engine/scene/scene';
import type { ComponentHint } from '../engine/viewport/lab-elements';
import { t } from '../i18n';
import { showDeviceWarningIfNeeded } from './device-warning';
import { StagePanel } from './stage-panel';
import './lab.css';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function mountLabPage(lab: LabDefinition): void {
  const P = lab.page.prefix;
  document.title = `${t(lab.nameKey)} · Blender Lab`;
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

  // --- In real Blender -----------------------------------------------------------
  const real = el('section', 'lab-real');
  const realList = el('ul');
  for (const k of lab.page.real) realList.append(el('li', undefined, t(`${P}.real.${k}`)));
  real.append(el('h2', undefined, t('page.realTitle')), el('p', 'lab-lead', t(`${P}.real.lead`)), realList);

  page.append(intro, shell, real, el('footer', 'lab-footer', t('site.footer')));

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

  // The replica gets its own element: .bl-app must not share an element with lab
  // classes, or the result would depend on stylesheet order (it differs between dev and build).
  const replicaHost = el('div');
  replica.prepend(replicaHost);
  const app = mountLab(replicaHost, lab, {
    inputPrefs: () => prefs,
    onNavigateWithoutMiddle: suggestEmulation,
    statistics: lab.page.statistics,
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

  // --- Topology analyser (labs that ask for it) -----------------------------------
  const analyzerSection = el('section', 'lab-analyzer');
  let analyzerOn = false;
  let lastAnalyzed: { on: boolean; id: string | undefined; mesh: unknown } | null = null;
  function renderAnalyzer(): void {
    if (!lab.page.analyzer) return;
    const active = activeObject(app.store.state);
    app.renderer.setAnalyzerObject(analyzerOn && active?.type === 'mesh' ? active.id : null);
    const mesh = active?.type === 'mesh' ? meshOf(active) : null;
    // Mesh data is immutable: the same reference means the same analysis.
    if (lastAnalyzed && lastAnalyzed.on === analyzerOn && lastAnalyzed.id === active?.id && lastAnalyzed.mesh === mesh) return;
    lastAnalyzed = { on: analyzerOn, id: active?.id, mesh };
    analyzerSection.replaceChildren(el('h2', undefined, t('analyzer.title')));
    const row = el('label', 'lab-switch');
    const input = el('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = analyzerOn;
    input.addEventListener('change', () => {
      analyzerOn = input.checked;
      renderAnalyzer();
    });
    const text = el('span', 'lab-switch-text');
    text.append(el('strong', undefined, t('analyzer.toggle')), el('small', undefined, t('analyzer.help')));
    row.append(input, text);
    analyzerSection.append(row);
    if (!analyzerOn || !mesh) return;
    const r = analyzeMesh(mesh);
    const items: [string, number][] = [
      ['ngons', r.ngons.length],
      ['triangles', r.triangles.length],
      ['duplicates', r.duplicates.reduce((n, g) => n + g.length - 1, 0)],
      ['nonManifold', r.nonManifoldEdges.length],
      ['flipped', r.flippedFaces.length],
    ];
    const list = el('ul', 'lab-analyzer-list');
    let any = false;
    for (const [k, n] of items) {
      if (n === 0) continue;
      any = true;
      const li = el('li', `lab-analyzer-item is-${k}`);
      li.append(el('strong', undefined, t(`analyzer.${k}.label`, { n })), el('p', undefined, t(`analyzer.${k}.why`)));
      list.append(li);
    }
    analyzerSection.append(any ? list : el('p', 'lab-muted', t('analyzer.clean')));
  }

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
  app.store.onChange(() => {
    runner.notifyActivity();
    renderAnalyzer();
  });
  app.navigator.onChange(() => runner.notifyActivity());

  let loadedIndex: number | null = null;
  let shownHints: readonly ComponentHint[] | undefined;
  runner.onChange(() => {
    const s = runner.status;
    const hints = s.result.hints;
    if (s.index !== loadedIndex || hints !== shownHints) {
      if (s.index !== loadedIndex && s.stage?.analyzer) analyzerOn = true;
      loadedIndex = s.index;
      shownHints = hints;
      app.renderer.setLabElements(s.stage?.ghosts ?? [], s.stage?.markers ?? [], s.stage?.referenceMeshes ?? [], hints ?? []);
      renderAnalyzer();
    }
    app.renderer.setSeenMarkers(s.result.seenMarkers ?? []);
  });

  const stageBox = el('div');
  panel.append(stageBox);
  if (lab.page.analyzer) panel.append(analyzerSection);
  panel.append(prefsSection);
  new StagePanel(stageBox, runner, (id) => progress.isCompleted(id));

  const saved = progress.progress.current;
  runner.load(saved >= -1 && saved < lab.stages.stages.length ? saved : 0);
  window.setInterval(() => runner.tick(), 5000);
  renderAnalyzer();

  showDeviceWarningIfNeeded();
}
