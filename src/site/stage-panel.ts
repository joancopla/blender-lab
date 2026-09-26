/**
 * Lab column: current stage (title, instruction, keys, feedback, hints) and
 * navigation between stages. Lab UI in Catalan; it only reads the runner status.
 */
import type { StageRunner } from '../engine/stages/runner';
import { t } from '../i18n';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const button = (text: string, onClick: () => void, cls = 'lab-button') => {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export class StagePanel {
  private lastKey = '';

  constructor(
    private readonly container: HTMLElement,
    private readonly runner: StageRunner,
    private readonly isCompleted: (stageId: string) => boolean,
  ) {
    container.classList.add('lab-stage');
    runner.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    const s = this.runner.status;
    const r = s.result;
    // Rebuild only when something visible changed (checks run on every mouse move).
    const key = JSON.stringify([s.index, s.completed, r.done, r.feedback, s.hintsShown, s.interacted, s.stats, this.runner.stages.map((st) => this.isCompleted(st.id))]);
    if (key === this.lastKey) return;
    this.lastKey = key;

    const c = this.container;
    c.replaceChildren();
    c.append(this.nav());

    const stage = s.stage;
    if (!stage) {
      c.append(el('h2', 'lab-stage-count', t('ui.free')), el('p', 'lab-instruction', t('ui.freeText')));
      c.append(this.buttons());
      return;
    }

    const total = this.runner.stages.length;
    c.append(el('p', 'lab-stage-count', t('ui.stageOf', { n: s.index + 1, total })), el('h1', undefined, t(stage.titleKey)));
    c.append(el('p', 'lab-instruction', t(stage.instructionKey)));

    if (stage.keys.length > 0) {
      const keys = el('div', 'lab-keychips');
      keys.setAttribute('aria-label', t('ui.keys'));
      for (const k of stage.keys) keys.append(el('kbd', 'lab-kbd', t(`keys.${k}`)));
      c.append(keys);
    }

    const live = el('div', 'lab-status');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    if (r.done) {
      const ok = el('div', 'lab-result is-done');
      ok.append(el('strong', undefined, t('ui.done')), el('p', undefined, t(stage.successKey)));
      if (s.stats) {
        ok.append(
          el('p', 'lab-stats', t('ui.stats', { time: formatDuration(s.stats.seconds), ops: s.stats.operations })),
          el('p', 'lab-muted', t('ui.statsNote')),
        );
      }
      live.append(ok);
    } else {
      if (s.completed) live.append(el('p', 'lab-muted', t('ui.doneBefore')));
      // Corrections only after the student has done something; progress always.
      const f = r.feedback;
      if (f && (f.tone === 'progress' || s.interacted)) {
        live.append(el('div', `lab-result is-${f.tone}`, t(f.key, f.params)));
      }
    }
    c.append(live);

    if (stage.hints !== false && stage.hintKeys.length > 0 && !r.done) {
      const hints = el('div', 'lab-hints');
      stage.hintKeys.slice(0, s.hintsShown).forEach((k, i) => {
        const box = el('div', 'lab-hint');
        box.append(el('strong', undefined, `${t('ui.hintTitle')} ${i + 1}`), el('p', undefined, t(k)));
        hints.append(box);
      });
      if (s.hintsShown === 0) hints.append(button(t('ui.hint'), () => this.runner.showHint()));
      c.append(hints);
    }

    c.append(this.buttons());
  }

  private nav(): HTMLElement {
    const s = this.runner.status;
    const nav = el('nav', 'lab-stage-nav');
    nav.setAttribute('aria-label', t('ui.stagesNav'));
    this.runner.stages.forEach((st, i) => {
      const b = button(String(i + 1), () => this.runner.load(i), 'lab-dot');
      b.title = t(st.titleKey);
      if (this.isCompleted(st.id)) b.classList.add('is-done');
      if (i === s.index) {
        b.classList.add('is-current');
        b.setAttribute('aria-current', 'step');
      }
      nav.append(b);
    });
    const free = button(t('ui.free'), () => this.runner.load(-1), 'lab-dot lab-dot-free');
    if (s.index === -1) free.classList.add('is-current');
    nav.append(free);
    return nav;
  }

  private buttons(): HTMLElement {
    const s = this.runner.status;
    const total = this.runner.stages.length;
    const row = el('div', 'lab-actions');
    row.append(button(t('ui.reset'), () => this.runner.restart()));
    const prev = button(t('ui.prev'), () => this.runner.load(s.index === -1 ? total - 1 : s.index - 1));
    prev.disabled = s.index === 0;
    const next = button(
      t('ui.next'),
      () => this.runner.load(s.index + 1 >= total ? -1 : s.index + 1),
      s.result.done ? 'lab-button lab-button-primary' : 'lab-button',
    );
    next.disabled = s.index === -1;
    row.append(prev, next);
    return row;
  }
}
