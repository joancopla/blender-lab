/**
 * Header drop-down menus (View, Select). Only the entries this lab needs, with
 * Blender's labels and shortcuts.
 * FIDELITY? Blender's menus have many more entries; order and shortcut text to check.
 */
export type MenuItem =
  | 'separator'
  | {
      readonly label: string;
      readonly shortcut?: string;
      readonly checked?: () => boolean;
      readonly action?: () => void;
      readonly submenu?: readonly MenuItem[];
    };

let openMenu: { close(): void } | null = null;

function build(items: readonly MenuItem[], close: () => void): HTMLDivElement {
  const list = document.createElement('div');
  list.className = 'bl-menu-list';
  list.setAttribute('role', 'menu');
  for (const item of items) {
    if (item === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'bl-menu-sep';
      list.append(sep);
      continue;
    }
    const row = document.createElement('div');
    row.className = 'bl-menu-item';
    row.setAttribute('role', 'menuitem');
    const check = document.createElement('span');
    check.className = 'bl-menu-check';
    if (item.checked) check.textContent = item.checked() ? '☑' : '☐';
    const label = document.createElement('span');
    label.className = 'bl-menu-label';
    label.textContent = item.label;
    const shortcut = document.createElement('span');
    shortcut.className = 'bl-menu-shortcut';
    shortcut.textContent = item.submenu ? '▸' : (item.shortcut ?? '');
    row.append(check, label, shortcut);
    if (item.submenu) {
      row.classList.add('has-submenu');
      row.append(build(item.submenu, close));
    } else {
      row.addEventListener('click', () => {
        close();
        item.action?.();
      });
    }
    list.append(row);
  }
  return list;
}

/** Turns a header label into a drop-down menu. `items` is read each time it opens. */
export function attachMenu(anchor: HTMLElement, items: () => readonly MenuItem[]): void {
  anchor.classList.add('is-interactive');
  const open = () => {
    openMenu?.close();
    const list = build(items(), () => close());
    list.classList.add('bl-menu-dropdown');
    const r = anchor.getBoundingClientRect();
    const host = anchor.closest('.bl-app') ?? document.body;
    const hr = host.getBoundingClientRect();
    list.style.left = `${r.left - hr.left}px`;
    list.style.top = `${r.bottom - hr.top + 2}px`;
    host.append(list);
    anchor.classList.add('is-open');
    const onDown = (e: PointerEvent) => {
      if (!list.contains(e.target as Node) && e.target !== anchor) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const close = () => {
      list.remove();
      anchor.classList.remove('is-open');
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      if (openMenu === handle) openMenu = null;
    };
    const handle = { close };
    openMenu = handle;
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return close;
  };
  anchor.addEventListener('click', () => {
    if (anchor.classList.contains('is-open')) openMenu?.close();
    else open();
  });
  // Moving to another header menu while one is open switches to it, as in Blender.
  anchor.addEventListener('pointerenter', () => {
    if (openMenu && !anchor.classList.contains('is-open')) open();
  });
}
