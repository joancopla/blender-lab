/**
 * Site top bar (DESIGN.md): the project mark and name, linking to the index,
 * and the tools on the right. Shared by the index and the lab pages.
 */
import { t } from '../i18n';

export function topBar(homeHref: string, tools: readonly HTMLElement[]): HTMLElement {
  const bar = document.createElement('header');
  bar.className = 'shell-top';
  const name = document.createElement('a');
  name.className = 'shell-name';
  name.href = homeHref;
  const mark = document.createElement('span');
  mark.className = 'shell-name-mark';
  const label = document.createElement('span');
  label.textContent = t('site.title');
  name.append(mark, label);
  const right = document.createElement('div');
  right.className = 'shell-top-tools';
  right.append(...tools);
  bar.append(name, right);
  return bar;
}
