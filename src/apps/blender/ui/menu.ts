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
      /** Shown greyed out (entries outside the lab's scope). */
      readonly disabled?: boolean;
      readonly action?: () => void;
      readonly submenu?: readonly MenuItem[];
    };

let openMenu: { close(): void } | null = null;

/**
 * Time a submenu stays open while the pointer crosses other rows on its way to
 * it (a diagonal move), as Blender waits before switching submenus.
 */
const SUBMENU_DELAY_MS = 300;

function build(items: readonly MenuItem[], close: () => void): HTMLDivElement {
  const list = document.createElement('div');
  list.className = 'bl-menu-list';
  list.setAttribute('role', 'menu');
  // The open submenu of this list, and a pending switch to another row.
  let openRow: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = (row: HTMLElement | null) => {
    clearTimeout(timer);
    if (row === openRow) return;
    openRow?.classList.remove('is-open');
    openRow = row;
    if (row) {
      row.classList.add('is-open');
      fitSubmenu(row, row.querySelector(':scope > .bl-menu-list')!);
    }
  };
  /** Opens at once when nothing is open; otherwise after the delay. */
  const hoverRow = (row: HTMLElement | null) => {
    clearTimeout(timer);
    if (row === openRow) return;
    if (!openRow) show(row);
    else timer = setTimeout(() => show(row), SUBMENU_DELAY_MS);
  };
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
    if (item.submenu && !item.disabled) {
      row.classList.add('has-submenu');
      const sub = build(item.submenu, close);
      row.append(sub);
      row.addEventListener('pointerenter', () => hoverRow(row));
      // Reaching the submenu cancels a pending switch.
      sub.addEventListener('pointerenter', () => clearTimeout(timer));
    } else {
      row.addEventListener('pointerenter', () => hoverRow(null));
    }
    if (item.disabled) {
      row.classList.add('is-disabled');
    } else if (!item.submenu) {
      row.addEventListener('click', () => {
        close();
        item.action?.();
      });
    }
    list.append(row);
  }
  return list;
}

/**
 * Keeps a submenu inside the replica, as Blender does near the window edges:
 * it opens to the left when there is no room on the right, and moves up when
 * it would go past the bottom.
 */
function fitSubmenu(row: HTMLElement, sub: HTMLElement): void {
  sub.classList.remove('opens-left');
  sub.style.top = '';
  const bounds = (row.closest('.bl-app') ?? document.documentElement).getBoundingClientRect();
  const r = sub.getBoundingClientRect();
  if (r.right > bounds.right) sub.classList.add('opens-left');
  const below = r.bottom - bounds.bottom;
  if (below > 0) sub.style.top = `${-5 - Math.min(below + 4, r.top - bounds.top)}px`;
}

/** Moves a menu placed in `host` back inside it when it goes past the right or bottom edge. */
function keepInside(list: HTMLElement, host: Element): void {
  const hr = host.getBoundingClientRect();
  const r = list.getBoundingClientRect();
  if (r.right > hr.right) list.style.left = `${Math.max(0, parseFloat(list.style.left) - (r.right - hr.right) - 4)}px`;
  if (r.bottom > hr.bottom) list.style.top = `${Math.max(0, parseFloat(list.style.top) - (r.bottom - hr.bottom) - 4)}px`;
}

export interface MenuOptions {
  /**
   * Type to search, as in Blender's menus: while the menu is open, typed
   * letters filter it and the results replace the items.
   */
  readonly search?: (query: string) => readonly MenuItem[];
}

/** Turns a header label into a drop-down menu. `items` is read each time it opens. */
export function attachMenu(anchor: HTMLElement, items: () => readonly MenuItem[], options: MenuOptions = {}): void {
  anchor.classList.add('is-interactive');
  const open = () => {
    openMenu?.close();
    const host = anchor.closest('.bl-app') ?? document.body;
    let list = build(items(), () => close());
    let query = '';
    const place = () => {
      list.classList.add('bl-menu-dropdown');
      const r = anchor.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      list.style.left = `${r.left - hr.left}px`;
      list.style.top = `${r.bottom - hr.top + 2}px`;
      host.append(list);
      keepInside(list, host);
    };
    place();
    anchor.classList.add('is-open');
    const showSearch = () => {
      const next = build(query ? options.search!(query) : items(), () => close());
      if (query) {
        const field = document.createElement('div');
        field.className = 'bl-menu-search';
        field.textContent = query;
        next.prepend(field);
      }
      list.remove();
      list = next;
      place();
    };
    const onDown = (e: PointerEvent) => {
      if (!list.contains(e.target as Node) && e.target !== anchor) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (!options.search || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace' || (e.key.length === 1 && e.key !== ' ') || (e.key === ' ' && query)) {
        // The keys go to the search, not to the viewport or the page.
        e.stopPropagation();
        e.preventDefault();
        query = e.key === 'Backspace' ? query.slice(0, -1) : query + e.key;
        showSearch();
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

/**
 * Pop-up menu at a point (X Delete, M Merge...), with an optional title like
 * Blender's call menus. Closes on click outside or Esc.
 */
export function openMenuAt(host: HTMLElement, x: number, y: number, items: readonly MenuItem[], title?: string): void {
  openMenu?.close();
  const close = () => {
    list.remove();
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('keydown', onKey, true);
    if (openMenu === handle) openMenu = null;
  };
  const list = build(items, close);
  list.classList.add('bl-menu-dropdown', 'bl-menu-popup');
  if (title) {
    const t = document.createElement('div');
    t.className = 'bl-menu-title';
    t.textContent = title;
    list.prepend(t);
  }
  list.style.left = `${x}px`;
  list.style.top = `${y}px`;
  host.append(list);
  keepInside(list, host);
  const onDown = (e: PointerEvent) => {
    if (!list.contains(e.target as Node)) close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  const handle = { close };
  openMenu = handle;
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('keydown', onKey, true);
}
