/**
 * The labs need a keyboard and a mouse. On touch-only or small screens, show a
 * notice in Catalan (it can be dismissed).
 */
import { t } from '../i18n';

const MIN_WIDTH_PX = 900;

export function needsDeviceWarning(): boolean {
  const touchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
  return touchOnly || window.innerWidth < MIN_WIDTH_PX;
}

export function showDeviceWarningIfNeeded(): void {
  if (!needsDeviceWarning()) return;
  const overlay = document.createElement('div');
  overlay.className = 'lab-device-warning';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const box = document.createElement('div');
  box.className = 'lab-device-box';
  const h = document.createElement('h2');
  h.id = 'lab-device-title';
  h.textContent = t('mobile.title');
  overlay.setAttribute('aria-labelledby', h.id);
  const p = document.createElement('p');
  p.textContent = t('mobile.text');
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'lab-button';
  ok.textContent = t('mobile.continue');
  ok.addEventListener('click', () => overlay.remove());
  box.append(h, p, ok);
  overlay.append(box);
  document.body.append(overlay);
  ok.focus();
}
