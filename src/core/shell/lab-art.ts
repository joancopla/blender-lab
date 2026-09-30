/**
 * A lab's illustration on its dark, viewport-like panel, with the lab's
 * signature keys underneath (DESIGN.md). The drawing comes from the lab
 * definition; the core only places it.
 */
import type { LabDefinition } from '../lab';
import { t } from '../i18n';

export function labArt<K extends 'a' | 'div'>(lab: LabDefinition, tag: K, cls: string): HTMLElementTagNameMap[K] {
  const art = document.createElement(tag);
  art.className = `shell-art ${cls}`;
  art.setAttribute('aria-hidden', 'true');
  // Static markup from the lab's own code, never from user input.
  art.innerHTML = lab.illustration ?? '';
  const keys = lab.signatureKeys ?? [];
  if (keys.length > 0) {
    const chain = document.createElement('span');
    chain.className = 'shell-art-keys';
    keys.forEach((k, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'shell-art-keys-sep';
        sep.textContent = '·';
        chain.append(sep);
      }
      const key = document.createElement('span');
      key.textContent = t(`keys.${k}`);
      chain.append(key);
    });
    art.append(chain);
  }
  return art;
}
