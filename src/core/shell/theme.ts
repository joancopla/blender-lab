/**
 * Dark (default) or light look for the shell (DESIGN.md). The student can switch
 * at any time; the choice is applied as <html data-theme="dark|light">. Each
 * HTML page applies the saved choice in an inline script before the first paint,
 * with the same storage key.
 */
import { t } from '../i18n';
import type { StorageLike } from './prefs';

export type ThemeChoice = 'dark' | 'light';

export const THEME_KEY = 'blender-lab:theme';
const THEME_EVENT = 'shell-theme';

function defaultStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadTheme(storage: StorageLike | null = defaultStorage()): ThemeChoice {
  try {
    const v = storage?.getItem(THEME_KEY);
    return v === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(choice: ThemeChoice, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(THEME_KEY, choice);
  } catch {
    // Not saved: the choice still applies for this visit.
  }
}

export function nextTheme(choice: ThemeChoice): ThemeChoice {
  return choice === 'dark' ? 'light' : 'dark';
}

export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = choice;
}

/** A button that switches between dark and light and says which one is on. */
export function themeButton(cls: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  let choice = loadTheme();
  const label = () => {
    b.textContent = t('theme.label', { mode: t(`theme.${choice}`) });
    b.title = t('theme.help');
  };
  b.addEventListener('click', () => {
    choice = nextTheme(choice);
    saveTheme(choice);
    applyTheme(choice);
    document.dispatchEvent(new CustomEvent<ThemeChoice>(THEME_EVENT, { detail: choice }));
  });
  // A page can have more than one of these buttons (lab page: top bar and title block).
  document.addEventListener(THEME_EVENT, (e) => {
    choice = (e as CustomEvent<ThemeChoice>).detail;
    label();
  });
  applyTheme(choice);
  label();
  return b;
}
