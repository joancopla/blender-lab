/**
 * Light "paper" or dark "blueprint" look for the shell (DESIGN.md). Follows the
 * system unless the student picks one; the choice is applied as
 * <html data-theme="light|dark">. Each HTML page applies the saved choice in an
 * inline script before the first paint, with the same storage key.
 */
import { t } from '../i18n';
import type { StorageLike } from './prefs';

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'blender-lab:theme';
const ORDER: readonly ThemeChoice[] = ['system', 'light', 'dark'];

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
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
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
  return ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]!;
}

export function applyTheme(choice: ThemeChoice): void {
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
}

/** A button that cycles system → light → dark and says which one is on. */
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
    label();
  });
  applyTheme(choice);
  label();
  return b;
}
