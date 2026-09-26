import { t } from '../i18n';
import './site.css';

// Temporary index page. The real collection index arrives in phase 5.
const root = document.getElementById('site')!;
root.innerHTML = `
  <h1></h1>
  <p class="tagline"></p>
  <p><a href="labs/01-viewport/"></a></p>
  <p class="wip"></p>
`;
root.querySelector('h1')!.textContent = t('site.title');
root.querySelector('.tagline')!.textContent = t('site.tagline');
root.querySelector('a')!.textContent = t('site.labLink');
root.querySelector('.wip')!.textContent = t('site.wip');
