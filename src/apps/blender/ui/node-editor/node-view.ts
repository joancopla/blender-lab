/**
 * One node of the Shader Editor, drawn as in Blender 5.2: coloured header with
 * the collapse arrow, outputs, the node's options, inputs (value fields for
 * unlinked ones) and the Principled BSDF panels. Built once per structure and
 * refreshed with update(), so a field being dragged is never rebuilt.
 */
import { type ColorRampData, type InputDef, type NodeTypeDef, type PropDef, type PropValue } from '../../shading/node-types';
import type { Color, SocketValue, Vector } from '../../shading/sockets';
import { type ShaderNode, availableInputs, availableOutputs, defOf, inputValue } from '../../shading/tree';
import { type MenuItem, attachMenu } from '../menu';
import { NumberField } from '../number-field';
import { hexToLinear, linearToHex } from '../properties/widgets';
import { NODE_CLASS_COLORS, SOCKET_COLORS } from './node-theme';
import type { P } from './link-geometry';

export interface NodeViewCallbacks {
  /** A value being dragged (null: back to the committed state) and committed. */
  previewValue(nodeId: string, socket: string, v: SocketValue | null): void;
  commitValue(nodeId: string, socket: string, v: SocketValue): void;
  previewProp(nodeId: string, prop: string, v: PropValue | null): void;
  commitProp(nodeId: string, prop: string, v: PropValue): void;
  togglePanel(nodeId: string, panel: string): void;
  toggleCollapse(nodeId: string): void;
  /** Objects for the Texture Coordinate object field. */
  objects(): readonly { id: string; name: string }[];
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const fmt = (v: number) => v.toFixed(3);
const HEADER_H = 20;

interface Updatable {
  update(n: ShaderNode): void;
  dispose?(): void;
}

export class NodeView {
  readonly element: HTMLDivElement;
  /** What the DOM was built from; a different one means rebuild. */
  readonly signature: string;
  private readonly sockets = new Map<string, HTMLElement>();
  /** Socket centres relative to the node's top-left (measured after it is in the page). */
  private positions = new Map<string, P>();
  private readonly parts: Updatable[] = [];
  /** Inputs hidden in a closed panel: their links end at the panel header. */
  private readonly panelOf = new Map<string, HTMLElement>();
  /** The node as last given to update() (widgets read their value from it). */
  private nodeRef!: ShaderNode;

  constructor(
    node: ShaderNode,
    readonly linkedInputs: ReadonlySet<string>,
    readonly linkedOutputs: ReadonlySet<string>,
    private readonly cb: NodeViewCallbacks,
  ) {
    this.signature = NodeView.signatureOf(node, linkedInputs, linkedOutputs);
    const def = defOf(node);
    const root = el('div', 'ne-node');
    root.dataset.node = node.id;
    root.style.width = `${def.width ?? 140}px`;
    root.style.setProperty('--ne-header', NODE_CLASS_COLORS[def.nodeClass]);
    root.classList.toggle('is-muted', node.muted);
    root.classList.toggle('is-collapsed', node.collapsed);
    this.element = root;

    const header = el('div', 'ne-header');
    const arrow = el('button', 'ne-collapse ne-widget', node.collapsed ? '▸' : '▾');
    arrow.type = 'button';
    arrow.setAttribute('aria-label', 'Collapse');
    arrow.addEventListener('click', () => cb.toggleCollapse(node.id));
    header.append(arrow, el('span', 'ne-title', node.name === def.label ? def.label : node.name));
    root.append(header);

    const inputs = availableInputs(node).filter((s) => !node.hideUnused || linkedInputs.has(s.id));
    const outputs = availableOutputs(node).filter((s) => !node.hideUnused || linkedOutputs.has(s.id));

    if (node.collapsed) {
      // Collapsed: every socket sits on the header's edge.
      for (const o of outputs) header.append(this.socket('out', o.id, o.type, 'ne-socket-collapsed'));
      for (const i of inputs) header.append(this.socket('in', i.id, i.type, 'ne-socket-collapsed'));
      return;
    }

    const body = el('div', 'ne-body');
    root.append(body);
    for (const o of outputs) {
      const row = el('div', 'ne-row ne-row-out');
      row.append(el('span', 'ne-label', o.name), this.socket('out', o.id, o.type));
      body.append(row);
    }
    for (const prop of def.buttons?.(node.props) ?? []) body.append(this.button(node, def, prop));

    // Inputs outside panels, then each panel with its own.
    const free = inputs.filter((s) => !s.panel);
    for (const s of free) body.append(this.inputRow(node, s));
    for (const panel of def.panels ?? []) {
      const own = inputs.filter((s) => s.panel === panel.name);
      if (own.length === 0 && node.hideUnused) continue;
      const open = node.openPanels.includes(panel.name);
      const head = el('button', 'ne-panel ne-widget');
      head.type = 'button';
      head.append(el('span', 'ne-panel-arrow', open ? '▾' : '▸'), el('span', undefined, panel.name));
      head.addEventListener('click', () => cb.togglePanel(node.id, panel.name));
      body.append(head);
      if (open) {
        for (const prop of def.panelButtons?.[panel.name] ?? []) body.append(this.button(node, def, prop));
        for (const s of own) body.append(this.inputRow(node, s));
      } else {
        for (const s of own) this.panelOf.set(s.id, head);
      }
    }
    this.update(node);
  }

  static signatureOf(n: ShaderNode, linkedIn: ReadonlySet<string>, linkedOut: ReadonlySet<string>): string {
    // Values are not part of it: they only refresh the fields.
    const props = defOf(n).buttons ? JSON.stringify(n.props, (k, v) => (k === 'color_ramp' || k === 'color' || k === 'value' ? undefined : v)) : '';
    return JSON.stringify([n.type, n.name, props, n.collapsed, n.hideUnused, n.muted, n.openPanels, [...linkedIn].sort(), [...linkedOut].sort()]);
  }

  update(n: ShaderNode): void {
    this.nodeRef = n;
    for (const p of this.parts) p.update(n);
  }

  dispose(): void {
    for (const p of this.parts) p.dispose?.();
  }

  /** Measures socket centres; call once the node is in the page. */
  measure(): void {
    this.positions = new Map();
    const origin = this.element.getBoundingClientRect();
    const scale = origin.width / this.element.offsetWidth || 1;
    const at = (e: HTMLElement): P => {
      const r = e.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - origin.left) / scale, y: (r.top + r.height / 2 - origin.top) / scale };
    };
    for (const [key, e] of this.sockets) this.positions.set(key, at(e));
    for (const [id, head] of this.panelOf) this.positions.set(`in:${id}`, { x: 0, y: at(head).y });
  }

  /** Where a link meets this node (relative to its top-left). */
  socketPosition(side: 'in' | 'out', socket: string): P {
    return this.positions.get(`${side}:${socket}`) ?? { x: side === 'in' ? 0 : this.element.offsetWidth, y: HEADER_H / 2 };
  }

  // --- Parts -----------------------------------------------------------------------

  private socket(side: 'in' | 'out', id: string, type: keyof typeof SOCKET_COLORS, extra = ''): HTMLElement {
    const s = el('span', `ne-socket ne-socket-${side} ${extra}`.trim());
    s.dataset.side = side;
    s.dataset.socket = id;
    s.style.setProperty('--ne-socket', SOCKET_COLORS[type]);
    this.sockets.set(`${side}:${id}`, s);
    return s;
  }

  private inputRow(node: ShaderNode, s: InputDef): HTMLElement {
    const row = el('div', 'ne-row ne-row-in');
    row.append(this.socket('in', s.id, s.type));
    const linked = this.linkedInputs.has(s.id);
    if (linked || s.hideValue || s.type === 'shader') {
      row.append(el('span', 'ne-label', s.name));
      return row;
    }
    if (s.type === 'float') row.append(this.numberField(node.id, s));
    else if (s.type === 'color') row.append(this.colorField(node.id, s, true));
    else if (s.type === 'vector') {
      row.classList.add('ne-row-vector');
      row.append(el('span', 'ne-label', s.name));
      const col = el('div', 'ne-vector ne-widget');
      for (const axis of [0, 1, 2]) col.append(this.vectorField(node.id, s, axis));
      row.append(col);
    } else if (s.type === 'bool') row.append(this.check(s.name, () => inputValue(this.nodeRef, s.id) === true, (v) => this.cb.commitValue(node.id, s.id, v)));
    return row;
  }

  private numberField(nodeId: string, s: InputDef): HTMLElement {
    const span = (s.max ?? 10) - (s.min ?? 0);
    const field = new NumberField({
      label: s.name,
      format: fmt,
      dragStep: s.factor ? span / 200 : 0.01,
      snapStep: s.factor ? 0.1 : 1,
      onPreview: (v) => this.cb.previewValue(nodeId, s.id, v),
      onCommit: (v) => this.cb.commitValue(nodeId, s.id, v),
      onCancel: () => this.cb.previewValue(nodeId, s.id, null),
    });
    field.element.classList.add('ne-widget', 'ne-field');
    if (s.factor) field.element.classList.add('is-factor');
    this.parts.push({
      update: (n) => {
        const v = inputValue(n, s.id) as number;
        field.setValue(v);
        if (s.factor) field.element.style.setProperty('--ne-fill', `${Math.max(0, Math.min(1, (v - (s.min ?? 0)) / span)) * 100}%`);
      },
      dispose: () => field.dispose(),
    });
    return field.element;
  }

  private vectorField(nodeId: string, s: InputDef, axis: number): HTMLElement {
    const field = new NumberField({
      label: ['X', 'Y', 'Z'][axis]!,
      format: s.id === 'Rotation' ? (v) => `${((v * 180) / Math.PI).toFixed(0)}°` : fmt,
      dragStep: 0.01,
      snapStep: 1,
      onPreview: (v) => this.cb.previewValue(nodeId, s.id, this.withAxis(s.id, axis, v)),
      onCommit: (v) => this.cb.commitValue(nodeId, s.id, this.withAxis(s.id, axis, v)),
      onCancel: () => this.cb.previewValue(nodeId, s.id, null),
    });
    field.element.classList.add('ne-field');
    this.parts.push({ update: (n) => field.setValue((inputValue(n, s.id) as Vector)[axis]!), dispose: () => field.dispose() });
    return field.element;
  }

  private withAxis(socket: string, axis: number, v: number): Vector {
    const cur = [...(inputValue(this.nodeRef, socket) as Vector)] as [number, number, number];
    cur[axis] = v;
    return cur;
  }

  private colorField(nodeId: string, s: InputDef, withLabel: boolean): HTMLElement {
    const wrap = el('label', 'ne-color ne-widget');
    if (withLabel) wrap.append(el('span', 'ne-label', s.name));
    const input = el('input', 'ne-swatch');
    input.type = 'color';
    input.setAttribute('aria-label', s.name);
    const toColor = (hex: string): Color => {
      const c = hexToLinear(hex);
      return [c.x, c.y, c.z, 1];
    };
    input.addEventListener('input', () => this.cb.previewValue(nodeId, s.id, toColor(input.value)));
    input.addEventListener('change', () => this.cb.commitValue(nodeId, s.id, toColor(input.value)));
    input.addEventListener('keydown', (e) => e.stopPropagation());
    wrap.append(input);
    this.parts.push({
      update: (n) => {
        const c = inputValue(n, s.id) as Color;
        if (document.activeElement !== input) input.value = linearToHex({ x: c[0], y: c[1], z: c[2] });
      },
    });
    return wrap;
  }

  private check(label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
    const b = el('button', 'ne-check ne-widget');
    b.type = 'button';
    b.setAttribute('role', 'checkbox');
    const mark = el('span', 'ne-check-box');
    b.append(mark, el('span', undefined, label));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => set(!get()));
    this.parts.push({
      update: () => {
        const on = get();
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', String(on));
        mark.textContent = on ? '✓' : '';
      },
    });
    return b;
  }

  /** One of the node's options (draw_buttons). */
  private button(node: ShaderNode, def: NodeTypeDef, propId: string): HTMLElement {
    const prop = def.props.find((p) => p.id === propId)!;
    if (prop.options) return this.dropdown(node.id, prop);
    if (typeof prop.default === 'boolean') return this.check(prop.label ?? prop.id, () => this.nodeRef.props[prop.id] === true, (v) => this.cb.commitProp(node.id, prop.id, v));
    if (propId === 'color_ramp') return this.ramp(node.id);
    if (propId === 'color') return this.colorProp(node.id);
    if (propId === 'value') return this.valueProp(node.id);
    if (propId === 'object') return this.objectProp(node.id);
    // Image and UV Map: not part of this phase (textures arrive with the stages).
    const stub = el('div', 'ne-stub', propId === 'image' ? 'Open' : '');
    stub.title = propId;
    return stub;
  }

  private dropdown(nodeId: string, prop: PropDef): HTMLElement {
    const b = el('button', 'ne-dropdown ne-widget');
    b.type = 'button';
    b.addEventListener('mousedown', (e) => e.preventDefault());
    attachMenu(b, () => (prop.options ?? []).map((o): MenuItem => ({ label: prop.labels?.[o] ?? o, action: () => this.cb.commitProp(nodeId, prop.id, o) })));
    this.parts.push({ update: (n) => (b.textContent = prop.labels?.[String(n.props[prop.id])] ?? String(n.props[prop.id])) });
    return b;
  }

  private colorProp(nodeId: string): HTMLElement {
    const input = el('input', 'ne-swatch ne-swatch-big ne-widget');
    input.type = 'color';
    input.setAttribute('aria-label', 'Color');
    const toColor = (): Color => {
      const c = hexToLinear(input.value);
      return [c.x, c.y, c.z, 1];
    };
    input.addEventListener('input', () => this.cb.previewProp(nodeId, 'color', toColor()));
    input.addEventListener('change', () => this.cb.commitProp(nodeId, 'color', toColor()));
    input.addEventListener('keydown', (e) => e.stopPropagation());
    this.parts.push({
      update: (n) => {
        const c = n.props.color as Color;
        if (document.activeElement !== input) input.value = linearToHex({ x: c[0], y: c[1], z: c[2] });
      },
    });
    return input;
  }

  private valueProp(nodeId: string): HTMLElement {
    const field = new NumberField({
      label: '',
      format: fmt,
      dragStep: 0.01,
      snapStep: 1,
      onPreview: (v) => this.cb.previewProp(nodeId, 'value', v),
      onCommit: (v) => this.cb.commitProp(nodeId, 'value', v),
      onCancel: () => this.cb.previewProp(nodeId, 'value', null),
    });
    field.element.classList.add('ne-widget', 'ne-field');
    this.parts.push({ update: (n) => field.setValue(n.props.value as number), dispose: () => field.dispose() });
    return field.element;
  }

  private objectProp(nodeId: string): HTMLElement {
    const b = el('button', 'ne-dropdown ne-widget');
    b.type = 'button';
    b.addEventListener('mousedown', (e) => e.preventDefault());
    attachMenu(b, () => [
      { label: '—', action: () => this.cb.commitProp(nodeId, 'object', null) },
      ...this.cb.objects().map((o): MenuItem => ({ label: o.name, action: () => this.cb.commitProp(nodeId, 'object', o.id) })),
    ]);
    this.parts.push({
      update: (n) => {
        const id = n.props.object;
        b.textContent = this.cb.objects().find((o) => o.id === id)?.name ?? '';
      },
    });
    return b;
  }

  /** Color Ramp: gradient with its stops, + / −, interpolation, and the active stop's position and colour. */
  private ramp(nodeId: string): HTMLElement {
    const box = el('div', 'ne-ramp ne-widget');
    let active = 0;
    const get = () => this.nodeRef.props.color_ramp as ColorRampData;
    const set = (r: ColorRampData) => this.cb.commitProp(nodeId, 'color_ramp', r);

    const tools = el('div', 'ne-ramp-tools');
    const add = el('button', 'ne-ramp-btn', '+');
    const remove = el('button', 'ne-ramp-btn', '−');
    for (const b of [add, remove]) {
      b.type = 'button';
      b.addEventListener('mousedown', (e) => e.preventDefault());
    }
    const interp = el('button', 'ne-dropdown');
    interp.type = 'button';
    const INTERP = { EASE: 'Ease', CARDINAL: 'Cardinal', LINEAR: 'Linear', B_SPLINE: 'B-Spline', CONSTANT: 'Constant' } as const;
    attachMenu(interp, () => (Object.keys(INTERP) as (keyof typeof INTERP)[]).map((k): MenuItem => ({ label: INTERP[k], action: () => set({ ...get(), interpolation: k }) })));
    tools.append(add, remove, el('span', 'ne-ramp-mode', 'RGB'), interp);

    const bar = el('div', 'ne-ramp-bar');
    const stopsEl = el('div', 'ne-ramp-stops');
    const pos = new NumberField({
      label: 'Pos',
      format: fmt,
      dragStep: 0.005,
      snapStep: 0.1,
      onPreview: (v) => this.cb.previewProp(nodeId, 'color_ramp', withStop(get(), active, { position: clamp01(v) })),
      onCommit: (v) => set(withStop(get(), active, { position: clamp01(v) })),
      onCancel: () => this.cb.previewProp(nodeId, 'color_ramp', null),
    });
    pos.element.classList.add('ne-field');
    const swatch = el('input', 'ne-swatch');
    swatch.type = 'color';
    swatch.setAttribute('aria-label', 'Stop color');
    swatch.addEventListener('change', () => {
      const c = hexToLinear(swatch.value);
      set(withStop(get(), active, { color: [c.x, c.y, c.z, 1] }));
    });
    swatch.addEventListener('keydown', (e) => e.stopPropagation());
    const foot = el('div', 'ne-ramp-foot');
    foot.append(el('span', 'ne-label', String(active)), pos.element, swatch);

    // New stop halfway between the active one and its neighbour, with the colour there.
    add.addEventListener('click', () => {
      const r = get();
      const sorted = [...r.stops].sort((a, b) => a.position - b.position);
      const cur = r.stops[active]!;
      const next = sorted.find((s) => s.position > cur.position) ?? sorted[sorted.length - 1]!;
      const p = (cur.position + next.position) / 2;
      set({ ...r, stops: [...r.stops, { position: p, color: cur.color }] });
      active = r.stops.length;
    });
    remove.addEventListener('click', () => {
      const r = get();
      if (r.stops.length <= 1) return;
      set({ ...r, stops: r.stops.filter((_, i) => i !== active) });
      active = Math.max(0, active - 1);
    });
    box.append(tools, bar, stopsEl, foot);

    this.parts.push({
      update: (n) => {
        const r = n.props.color_ramp as ColorRampData;
        active = Math.min(active, r.stops.length - 1);
        const sorted = [...r.stops].sort((a, b) => a.position - b.position);
        const css = (c: readonly number[]) => linearToHex({ x: c[0]!, y: c[1]!, z: c[2]! });
        bar.style.background =
          r.interpolation === 'CONSTANT'
            ? `linear-gradient(90deg, ${sorted.map((s, i) => `${css(s.color)} ${s.position * 100}% ${(sorted[i + 1]?.position ?? 1) * 100}%`).join(', ')})`
            : `linear-gradient(90deg, ${sorted.map((s) => `${css(s.color)} ${s.position * 100}%`).join(', ')})`;
        stopsEl.replaceChildren(
          ...r.stops.map((s, i) => {
            const m = el('button', `ne-ramp-stop${i === active ? ' is-active' : ''}`);
            m.type = 'button';
            m.style.left = `${s.position * 100}%`;
            m.setAttribute('aria-label', `Stop ${i}`);
            m.addEventListener('mousedown', (e) => e.preventDefault());
            m.addEventListener('click', () => {
              active = i;
              this.update(this.nodeRef);
            });
            return m;
          }),
        );
        (foot.firstChild as HTMLElement).textContent = String(active);
        pos.setValue(r.stops[active]!.position);
        if (document.activeElement !== swatch) swatch.value = css(r.stops[active]!.color);
        interp.textContent = INTERP[r.interpolation];
      },
      dispose: () => pos.dispose(),
    });
    return box;
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function withStop(r: ColorRampData, i: number, change: Partial<{ position: number; color: readonly [number, number, number, number] }>): ColorRampData {
  return { ...r, stops: r.stops.map((s, j) => (j === i ? { ...s, ...change } : s)) };
}
