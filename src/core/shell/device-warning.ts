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

/** Texts of the notice: the default one speaks about keyboard and mouse. */
export interface DeviceWarningTexts {
  readonly titleKey: string;
  readonly textKey: string;
}

export function showDeviceWarningIfNeeded(texts: DeviceWarningTexts = { titleKey: 'mobile.title', textKey: 'mobile.text' }): void {
  if (!needsDeviceWarning()) return;
  const overlay = document.createElement('div');
  overlay.className = 'lab-device-warning';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const box = document.createElement('div');
  box.className = 'lab-device-box';
  const h = document.createElement('h2');
  h.id = 'lab-device-title';
  h.textContent = t(texts.titleKey);
  overlay.setAttribute('aria-labelledby', h.id);
  const p = document.createElement('p');
  p.textContent = t(texts.textKey);
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
