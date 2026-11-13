/**
 * Drop-down menus of the replica: the menu bar's and the context menu of the
 * transform box. One menu open at a time, closed by a click elsewhere or Esc.
 */
import { ICONS } from './icons';

export interface MenuItem {
  readonly label: string;
  readonly shortcut?: string;
  /** Default true. */
  readonly enabled?: boolean;
  readonly checked?: boolean;
  run?(): void;
  readonly submenu?: readonly MenuEntry[];
}

export type MenuEntry = MenuItem | 'separator';

export class MenuHost {
  private open: HTMLElement | null = null;
  private onClose: (() => void) | null = null;

  constructor(private readonly root: HTMLElement) {
    root.addEventListener('pointerdown', (e) => {
      if (this.open && !(e.target as Element).closest('.ps-menu, .ps-menubar')) this.close();
    });
  }

  get isOpen(): boolean {
    return this.open !== null;
  }

  /** Shows a menu with its top left corner at (x, y), in root coordinates. */
  show(entries: readonly MenuEntry[], x: number, y: number, onClose?: () => void): void {
    this.close();
    const menu = this.build(entries);
    this.root.append(menu);
    // Keep it inside the replica.
    const max = this.root.getBoundingClientRect();
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(0, Math.min(x, max.width - box.width))}px`;
    menu.style.top = `${Math.max(0, Math.min(y, max.height - box.height))}px`;
    this.open = menu;
    this.onClose = onClose ?? null;
  }

  close(): void {
    this.open?.remove();
    this.open = null;
    const fn = this.onClose;
    this.onClose = null;
    fn?.();
  }

  private build(entries: readonly MenuEntry[]): HTMLElement {
    const list = document.createElement('ul');
    list.className = 'ps-menu';
    list.setAttribute('role', 'menu');
    for (const entry of entries) {
      const li = document.createElement('li');
      if (entry === 'separator') {
        li.className = 'ps-menu-separator';
        li.setAttribute('role', 'separator');
        list.append(li);
        continue;
      }
      const enabled = entry.enabled !== false;
      li.className = 'ps-menu-item';
      li.setAttribute('role', 'menuitem');
      li.setAttribute('aria-disabled', String(!enabled));
      const check = document.createElement('span');
      check.className = 'ps-menu-check';
      check.textContent = entry.checked ? '✓' : '';
      const label = document.createElement('span');
      label.className = 'ps-menu-label';
      label.textContent = entry.label;
      const tail = document.createElement('span');
      tail.className = 'ps-menu-shortcut';
      if (entry.submenu) tail.innerHTML = ICONS.submenu;
      else tail.textContent = entry.shortcut ?? '';
      li.append(check, label, tail);
      if (entry.submenu && enabled) {
        li.classList.add('has-submenu');
        li.append(this.build(entry.submenu));
      } else if (enabled && entry.run) {
        const run = entry.run;
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          this.close();
          run();
        });
      }
      list.append(li);
    }
    return list;
  }
}
