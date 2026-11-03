/**
 * Pill page (DESIGN.md, "Píndoles"): the site top bar, the viewer filling the rest of
 * the window and the independent-project footer line.
 */
import { t } from '../i18n';
import { themeButton } from '../shell/theme';
import { topBar } from '../shell/top-bar';
import type { PillDefinition } from './pill';
import { type PillViewerOptions, mountPillViewer } from './pill-viewer';
import '../shell/shell.css';

export interface PillPageOptions<View> extends PillViewerOptions<View> {
  /** Index address from the page (pills live two folders below the root). */
  readonly indexHref?: string;
}

export function mountPillPage<View>(pill: PillDefinition<View>, options: PillPageOptions<View>): void {
  const root = document.getElementById('app')!;
  root.className = 'lab-page pill-page';
  document.title = `${t(pill.nameKey)} — ${t('site.title')}`;
  const home = options.indexHref ?? '../../';
  const back = document.createElement('a');
  back.className = 'shell-top-link';
  back.href = `${home}#pills`;
  back.textContent = t('pills.all');
  const footer = document.createElement('footer');
  footer.className = 'pill-footer';
  footer.textContent = t('site.footer');
  const main = document.createElement('main');
  main.className = 'pill-main';
  root.replaceChildren(topBar(home, [back, themeButton('shell-top-button')]), main, footer);
  mountPillViewer(main, pill, options);
}
