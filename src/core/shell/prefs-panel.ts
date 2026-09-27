/**
 * Preference switches (lab style), shared by the lab panel and the index.
 */
import { t } from '../i18n';
import type { PrefValues } from './prefs';

export interface PrefToggle {
  readonly key: string;
  readonly labelKey: string;
  readonly helpKey: string;
}

export function renderPrefSwitches(
  container: HTMLElement,
  toggles: readonly PrefToggle[],
  values: PrefValues,
  onChange: (next: PrefValues) => void,
): void {
  container.replaceChildren();
  for (const { key, labelKey, helpKey } of toggles) {
    const row = document.createElement('label');
    row.className = 'lab-switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = values[key] === true;
    input.addEventListener('change', () => onChange({ ...values, [key]: input.checked }));
    const text = document.createElement('span');
    text.className = 'lab-switch-text';
    const strong = document.createElement('strong');
    strong.textContent = t(labelKey);
    const small = document.createElement('small');
    small.textContent = t(helpKey);
    text.append(strong, small);
    row.append(input, text);
    container.append(row);
  }
}
