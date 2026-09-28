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
 * Shift+D, Ctrl+A).
 */
import { t } from '../../../../core/i18n';
import { type ModifierWarning, modifierWarnings } from '../../modifiers/stack';
import type { Modifier } from '../../modifiers/types';
import {
  AddModifierOp,
  ApplyModifierOp,
  type ApplyReport,
  DuplicateModifierOp,
  MoveModifierOp,
  RemoveModifierOp,
  SetModifierOp,
  applyModifier,
  setModifier,
} from '../../operators/modifiers';
import type { MeshObject } from '../../scene/scene';
import { type MenuItem, attachMenu } from '../menu';
import { ADD_MODIFIER_MENU, searchModifiers } from './add-modifier';
import { MODIFIER_ICONS, TOGGLE_ICONS } from './icons';
import { type PanelContext, modifierWidgets } from './modifier-panels';
import { type TabContext, type TabView, contextPath } from './properties-editor';
import type { Widget } from './widgets';

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
  /** Open subpanels, by "object/modifier/subpanel" (missing: the subpanel's default). */
  const subOpen = new Map<string, boolean>();
  let key = '';
  let object: MeshObject | null = null;
  /** Panel under the pointer, for the shortcuts over panels. */
  let hovered: string | null = null;
  /** What the drawn panels refresh on every change (values, toggles), without rebuilding. */
  let widgets: Widget[] = [];

  const run = (op: Parameters<typeof store.execute>[0]) => store.execute(op);

  /** Apply, with Blender's report (or the lab's) in the status bar. */
  function apply(objectId: string, name: string): void {
    const { report } = applyModifier(store.state, objectId, name);
    if (report !== 'notFirst' && report !== null) {
      ctx.report(applyReportText(report));
      return;
    }
    run(ApplyModifierOp(objectId, name));
    if (report) ctx.report(applyReportText(report));
  }

  /** The modifier as shown now (the preview while a field is dragged). */
  const currentMod = (objectId: string, name: string): Modifier | undefined => {
    const o = store.displayState.objects.find((x) => x.id === objectId);
    return o?.type === 'mesh' ? o.modifiers?.find((m) => m.name === name) : undefined;
  };

  function panelContext(o: MeshObject, mod: Modifier): PanelContext {
    const name = mod.name;
    return {
      mod: () => currentMod(o.id, name) ?? mod,
      set: (patch, label) => run(SetModifierOp(o.id, name, patch, label)),
      preview: (patch) => store.setPreview(patch ? setModifier(store.state, o.id, name, patch) : null),
      objects: () => store.state.objects.filter((x) => x.id !== o.id).map((x) => ({ id: x.id, name: x.name })),
      subpanel: (sub, openByDefault) => {
        const k = `${o.id}/${name}/${sub}`;
        return { get: () => subOpen.get(k) ?? openByDefault, set: (v) => subOpen.set(k, v) };
      },
      report: ctx.report,
    };
  }

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
      update();
    });
    const icon = el('span', 'bl-mod-icon');
    icon.innerHTML = MODIFIER_ICONS[mod.type];
    header.append(arrow, icon, nameField(o, mod));

    const pc = panelContext(o, mod);
    for (const tg of TOGGLES) {
      const b = iconButton('bl-mod-toggle', tg.icon, tg.label);
      b.addEventListener('click', () => pc.set({ [tg.field]: !pc.mod()[tg.field] }, tg.label));
      header.append(b);
      widgets.push({
        element: b,
        update: () => {
          const on = pc.mod()[tg.field];
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        },
      });
    }

    const more = iconButton('bl-mod-more', '▾', 'Modifier options');
    attachMenu(more, () => [
      { label: 'Apply', shortcut: 'Ctrl A', action: () => apply(o.id, mod.name) },
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
    if (open) {
      const content = el('div', 'bl-mod-body');
      for (const w of modifierWidgets(mod.type, pc)) {
        content.append(w.element);
        widgets.push(w);
      }
      box.append(content);
    }
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
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'KeyA') {
      e.preventDefault();
      hovered = null;
      apply(object.id, name);
    } else if (e.shiftKey && !e.ctrlKey && !e.altKey && e.code === 'KeyD') {
      e.preventDefault();
      run(DuplicateModifierOp(object.id, name));
    } else if (!e.shiftKey && !e.ctrlKey && !e.altKey && (e.code === 'KeyX' || e.code === 'Delete')) {
      e.preventDefault();
      hovered = null;
      run(RemoveModifierOp(object.id, name));
    }
  };
  window.addEventListener('keydown', onKey);

  function update(): void {
    // The structure follows the committed state, so dragging a field (a
    // preview) never rebuilds the panel under the pointer.
    const state = store.state;
    const active = state.objects.find((o) => o.id === state.activeId);
    object = active?.type === 'mesh' ? active : null;
    const warnings: ReadonlyMap<string, ModifierWarning> = object ? modifierWarnings(object, state) : new Map();
    const warnKey = [...warnings].map(([n, w]) => `${n}:${w}`).join(',');
    const stack = (object?.modifiers ?? []).map((m) => `${m.type}:${m.name}`).join(',');
    const next = `${active?.id}|${active?.name}|${stack}|${warnKey}`;
    if (next === key) {
      for (const w of widgets) w.update();
      return;
    }
    key = next;
    for (const w of widgets) w.dispose?.();
    widgets = [];
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
    for (const w of widgets) w.update();
  }

  return {
    update,
    dispose: () => {
      window.removeEventListener('keydown', onKey);
      for (const w of widgets) w.dispose?.();
    },
  };
}

/** Blender's reports for Apply (in English, as the program shows them), or the lab's text. FIDELITY? */
function applyReportText(report: ApplyReport): string {
  switch (report) {
    case 'notFirst':
      return 'Applied modifier was not first, result may not be as expected';
    case 'disabled':
      return 'Modifier is disabled, skipping apply';
    case 'editMode':
      return 'Modifiers cannot be applied in edit mode';
    case 'bevelUnsupported':
      return t('lab.bevelModifierUnsupported');
  }
}

/** Lab texts for the stack's warnings. */
const WARNING_KEYS: Record<ModifierWarning, string> = {
  bevelUnsupported: 'lab.bevelModifierUnsupported',
};
