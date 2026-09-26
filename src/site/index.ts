/**
 * Collection index: the list of labs with their status and the student's progress.
 */
import type { LabDefinition } from '../engine/lab';
import { ProgressStore } from '../engine/stages/progress';
import { t } from '../i18n';
import { lab01 } from '../labs/01-viewport';
import './lab.css';
import './site.css';

interface LabEntry {
  readonly lab: LabDefinition;
  readonly href: string;
  readonly number: string;
}

// Only Lab 01 for now; the rest of the index will be defined later.
const LABS: readonly LabEntry[] = [{ lab: lab01, href: 'labs/01-viewport/', number: '01' }];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const root = document.getElementById('site')!;
root.className = 'site lab-page';

function render(): void {
  root.replaceChildren();
  const header = el('header', 'site-header');
  header.append(el('h1', undefined, t('site.title')), el('p', 'lab-lead', t('site.tagline')));

  const list = el('ul', 'site-labs');
  for (const entry of LABS) {
    const total = entry.lab.stages.stages.length;
    const store = new ProgressStore(entry.lab.id);
    const done = entry.lab.stages.stages.filter((s) => store.isCompleted(s.id)).length;

    const card = el('li', 'site-card');
    const top = el('div', 'site-card-top');
    top.append(el('span', 'lab-eyebrow', `Lab ${entry.number}`), el('span', 'site-status', t('site.statusAvailable')));
    const title = el('h2');
    const link = el('a', undefined, t(entry.lab.nameKey));
    link.href = entry.href;
    title.append(link);

    const bar = el('div', 'site-progress');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(total));
    bar.setAttribute('aria-valuenow', String(done));
    const fill = el('div', 'site-progress-fill');
    fill.style.width = `${(done / total) * 100}%`;
    bar.append(fill);
    const label =
      done === 0 ? t('site.progressNone') : done === total ? t('site.progressDone') : t('site.progress', { n: done, total });

    const actions = el('div', 'lab-actions');
    const open = el('a', 'lab-button lab-button-primary', t('site.open'));
    open.href = entry.href;
    actions.append(open);
    if (done > 0) {
      let armed = false;
      const reset = el('button', 'lab-button', t('site.resetProgress'));
      reset.type = 'button';
      // Two clicks instead of a browser dialog.
      reset.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          reset.textContent = t('site.resetProgressConfirm');
          return;
        }
        store.reset();
        render();
      });
      actions.append(reset);
    }

    card.append(top, title, el('p', 'lab-muted', t(entry.lab.descKey)), bar, el('p', 'site-progress-label', label), actions);
    list.append(card);
  }

  root.append(header, el('h2', 'site-section', t('site.labsTitle')), list, el('footer', 'lab-footer', t('site.footer')));
}

render();
