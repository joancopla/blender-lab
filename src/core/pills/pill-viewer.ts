/**
 * Pill viewer (DESIGN.md, "Píndoles"): a fixed 1920×1080 stage scaled to fit its box, so
 * it looks the same on a laptop and on the classroom projector. Left, the program image
 * (drawn by the program's renderer); right, the step panel in the shell style.
 * ←/→ (and Space, PageUp/PageDown, Home/End) change step, F toggles full screen and the
 * step number is kept in the address (#5).
 */
import { t } from '../i18n';
import { type PillDefinition, type PillStep, STEP_TEXT_FIELDS, applyNav, navForKey, parseToken, stepFromHash } from './pill';
import './pill.css';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
/** Width of the program image; the panel takes the rest. */
export const ART_W = 1200;

/** Draws a step's program image into `host` (ART_W × STAGE_H), replacing what was there. */
export type PillArtRenderer<View> = (host: HTMLElement, step: PillStep<View>) => void;

export interface PillViewerOptions<View> {
  /** i18n key of the program name (eyebrow "<pill> · <program>" and operator line). */
  readonly programKey: string;
  readonly renderArt: PillArtRenderer<View>;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function stepText(pill: PillDefinition<unknown>, step: { id: string }, field: (typeof STEP_TEXT_FIELDS)[number] | `notes.${string}`): string {
  return t(`${pill.texts}.steps.${step.id}.${field}`);
}

function keyCap(label: string): HTMLElement {
  return el('kbd', 'lab-kbd pill-kbd', label);
}

function row(pill: PillDefinition<unknown>, step: PillStep<unknown>, tokens: readonly string[]): HTMLElement {
  const r = el('div', 'pill-row');
  for (const token of tokens) {
    const p = parseToken(token);
    if (p.kind === 'note') {
      r.append(el('span', 'pill-note', stepText(pill, step, `notes.${p.id}`)));
      continue;
    }
    p.parts.forEach((part, i) => {
      if (i > 0) r.append(el('span', 'pill-plus', '+'));
      r.append(keyCap(part.kind === 'key' ? part.label : t(`keyOverlay.mouse.${part.id}`)));
    });
  }
  return r;
}

export function mountPillViewer<View>(container: HTMLElement, pill: PillDefinition<View>, options: PillViewerOptions<View>): () => void {
  const total = pill.steps.length;
  const viewer = el('div', 'pill-viewer');
  const stage = el('div', 'pill-stage');
  const art = el('div', 'pill-art');
  art.style.width = `${ART_W}px`;

  const panel = el('section', 'pill-panel');
  panel.setAttribute('aria-live', 'polite');
  const eyebrow = el('p', 'shell-eyebrow shell-eyebrow-dot pill-eyebrow', `${t(pill.nameKey)} · ${t(options.programKey)}`);
  const counter = el('p', 'pill-counter');
  const title = el('h1', 'pill-title');
  const lead = el('p', 'pill-lead');
  const keys = el('div', 'pill-keys');
  const hint = el('p', 'pill-hint');
  const op = el('p', 'pill-op');
  const foot = el('div', 'pill-foot');
  const bar = el('div', 'shell-progress pill-progress');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('div');
  bar.append(fill);
  const footRow = el('div', 'pill-foot-row');
  const next = el('span', 'pill-next');
  const help = el('p', 'pill-help', t('pills.help'));
  const nav = el('span', 'pill-nav');
  const prevBtn = el('button', 'pill-nav-button', '←');
  const nextBtn = el('button', 'pill-nav-button', '→');
  prevBtn.type = nextBtn.type = 'button';
  prevBtn.setAttribute('aria-label', t('pills.prev'));
  nextBtn.setAttribute('aria-label', t('pills.nextStep'));
  nav.append(prevBtn, nextBtn);
  footRow.append(next, nav);
  foot.append(bar, footRow, help);
  panel.append(eyebrow, counter, title, lead, keys, hint, op, foot);
  stage.append(art, panel);
  viewer.append(stage);
  container.append(viewer);

  // Preload every image so stepping is instant on modest classroom computers.
  const preload = pill.steps.map((s) => Object.assign(new Image(), { src: s.image }));

  let cur = stepFromHash(window.location.hash, total);

  function show(i: number): void {
    cur = i;
    const step = pill.steps[cur]!;
    options.renderArt(art, step);
    counter.textContent = t('pills.counter', { n: cur + 1, total });
    const accent = el('span', 'pill-accent', stepText(pill, step, 'titleAccent'));
    title.replaceChildren(stepText(pill, step, 'title'), el('br'), accent);
    lead.textContent = stepText(pill, step, 'lead');
    keys.replaceChildren(...step.rows.map((r) => row(pill, step, r)));
    hint.replaceChildren(el('strong', undefined, stepText(pill, step, 'hintStrong')), ' ', stepText(pill, step, 'hint'));
    op.replaceChildren();
    if (step.op) op.append(t('pills.operator', { program: t(options.programKey) }), ' ', el('span', undefined, step.op));
    fill.style.width = `${((cur + 1) / total) * 100}%`;
    const after = pill.steps[cur + 1];
    next.textContent = after ? t('pills.next', { name: stepText(pill, after, 'short') }) : t('pills.last');
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === total - 1;
    try {
      window.history.replaceState(null, '', `#${cur + 1}`);
    } catch {
      // Some embedded previews forbid history changes; the viewer works without it.
    }
  }

  function fit(): void {
    const box = viewer.getBoundingClientRect();
    const k = Math.min(box.width / STAGE_W, box.height / STAGE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  }

  function onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const n = navForKey(e);
    if (!n) return;
    e.preventDefault();
    if (n === 'fullscreen') {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void viewer.requestFullscreen?.();
      return;
    }
    const to = applyNav(cur, n, total);
    if (to !== cur) show(to);
  }

  prevBtn.addEventListener('click', () => show(applyNav(cur, 'prev', total)));
  nextBtn.addEventListener('click', () => show(applyNav(cur, 'next', total)));
  window.addEventListener('keydown', onKey);
  const ro = new ResizeObserver(fit);
  ro.observe(viewer);
  show(cur);
  fit();

  return () => {
    window.removeEventListener('keydown', onKey);
    ro.disconnect();
    preload.length = 0;
    viewer.remove();
  };
}
