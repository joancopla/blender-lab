/**
 * Properties Editor > Material (Lab 05): the slot list, the material data-block
 * (browse, name, New / copy, unlink) and the Surface panel, which shows the node
 * tree from the Material Output's Surface as Blender's template_node_view does
 * (source/blender/editors/space_node/node_templates.cc, Blender 5.2.1):
 * - a linked input shows the linked node's name and, below, that node's inputs
 *   (at the top level always; deeper, behind an expand arrow);
 * - an unlinked input shows its value, next to a small link button;
 * - inputs without a value field (Normal) and shader inputs show "Default" / "None".
 * Values edited here are the same node values the Shader Editor shows.
 *
 * FIDELITY? The link button's menu (connect any node from here) is not replicated:
 * it only offers Disconnect and Remove for linked inputs.
 */
import { type MeshObject, type SceneState } from '../../scene/scene';
import {
  AddMaterialSlotOp,
  AssignMaterialOp,
  NewMaterialOp,
  RemoveMaterialSlotOp,
  RenameMaterialOp,
  SetActiveSlotOp,
  UnlinkMaterialOp,
  activeSlotMaterial,
} from '../../operators/material';
import * as Ops from '../../operators/material-nodes';
import { type InputDef, type PropDef, type PropValue } from '../../shading/node-types';
import type { SocketValue } from '../../shading/sockets';
import {
  type NodeTree,
  type ShaderNode,
  availableInputs,
  defOf,
  inputValue,
  linkInto,
  linkIsValid,
  nodeById,
  outputNode,
  removeNodes,
  setProp,
  setValue,
} from '../../shading/tree';
import { type MenuItem, attachMenu } from '../menu';
import { NumberField } from '../number-field';
import { type TabContext, type TabView, contextPath } from './properties-editor';
import { activeSlotIndex } from '../../scene/scene';
import { hexToLinear, linearToHex } from './widgets';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const noFocus = (b: HTMLElement) => b.addEventListener('mousedown', (e) => e.preventDefault());
const button = (cls: string, text: string, title?: string) => {
  const b = el('button', cls, text);
  b.type = 'button';
  if (title) b.title = title;
  noFocus(b);
  return b;
};

/** The panels of the Material tab with EEVEE, in Blender 5.2's order (properties_material.py). */
const PANELS = ['Preview', 'Surface', 'Volume', 'Displacement', 'Thickness', 'Settings', 'Line Art', 'Viewport Display', 'Custom Properties'] as const;

/** Socket colours of the link button dot (the Shader Editor's theme). */
const SOCKET_COLORS: Readonly<Record<string, string>> = {
  float: '#a1a1a1',
  vector: '#6363c7',
  color: '#c7c729',
  shader: '#63c763',
  bool: '#cca6d6',
};

interface Refresh {
  update(): void;
  dispose?(): void;
}

export function materialTab(body: HTMLElement, ctx: TabContext): TabView {
  const { store } = ctx;
  /** Linked inputs below the top level that are expanded (SOCK_COLLAPSED off). */
  const expanded = new Set<string>();
  /** Node panels open in this tab (their own UI state, as Blender's layout panels). */
  const openPanels = new Set<string>();
  let refreshers: Refresh[] = [];
  let key = '';

  const object = (s: SceneState = store.displayState): MeshObject | null => {
    const o = s.objects.find((x) => x.id === s.activeId);
    return o?.type === 'mesh' ? o : null;
  };

  const rebuild = () => {
    for (const r of refreshers) r.dispose?.();
    refreshers = [];
    body.replaceChildren();
    const s = store.displayState;
    const o = object(s);
    if (!o) return;
    const mat = activeSlotMaterial(s, o);
    body.append(contextPath(mat ? [o.name, mat.name] : [o.name]));
    body.append(slotList(s, o), idRow(s, o));
    if (!mat) return;
    for (const title of PANELS) {
      const panel = el('div', 'bl-data-panel');
      const header = el('div', 'bl-data-header');
      const working = title === 'Surface';
      header.append(el('span', 'bl-data-arrow', working ? '▾' : '▸'), el('span', undefined, title));
      panel.append(header);
      if (working) {
        const content = el('div', 'bl-mod-body bl-matview');
        surface(content, mat.id, mat.tree);
        panel.append(content);
      } else {
        panel.classList.add('is-inactive');
      }
      body.append(panel);
    }
  };

  /** The slot list (MATERIAL_UL_matslots) with + and − on its right. */
  function slotList(s: SceneState, o: MeshObject): HTMLElement {
    const row = el('div', 'bl-mat-slots');
    const list = el('div', 'bl-mat-slot-list');
    const slots = o.materialSlots ?? [];
    const active = activeSlotIndex(o);
    const rows = Math.max(slots.length > 1 ? 5 : 3, slots.length);
    for (let i = 0; i < rows; i++) {
      const item = el('div', 'bl-mat-slot');
      if (i < slots.length) {
        const id = slots[i];
        const name = id ? (s.materials?.find((m) => m.id === id)?.name ?? '') : '';
        item.append(el('span', 'bl-mat-sphere'), el('span', 'bl-mat-slot-name', name));
        item.classList.toggle('is-active', i === active);
        item.addEventListener('click', () => store.execute(SetActiveSlotOp(o.id, i)));
      }
      list.append(item);
    }
    const tools = el('div', 'bl-mat-slot-tools');
    const add = button('bl-mat-tool', '+', 'Add Material Slot');
    add.addEventListener('click', () => store.execute(AddMaterialSlotOp(o.id)));
    const remove = button('bl-mat-tool', '−', 'Remove Material Slot');
    remove.addEventListener('click', () => store.execute(RemoveMaterialSlotOp(o.id)));
    const specials = button('bl-mat-tool', '⌄', 'Material Specials');
    specials.disabled = true;
    tools.append(add, remove, specials);
    row.append(list, tools);
    return row;
  }

  /** template_ID(ob, "active_material", new="material.new"). */
  function idRow(s: SceneState, o: MeshObject): HTMLElement {
    const row = el('div', 'bl-mat-id');
    const mat = activeSlotMaterial(s, o);
    const browse = button('bl-mat-browse', '', 'Browse Material to be linked');
    browse.append(el('span', 'bl-mat-sphere'));
    attachMenu(browse, () =>
      (store.state.materials ?? []).map((m): MenuItem => ({ label: m.name, action: () => store.execute(AssignMaterialOp(o.id, m.id)) })),
    );
    row.append(browse);
    if (!mat) {
      const create = button('bl-mat-new', 'New', 'Add a new material');
      create.addEventListener('click', () => store.execute(NewMaterialOp(o.id)));
      row.append(create);
      return row;
    }
    const name = el('input', 'bl-mat-name');
    name.value = mat.name;
    name.setAttribute('aria-label', 'Name');
    name.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') name.blur();
      if (e.key === 'Escape') {
        name.value = mat.name;
        name.blur();
      }
    });
    name.addEventListener('change', () => store.execute(RenameMaterialOp(mat.id, name.value)));
    row.append(name);
    const users = s.objects.filter((x) => x.type === 'mesh' && x.materialSlots?.includes(mat.id)).length;
    if (users > 1) row.append(button('bl-mat-users', String(users), 'Number of users'));
    const copy = button('bl-mat-icon', '⧉', 'New Material');
    copy.addEventListener('click', () => store.execute(NewMaterialOp(o.id)));
    const unlink = button('bl-mat-icon', '×', 'Unlink');
    unlink.addEventListener('click', () => store.execute(UnlinkMaterialOp(o.id)));
    row.append(copy, unlink);
    return row;
  }

  // --- Surface: template_node_view ---------------------------------------------------------

  function surface(box: HTMLElement, materialId: string, tree: NodeTree): void {
    const out = outputNode(tree);
    if (!out) {
      box.append(el('p', 'bl-props-note', 'No output node'));
      return;
    }
    const surfaceInput = availableInputs(out).find((i) => i.id === 'Surface')!;
    drawInput(box, materialId, out, surfaceInput, 0, new Set());
  }

  const treeOf = (materialId: string): NodeTree | null => Ops.materialById(store.displayState, materialId)?.tree ?? null;

  /** ui_node_sock_name: the linked node's label ("Label | Socket" for inputs-less nodes with several outputs). */
  function linkName(tree: NodeTree, n: ShaderNode, input: InputDef): string {
    const link = linkInto(tree, { node: n.id, socket: input.id });
    if (link && linkIsValid(tree, link)) {
      const from = nodeById(tree, link.from.node)!;
      const def = defOf(from);
      if (def.inputs.length === 0 && def.outputs.length > 1) {
        return `${def.label} | ${def.outputs.find((x) => x.id === link.from.socket)?.name ?? ''}`;
      }
      return def.label;
    }
    return input.type === 'shader' ? 'None' : 'Default';
  }

  function linkButton(materialId: string, n: ShaderNode, input: InputDef, text: string | null): HTMLElement {
    const b = button(text === null ? 'bl-mat-link is-icon' : 'bl-mat-link', '');
    const dot = el('span', 'bl-mat-link-dot');
    dot.style.background = SOCKET_COLORS[input.type] ?? '#a1a1a1';
    b.append(dot);
    if (text !== null) b.append(el('span', 'bl-mat-link-text', text));
    attachMenu(b, () => {
      const tree = treeOf(materialId);
      const link = tree ? linkInto(tree, { node: n.id, socket: input.id }) : undefined;
      if (!tree || !link) return [{ label: 'Connect nodes in the Shader Editor', disabled: true }];
      const from = link.from.node;
      // Remove: the linked node goes too, unless something else still uses it.
      const usedElsewhere = tree.links.some((l) => l.from.node === from && l.id !== link.id);
      const remove = (t: NodeTree): NodeTree => (usedElsewhere ? { ...t, links: t.links.filter((l) => l.id !== link.id) } : removeNodes(t, [from]));
      return [
        { label: 'Remove', action: () => store.execute(Ops.editTree('Remove', materialId, remove)) },
        { label: 'Disconnect', action: () => store.execute(Ops.unlinkOp(materialId, link.id)) },
      ];
    });
    return b;
  }

  /** ui_node_draw_input */
  function drawInput(box: HTMLElement, materialId: string, n: ShaderNode, input: InputDef, depth: number, visiting: Set<string>): void {
    const tree = treeOf(materialId)!;
    const row = el('div', 'bl-mp-row bl-mat-input');
    const labelCol = el('span', 'bl-mp-label bl-mat-label');
    const control = el('div', 'bl-mat-control');
    row.append(labelCol, control);
    box.append(row);

    const link = linkInto(tree, { node: n.id, socket: input.id });
    let lnode = link && linkIsValid(tree, link) ? nodeById(tree, link.from.node) : undefined;
    const loop = !!lnode && visiting.has(lnode.id);
    if (loop) lnode = undefined;
    const expandKey = `${materialId}:${n.id}:${input.id}`;
    if (depth > 0 && lnode && (availableInputs(lnode).length > 0 || visibleProps(lnode).length > 0)) {
      const arrow = button('bl-mat-expand', expanded.has(expandKey) ? '▾' : '▸');
      arrow.addEventListener('click', () => {
        if (expanded.has(expandKey)) expanded.delete(expandKey);
        else expanded.add(expandKey);
        key = '';
        refresh();
      });
      labelCol.append(arrow);
    }
    labelCol.append(el('span', undefined, input.name));

    if (loop) {
      control.append(el('span', 'bl-mat-error', 'Dependency Loop'));
      return;
    }
    if (lnode) {
      control.append(linkButton(materialId, n, input, linkName(tree, n, input)));
      if (depth === 0 || expanded.has(expandKey)) {
        if (depth === 0) box.append(el('div', 'bl-mat-sep'));
        const inner = new Set(visiting).add(n.id);
        drawNode(box, materialId, lnode, depth, inner);
      }
      return;
    }
    if (input.type === 'shader' || input.hideValue) {
      control.append(linkButton(materialId, n, input, linkName(tree, n, input)));
      return;
    }
    control.append(linkButton(materialId, n, input, null));
    control.append(valueControl(materialId, n.id, input));
  }

  /** Options a node draws at the top (draw_buttons) that the tab can edit. */
  function visibleProps(n: ShaderNode): PropDef[] {
    const def = defOf(n);
    const ids = def.buttons?.(n.props) ?? [];
    return ids.map((id) => def.props.find((p) => p.id === id)).filter((p): p is PropDef => !!p);
  }

  /** ui_node_draw_node: the node's options, root inputs, then its panels. */
  function drawNode(box: HTMLElement, materialId: string, n: ShaderNode, depth: number, visiting: Set<string>): void {
    const def = defOf(n);
    for (const p of visibleProps(n)) box.append(propControl(materialId, n, p));
    const inputs = availableInputs(n);
    for (const input of inputs.filter((i) => !i.panel)) drawInput(box, materialId, n, input, depth + 1, visiting);
    for (const panel of def.panels ?? []) {
      const panelKey = `${materialId}:${n.id}:${panel.name}`;
      const open = panel.defaultClosed ? openPanels.has(panelKey) : !openPanels.has(panelKey);
      const sub = el('div', 'bl-mp-sub');
      const header = el('div', 'bl-mp-sub-header bl-mat-panel-header');
      header.append(el('span', 'bl-mod-arrow', open ? '▾' : '▸'), el('span', 'bl-mp-sub-title', panel.name));
      header.addEventListener('click', () => {
        if (openPanels.has(panelKey)) openPanels.delete(panelKey);
        else openPanels.add(panelKey);
        key = '';
        refresh();
      });
      sub.append(header);
      if (open) {
        const content = el('div', 'bl-mp-sub-body');
        for (const id of def.panelButtons?.[panel.name] ?? []) {
          const p = def.props.find((x) => x.id === id);
          if (p) content.append(propControl(materialId, n, p));
        }
        for (const input of inputs.filter((i) => i.panel === panel.name)) drawInput(content, materialId, n, input, depth + 1, visiting);
        sub.append(content);
      }
      box.append(sub);
    }
  }

  // --- Controls ------------------------------------------------------------------------------

  const preview = (materialId: string, edit: ((t: NodeTree) => NodeTree) | null) =>
    store.setPreview(edit ? Ops.editTree('', materialId, edit).apply(store.state) : null);

  const nodeNow = (materialId: string, nodeId: string) => {
    const t = treeOf(materialId);
    return t ? nodeById(t, nodeId) : undefined;
  };

  function numberControl(get: () => number, onPreview: (v: number | null) => void, commit: (v: number) => void, min?: number, max?: number): HTMLElement {
    const fix = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
    const field = new NumberField({
      label: '',
      format: (v) => fix(v).toFixed(3),
      dragStep: 0.005,
      snapStep: 0.1,
      onPreview: (v) => onPreview(fix(v)),
      onCommit: (v) => commit(fix(v)),
      onCancel: () => onPreview(null),
    });
    refreshers.push({ update: () => field.setValue(get()), dispose: () => field.dispose() });
    return field.element;
  }

  function colorControl(get: () => readonly number[], onPreview: (v: readonly number[]) => void, commit: (v: readonly number[]) => void): HTMLElement {
    const input = el('input', 'bl-mp-color');
    input.type = 'color';
    const toValue = (hex: string) => {
      const c = hexToLinear(hex);
      return [c.x, c.y, c.z, get()[3] ?? 1];
    };
    input.addEventListener('input', () => onPreview(toValue(input.value)));
    input.addEventListener('change', () => commit(toValue(input.value)));
    input.addEventListener('keydown', (e) => e.stopPropagation());
    refreshers.push({
      update: () => {
        if (document.activeElement === input) return;
        const c = get();
        input.value = linearToHex({ x: c[0] ?? 0, y: c[1] ?? 0, z: c[2] ?? 0 });
      },
    });
    return input;
  }

  function checkControl(label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
    const b = button('bl-mp-check', '');
    b.setAttribute('role', 'checkbox');
    const mark = el('span', 'bl-mp-check-box');
    b.append(mark, el('span', undefined, label));
    b.addEventListener('click', () => set(!get()));
    refreshers.push({
      update: () => {
        const on = get();
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', String(on));
        mark.textContent = on ? '✓' : '';
      },
    });
    return b;
  }

  /** The value field of an unlinked input, by socket type. */
  function valueControl(materialId: string, nodeId: string, input: InputDef): HTMLElement {
    const get = () => {
      const n = nodeNow(materialId, nodeId);
      return n ? inputValue(n, input.id) : input.default;
    };
    const commit = (v: SocketValue) => store.execute(Ops.setValueOp(materialId, nodeId, input.id, v));
    const show = (v: SocketValue | null) => preview(materialId, v === null ? null : (t) => setValue(t, nodeId, input.id, v));
    switch (input.type) {
      case 'float':
        return numberControl(() => Number(get() ?? 0), (v) => show(v), commit, input.min, input.max);
      case 'color':
        return colorControl(() => (get() as readonly number[]) ?? [0, 0, 0, 1], (v) => show(v as SocketValue), (v) => commit(v as SocketValue));
      case 'bool':
        return checkControl('', () => !!get(), (v) => commit(v));
      case 'vector': {
        const col = el('div', 'bl-mat-vector');
        for (let k = 0; k < 3; k++) {
          const part = (v: number) => {
            const cur = [...((get() as readonly number[]) ?? [0, 0, 0])];
            cur[k] = v;
            return cur as unknown as SocketValue;
          };
          col.append(
            numberControl(
              () => ((get() as readonly number[]) ?? [0, 0, 0])[k] ?? 0,
              (v) => show(v === null ? null : part(v)),
              (v) => commit(part(v)),
              input.min,
              input.max,
            ),
          );
        }
        return col;
      }
      default:
        return el('span');
    }
  }

  /** A node option: a drop-down for enums, a checkbox, or the RGB / Value node's own value. */
  function propControl(materialId: string, n: ShaderNode, p: PropDef): HTMLElement {
    const get = () => nodeNow(materialId, n.id)?.props[p.id];
    const commit = (v: PropValue) => store.execute(Ops.setPropOp(materialId, n.id, p.id, v));
    const row = el('div', 'bl-mp-row');
    const label = el('span', 'bl-mp-label', '');
    row.append(label);
    if (p.options) {
      const b = button('bl-mp-dropdown', '');
      attachMenu(b, () => p.options!.map((opt): MenuItem => ({ label: p.labels?.[opt] ?? opt, action: () => commit(opt) })));
      refreshers.push({ update: () => (b.textContent = p.labels?.[String(get())] ?? String(get())) });
      row.append(b);
    } else if (typeof p.default === 'boolean') {
      row.append(checkControl(p.label ?? p.id, () => !!get(), (v) => commit(v)));
    } else if (p.id === 'color' && Array.isArray(p.default)) {
      row.append(
        colorControl(
          () => (get() as readonly number[]) ?? [0, 0, 0, 1],
          (v) => preview(materialId, (t) => setProp(t, n.id, p.id, v as PropValue)),
          (v) => commit(v as PropValue),
        ),
      );
    } else if (p.id === 'value') {
      row.append(numberControl(() => Number(get() ?? 0), (v) => preview(materialId, v === null ? null : (t) => setProp(t, n.id, p.id, v)), (v) => commit(v)));
    } else {
      // Color Ramp, Image, Object, UV Map: edited in the Shader Editor in this lab.
      row.append(el('span', 'bl-mat-note', '—'));
    }
    return row;
  }

  // --- Refresh --------------------------------------------------------------------------------

  /** What the drawing depends on: values are left out, so a dragged field is never rebuilt. */
  function structureKey(): string {
    const s = store.displayState;
    const o = object(s);
    if (!o) return 'none';
    const mat = activeSlotMaterial(s, o);
    const slots = (o.materialSlots ?? []).map((id) => (id ? `${id}=${s.materials?.find((m) => m.id === id)?.name}` : '-'));
    const tree = mat?.tree;
    const nodes = tree?.nodes.map((n) => `${n.id}:${n.type}:${n.muted}:${JSON.stringify(n.props, (k, v) => (k === 'color' || k === 'value' || k === 'color_ramp' ? undefined : v))}`);
    const links = tree?.links.map((l) => `${l.from.node}.${l.from.socket}>${l.to.node}.${l.to.socket}`);
    const users = mat ? s.objects.filter((x) => x.type === 'mesh' && x.materialSlots?.includes(mat.id)).length : 0;
    return JSON.stringify([o.id, o.name, activeSlotIndex(o), slots, mat?.id, mat?.name, users, nodes, links, [...expanded], [...openPanels]]);
  }

  function refresh(): void {
    const k = structureKey();
    if (k !== key) {
      key = k;
      rebuild();
    }
    for (const r of refreshers) r.update();
  }

  return {
    update: () => refresh(),
    dispose: () => {
      for (const r of refreshers) r.dispose?.();
    },
  };
}
