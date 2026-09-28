/**
 * Properties Editor > Modifiers: Add Modifier and one panel per modifier of
 * the active object, in stack order. The header of each panel has, as in
 * Blender: expand arrow, icon, editable name, Edit Mode / Realtime / Render
 * toggles, a drop-down (Apply, Duplicate, Move to First / Last), delete and a
 * grip to drag it to another place in the stack.
 *
 * Every change goes through an operator (Ctrl+Z works). Whether a panel is
 * expanded is only kept here, as UI state.
 * FIDELITY? Header layout and tooltips; the shortcuts over a panel (X / Delete,
 * Shift+D).
 */
import { t } from '../../../../core/i18n';
import { type ModifierWarning, modifierWarnings } from '../../modifiers/stack';
import type { Modifier } from '../../modifiers/types';
import {
  AddModifierOp,
  DuplicateModifierOp,
  MoveModifierOp,
  RemoveModifierOp,
  SetModifierOp,
} from '../../operators/modifiers';
import type { MeshObject, SceneState } from '../../scene/scene';
import { type MenuItem, attachMenu } from '../menu';
import { ADD_MODIFIER_MENU, searchModifiers } from './add-modifier';
import { MODIFIER_ICONS, TOGGLE_ICONS } from './icons';
import { type TabContext, type TabView, contextPath } from './properties-editor';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function iconButton(cls: string, svg: string, title: string): HTMLButtonElement {
  const b = el('button', cls);
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = svg;
  // Keep keyboard focus off buttons: Enter or Space later would press them again.
  b.addEventListener('mousedown', (e) => e.preventDefault());
  return b;
}

const isTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Header toggles: field, label (tooltip and undo name). FIDELITY? Tooltips. */
const TOGGLES = [
  { field: 'showInEditMode', label: 'Edit Mode', icon: TOGGLE_ICONS.editMode },
  { field: 'showViewport', label: 'Realtime', icon: TOGGLE_ICONS.realtime },
  { field: 'showRender', label: 'Render', icon: TOGGLE_ICONS.render },
] as const;

export function modifiersTab(body: HTMLElement, ctx: TabContext): TabView {
  const { store } = ctx;
  /** Collapsed panels, by "object/modifier". */
  const collapsed = new Set<string>();
  let key = '';
  let object: MeshObject | null = null;
  /** Panel under the pointer, for the shortcuts over panels. */
  let hovered: string | null = null;

  const run = (op: Parameters<typeof store.execute>[0]) => store.execute(op);

  function addMenuItems(o: MeshObject): MenuItem[] {
    return ADD_MODIFIER_MENU.map((c) => ({
      label: c.label,
      submenu: c.entries.map((e) =>
        e.type ? { label: e.label, action: () => run(AddModifierOp(o.id, e.type!)) } : { label: e.label, disabled: true },
      ),
    }));
  }

  function searchItems(o: MeshObject, query: string): MenuItem[] {
    const found = searchModifiers(query);
    if (found.length === 0) return [{ label: t('lab.noResults'), disabled: true }];
    return found.map(({ category, entry }) => ({
      label: `${category} ▸ ${entry.label}`,
      ...(entry.type ? { action: () => run(AddModifierOp(o.id, entry.type!)) } : { disabled: true }),
    }));
  }

  function nameField(o: MeshObject, mod: Modifier): HTMLInputElement {
    const input = el('input', 'bl-mod-name');
    input.type = 'text';
    input.value = mod.name;
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Name');
    const commit = () => {
      const value = input.value.trim();
      if (value && value !== mod.name) run(SetModifierOp(o.id, mod.name, { name: value }, 'Name'));
      else input.value = mod.name;
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        input.value = mod.name;
        input.blur();
      }
      e.stopPropagation();
    });
    input.addEventListener('blur', commit);
    return input;
  }

  function panel(o: MeshObject, mod: Modifier, index: number, count: number, warning: string | null): HTMLElement {
    const id = `${o.id}/${mod.name}`;
    const open = !collapsed.has(id);
    const box = el('div', 'bl-mod-panel');
    box.dataset.name = mod.name;
    box.addEventListener('pointerenter', () => (hovered = mod.name));
    box.addEventListener('pointerleave', () => hovered === mod.name && (hovered = null));

    const header = el('div', 'bl-mod-header');
    const arrow = iconButton('bl-mod-arrow', open ? '▾' : '▸', open ? 'Collapse' : 'Expand');
    arrow.addEventListener('click', () => {
      if (open) collapsed.add(id);
      else collapsed.delete(id);
      key = '';
      update(store.displayState);
    });
    const icon = el('span', 'bl-mod-icon');
    icon.innerHTML = MODIFIER_ICONS[mod.type];
    header.append(arrow, icon, nameField(o, mod));

    for (const tg of TOGGLES) {
      const on = mod[tg.field];
      const b = iconButton('bl-mod-toggle', tg.icon, tg.label);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.addEventListener('click', () => run(SetModifierOp(o.id, mod.name, { [tg.field]: !on }, tg.label)));
      header.append(b);
    }

    const more = iconButton('bl-mod-more', '▾', 'Modifier options');
    attachMenu(more, () => [
      { label: 'Apply', shortcut: 'Ctrl A', disabled: true },
      { label: 'Duplicate', shortcut: 'Shift D', action: () => run(DuplicateModifierOp(o.id, mod.name)) },
      { label: 'Copy to Selected', disabled: true },
      'separator',
      { label: 'Move to First', disabled: index === 0, action: () => run(MoveModifierOp(o.id, mod.name, 0)) },
      { label: 'Move to Last', disabled: index === count - 1, action: () => run(MoveModifierOp(o.id, mod.name, count - 1)) },
    ]);
    const remove = iconButton('bl-mod-remove', '×', 'Delete');
    remove.addEventListener('click', () => run(RemoveModifierOp(o.id, mod.name)));
    const grip = el('span', 'bl-mod-grip', '⠿');
    grip.title = 'Drag';
    grip.addEventListener('pointerdown', (e) => startDrag(e, o, mod.name, box));
    header.append(more, remove, grip);

    box.append(header);
    if (warning) box.append(el('p', 'bl-mod-warning', warning));
    if (open) box.append(el('div', 'bl-mod-body'));
    return box;
  }

  /** Drag a panel by its grip; on release it moves to where the line is shown. */
  function startDrag(e: PointerEvent, o: MeshObject, name: string, box: HTMLElement): void {
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    grip.setPointerCapture(e.pointerId);
    const others = [...body.querySelectorAll<HTMLElement>('.bl-mod-panel')].filter((p) => p !== box);
    box.classList.add('is-dragging');
    let target = -1;
    const mark = (y: number) => {
      target = others.filter((p) => {
        const r = p.getBoundingClientRect();
        return r.top + r.height / 2 < y;
      }).length;
      others.forEach((p, i) => {
        p.classList.toggle('is-drop-before', i === target);
        p.classList.toggle('is-drop-after', i === others.length - 1 && target === others.length);
      });
    };
    const move = (ev: PointerEvent) => mark(ev.clientY);
    const end = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      box.classList.remove('is-dragging');
      for (const p of others) p.classList.remove('is-drop-before', 'is-drop-after');
      if (target >= 0) run(MoveModifierOp(o.id, name, target));
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  const onKey = (e: KeyboardEvent) => {
    if (!hovered || !object || isTextField(e.target)) return;
    const name = hovered;
    if (e.shiftKey && !e.ctrlKey && !e.altKey && e.code === 'KeyD') {
      e.preventDefault();
      run(DuplicateModifierOp(object.id, name));
    } else if (!e.shiftKey && !e.ctrlKey && !e.altKey && (e.code === 'KeyX' || e.code === 'Delete')) {
      e.preventDefault();
      hovered = null;
      run(RemoveModifierOp(object.id, name));
    }
  };
  window.addEventListener('keydown', onKey);

  function update(state: SceneState): void {
    const active = state.objects.find((o) => o.id === state.activeId);
    object = active?.type === 'mesh' ? active : null;
    const warnings: ReadonlyMap<string, ModifierWarning> = object ? modifierWarnings(object, state) : new Map();
    const warnKey = [...warnings].map(([n, w]) => `${n}:${w}`).join(',');
    // Redrawn only when the object, its stack or its warnings change.
    const next = `${active?.id}|${active?.name}|${object ? stackId(object) : ''}|${warnKey}`;
    if (next === key) return;
    key = next;
    body.replaceChildren(contextPath([active?.name ?? '']));
    if (!object) return;
    const o = object;
    const add = el('button', 'bl-props-add', 'Add Modifier');
    add.type = 'button';
    add.addEventListener('mousedown', (e) => e.preventDefault());
    attachMenu(add, () => addMenuItems(o), { search: (q) => searchItems(o, q) });
    body.append(add);
    const mods = o.modifiers ?? [];
    mods.forEach((mod, i) => {
      const w = warnings.get(mod.name);
      body.append(panel(o, mod, i, mods.length, w ? t(WARNING_KEYS[w]) : null));
    });
  }

  return {
    update,
    dispose: () => window.removeEventListener('keydown', onKey),
  };
}

/** Lab texts for the stack's warnings. */
const WARNING_KEYS: Record<ModifierWarning, string> = {
  bevelUnsupported: 'lab.bevelModifierUnsupported',
};

/** A number that changes whenever the stack array changes (it is immutable). */
const stackIds = new WeakMap<object, number>();
let nextStackId = 1;
function stackId(o: MeshObject): number {
  const mods = o.modifiers ?? EMPTY;
  let id = stackIds.get(mods);
  if (id === undefined) {
    id = nextStackId++;
    stackIds.set(mods, id);
  }
  return id;
}
const EMPTY: readonly Modifier[] = [];
