/**
 * Stage panel (DESIGN.md, "Pàgina de lab"): the numbered list of stages and the
 * current one (instruction, hints, keys, check status, actions). Lab UI in
 * Catalan; it only reads the runner status.
 */
import type { StageRunner } from '../stages/runner';
import { t } from '../i18n';
import { axisText } from './axis-text';
import { chipMatches } from './key-match';

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

const PRESS_MS = 160;

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export class StagePanel {
  private lastKey = '';
  /** Whether the current stage was already done at the last render (the seal animates once). */
  private wasDone = false;
  private lastIndex = -2;
  /** "Etapa reiniciada" until the student does something or changes stage. */
  private restarted = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly runner: StageRunner,
    private readonly isCompleted: (stageId: string) => boolean,
  ) {
    container.classList.add('lab-stage');
    runner.onChange(() => this.render());
    this.render();
  }

  /** Visual click on the key chips matching a key or click the student just made. */
  pressed(text: string): void {
    for (const chip of this.container.querySelectorAll<HTMLElement>('.lab-kbd[data-key]')) {
      if (!chipMatches(chip.dataset.key!, text)) continue;
      chip.classList.remove('is-pressed');
      // Restart the effect when the same key is pressed again quickly.
      void chip.offsetWidth;
      chip.classList.add('is-pressed');
      window.setTimeout(() => chip.classList.remove('is-pressed'), PRESS_MS);
    }
  }

  private render(): void {
    const s = this.runner.status;
    const r = s.result;

    if (s.index !== this.lastIndex) {
      this.lastIndex = s.index;
      this.wasDone = r.done;
      this.restarted = false;
    }
    if (s.interacted) this.restarted = false;
    // Animate the seal only when the stage becomes done in front of the student.
    const fresh = r.done && !this.wasDone;
    this.wasDone = r.done;

    // Rebuild only when something visible changed (checks run on every mouse move).
    const key = JSON.stringify([
      s.index, s.completed, r.done, r.feedback, s.hintsShown, s.interacted, s.stats, this.restarted,
      this.runner.stages.map((st) => this.isCompleted(st.id)),
    ]);
    if (key === this.lastKey && !fresh) return;
    this.lastKey = key;

    const c = this.container;
    c.replaceChildren(this.list());

    const current = el('section', 'lab-current');
    current.setAttribute('aria-labelledby', 'lab-current-title');
    c.append(current);

    const stage = s.stage;
    if (!stage) {
      const h = el('h2', 'lab-current-title', t('ui.free'));
      h.id = 'lab-current-title';
      current.append(h, el('p', 'lab-instruction', t('ui.freeText')), this.actions());
      return;
    }

    const total = this.runner.stages.length;
    const title = el('h2', 'lab-current-title', t(stage.titleKey));
    title.id = 'lab-current-title';
    const instruction = el('p', 'lab-instruction');
    instruction.append(axisText(t(stage.instructionKey)));
    current.append(el('p', 'lab-current-count', t('ui.stageOf', { n: s.index + 1, total })), title, instruction);

    const hintsAllowed = stage.hints !== false && stage.hintKeys.length > 0 && !r.done;
    if (hintsAllowed && s.hintsShown > 0) {
      const hints = el('div', 'lab-hints');
      stage.hintKeys.slice(0, s.hintsShown).forEach((k, i) => {
        const box = el('div', 'lab-hint');
        const p = el('p');
        p.append(axisText(t(k)));
        box.append(el('strong', undefined, t('ui.hintTitle', { n: i + 1 })), p);
        hints.append(box);
      });
      current.append(hints);
    }

    if (stage.keys.length > 0) {
      const keys = el('div', 'lab-keychips');
      keys.setAttribute('role', 'group');
      keys.setAttribute('aria-label', t('ui.keys'));
      for (const k of stage.keys) {
        const label = t(`keys.${k}`);
        const kbd = el('kbd', 'lab-kbd', label);
        kbd.dataset.key = label;
        keys.append(kbd);
      }
      current.append(keys);
    }

    if (hintsAllowed && s.hintsShown === 0) {
      current.append(button(t('ui.hint'), () => this.runner.showHint(), 'lab-link-button'));
    }

    const live = el('div', 'lab-status');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    if (r.done) {
      const seal = el('div', fresh ? 'lab-seal is-new' : 'lab-seal');
      const mark = el('span', 'lab-seal-mark');
      mark.setAttribute('aria-hidden', 'true');
      const text = el('div', 'lab-seal-text');
      text.append(el('strong', undefined, t('ui.done')), el('p', undefined, t(stage.successKey)));
      seal.append(mark, text);
      live.append(seal);
      if (s.stats) {
        live.append(
          el('p', 'lab-stats', t('ui.stats', { time: formatDuration(s.stats.seconds), ops: s.stats.operations })),
          el('p', 'lab-muted', t('ui.statsNote')),
        );
      }
    } else {
      if (this.restarted) live.append(el('p', 'lab-note', t('ui.resetDone')));
      else if (s.completed) live.append(el('p', 'lab-note', t('ui.doneBefore')));
      // Corrections only after the student has done something; progress always.
      const f = r.feedback;
      if (f && (f.tone === 'progress' || s.interacted)) {
        const p = el('p', f.tone === 'fix' ? 'lab-feedback is-fix' : 'lab-feedback');
        p.append(axisText(t(f.key, f.params)));
        live.append(p);
      }
    }
    current.append(live, this.actions());
  }

  private list(): HTMLElement {
    const s = this.runner.status;
    const ol = el('ol', 'lab-steps');
    ol.setAttribute('aria-label', t('ui.stagesNav'));
    const item = (n: string, title: string, done: boolean, isCurrent: boolean, load: () => void) => {
      const li = el('li');
      const b = button('', load, 'lab-step');
      b.append(el('span', 'lab-step-n', n), el('span', 'lab-step-title', title));
      if (done) {
        b.classList.add('is-done');
        b.append(el('span', 'lab-step-state', t('ui.stepDone')));
      }
      if (isCurrent) {
        b.classList.add('is-current');
        b.setAttribute('aria-current', 'step');
      }
      li.append(b);
      ol.append(li);
    };
    this.runner.stages.forEach((st, i) =>
      item(String(i + 1), t(st.titleKey), this.isCompleted(st.id), i === s.index, () => this.runner.load(i)),
    );
    item('·', t('ui.free'), false, s.index === -1, () => this.runner.load(-1));
    return ol;
  }

  private actions(): HTMLElement {
    const s = this.runner.status;
    const total = this.runner.stages.length;
    const row = el('div', 'lab-actions');
    row.append(
      button(t('ui.reset'), () => {
        this.runner.restart();
        this.restarted = true;
        this.lastKey = '';
        this.render();
      }),
    );
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
