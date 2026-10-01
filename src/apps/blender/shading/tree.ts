/**
 * A material's node tree: nodes, links, socket availability, validation and the
 * editing operations of the Shader Editor, as pure functions (the history wraps
 * them). No DOM, no three.js.
 */
import { type InputDef, type NodeTypeDef, type OutputDef, type PropValue, type Props, nodeType } from './node-types';
import { type SocketValue, canLink } from './sockets';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ShaderNode {
  readonly id: string;
  /** Blender idname. */
  readonly type: string;
  /** Unique name: the label, then .001, .002... */
  readonly name: string;
  readonly location: Point;
  readonly props: Props;
  /** Values of unlinked inputs, by socket identifier (missing: the default). */
  readonly values: Readonly<Record<string, SocketValue>>;
  /** M */
  readonly muted: boolean;
  /** H */
  readonly collapsed: boolean;
  /** Ctrl+H: sockets without links are hidden. */
  readonly hideUnused: boolean;
  /** Principled BSDF panels that are open. */
  readonly openPanels: readonly string[];
}

export interface SocketRef {
  readonly node: string;
  readonly socket: string;
}

export interface NodeLink {
  readonly id: string;
  readonly from: SocketRef;
  readonly to: SocketRef;
}

export interface NodeTree {
  readonly nodes: readonly ShaderNode[];
  readonly links: readonly NodeLink[];
  /** Counter for new ids (never reused, so undo/redo keeps references valid). */
  readonly nextId: number;
}

export const EMPTY_TREE: NodeTree = { nodes: [], links: [], nextId: 1 };

// --- Lookups ---------------------------------------------------------------------------

export const nodeById = (t: NodeTree, id: string) => t.nodes.find((n) => n.id === id);
export const defOf = (n: ShaderNode): NodeTypeDef => nodeType(n.type);

/** Inputs and outputs the node has with its current options (Mix data type, Noise dimensions...). */
export function availableInputs(n: ShaderNode): readonly InputDef[] {
  return defOf(n).inputs.filter((s) => !s.when || s.when(n.props));
}
export function availableOutputs(n: ShaderNode): readonly OutputDef[] {
  return defOf(n).outputs.filter((s) => !s.when || s.when(n.props));
}

export const inputDef = (n: ShaderNode, socket: string) => defOf(n).inputs.find((s) => s.id === socket);
export const outputDef = (n: ShaderNode, socket: string) => defOf(n).outputs.find((s) => s.id === socket);

/** The value of an unlinked input: the one set on the node, or the default. */
export function inputValue(n: ShaderNode, socket: string): SocketValue | undefined {
  return n.values[socket] ?? inputDef(n, socket)?.default;
}

export const linkInto = (t: NodeTree, to: SocketRef) => t.links.find((l) => l.to.node === to.node && l.to.socket === to.socket);

// --- Validation ---------------------------------------------------------------------------

/** Whether a link is drawn as valid (Blender draws invalid links in red). */
export function linkIsValid(t: NodeTree, link: NodeLink): boolean {
  const a = nodeById(t, link.from.node);
  const b = nodeById(t, link.to.node);
  if (!a || !b) return false;
  const out = availableOutputs(a).find((s) => s.id === link.from.socket);
  const inp = availableInputs(b).find((s) => s.id === link.to.socket);
  if (!out || !inp) return false;
  return canLink(out.type, inp.type) && !createsCycle(t, link.from.node, link.to.node, link.id);
}

/** Whether a link from `from` to `to` closes a loop (ignoring the link `skip`). */
export function createsCycle(t: NodeTree, from: string, to: string, skip?: string): boolean {
  if (from === to) return true;
  // Is `from` reachable downstream of `to`?
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const l of t.links) if (l.id !== skip && l.from.node === cur) stack.push(l.to.node);
  }
  return false;
}

/** The Material Output that renders (Blender: the active one; here the first). */
export const outputNode = (t: NodeTree) => t.nodes.find((n) => n.type === 'ShaderNodeOutputMaterial');

// --- Creating nodes --------------------------------------------------------------------

/** Blender's unique names: "Noise Texture", "Noise Texture.001"... */
export function uniqueName(t: NodeTree, base: string): string {
  const taken = new Set(t.nodes.map((n) => n.name));
  if (!taken.has(base)) return base;
  for (let i = 1; ; i++) {
    const name = `${base}.${String(i).padStart(3, '0')}`;
    if (!taken.has(name)) return name;
  }
}

function defaultProps(def: NodeTypeDef): Props {
  return Object.fromEntries(def.props.map((p) => [p.id, p.default]));
}

/** Adds a node; `props` overrides options (the Add menu's "Mix Color" sets data_type RGBA). */
export function addNode(
  t: NodeTree,
  type: string,
  location: Point,
  props: Props = {},
  values: Readonly<Record<string, SocketValue>> = {},
): { tree: NodeTree; id: string } {
  const def = nodeType(type);
  const id = `n${t.nextId}`;
  const node: ShaderNode = {
    id,
    type,
    name: uniqueName(t, def.label),
    location,
    props: { ...defaultProps(def), ...props },
    values,
    muted: false,
    collapsed: false,
    hideUnused: false,
    openPanels: [],
  };
  return { tree: { ...t, nodes: [...t.nodes, node], nextId: t.nextId + 1 }, id };
}

// --- Links ----------------------------------------------------------------------------

/**
 * Connects an output to an input. An input takes one link: an existing one is replaced.
 * An invalid link (shader into colour, a loop) is still created and drawn red, as in Blender.
 */
export function connect(t: NodeTree, from: SocketRef, to: SocketRef): NodeTree {
  if (from.node === to.node) return t;
  const kept = t.links.filter((l) => !(l.to.node === to.node && l.to.socket === to.socket));
  const link: NodeLink = { id: `l${t.nextId}`, from, to };
  return { ...t, links: [...kept, link], nextId: t.nextId + 1 };
}

export function disconnect(t: NodeTree, linkId: string): NodeTree {
  return { ...t, links: t.links.filter((l) => l.id !== linkId) };
}

/** Ctrl + right-drag: cuts every link the stroke crosses (the editor gives their ids). */
export function cutLinks(t: NodeTree, linkIds: readonly string[]): NodeTree {
  const cut = new Set(linkIds);
  return { ...t, links: t.links.filter((l) => !cut.has(l.id)) };
}

// --- Editing nodes -------------------------------------------------------------------------

const mapNodes = (t: NodeTree, ids: readonly string[], fn: (n: ShaderNode) => ShaderNode): NodeTree => {
  const set = new Set(ids);
  return { ...t, nodes: t.nodes.map((n) => (set.has(n.id) ? fn(n) : n)) };
};

/** G: moves nodes. */
export const moveNodes = (t: NodeTree, ids: readonly string[], dx: number, dy: number): NodeTree =>
  mapNodes(t, ids, (n) => ({ ...n, location: { x: n.location.x + dx, y: n.location.y + dy } }));

/** X: deletes nodes and their links. */
export function removeNodes(t: NodeTree, ids: readonly string[]): NodeTree {
  const set = new Set(ids);
  return {
    ...t,
    nodes: t.nodes.filter((n) => !set.has(n.id)),
    links: t.links.filter((l) => !set.has(l.from.node) && !set.has(l.to.node)),
  };
}

/**
 * Output → input pairs used when the node is muted or dissolved: the node's own rule
 * (Mix: A), otherwise each output takes the first available input of the same type.
 * FIDELITY? Blender ranks inputs by type compatibility for nodes without an explicit rule.
 */
export function passThrough(n: ShaderNode): Readonly<Record<string, string>> {
  const def = defOf(n);
  const inputs = availableInputs(n);
  const explicit = def.passThrough?.(n.props) ?? {};
  const pairs: Record<string, string> = {};
  for (const o of availableOutputs(n)) {
    const chosen = explicit[o.id] ?? inputs.find((i) => i.type === o.type)?.id;
    if (chosen && inputs.some((i) => i.id === chosen)) pairs[o.id] = chosen;
  }
  return pairs;
}

/** Ctrl+X: deletes nodes and reconnects what went through them. */
export function dissolveNodes(t: NodeTree, ids: readonly string[]): NodeTree {
  let tree = t;
  for (const id of ids) {
    const n = nodeById(tree, id);
    if (!n) continue;
    const pairs = passThrough(n);
    const bridges: { from: SocketRef; to: SocketRef }[] = [];
    for (const [outId, inId] of Object.entries(pairs)) {
      const source = linkInto(tree, { node: id, socket: inId });
      if (!source) continue;
      for (const l of tree.links) if (l.from.node === id && l.from.socket === outId) bridges.push({ from: source.from, to: l.to });
    }
    tree = removeNodes(tree, [id]);
    for (const b of bridges) tree = connect(tree, b.from, b.to);
  }
  return tree;
}

/**
 * Shift+D: copies nodes with the links between them (links coming from other
 * nodes are not copied, as Blender's default). Returns the new ids.
 */
export function duplicateNodes(t: NodeTree, ids: readonly string[], offset: Point): { tree: NodeTree; ids: string[] } {
  let tree = t;
  const map = new Map<string, string>();
  for (const id of ids) {
    const n = nodeById(t, id);
    if (!n) continue;
    const added = addNode(tree, n.type, { x: n.location.x + offset.x, y: n.location.y + offset.y }, n.props, n.values);
    tree = added.tree;
    const copy = nodeById(tree, added.id)!;
    tree = mapNodes(tree, [added.id], () => ({ ...copy, muted: n.muted, collapsed: n.collapsed, hideUnused: n.hideUnused, openPanels: n.openPanels }));
    map.set(id, added.id);
  }
  for (const l of t.links) {
    const a = map.get(l.from.node);
    const b = map.get(l.to.node);
    if (a && b) tree = connect(tree, { node: a, socket: l.from.socket }, { node: b, socket: l.to.socket });
  }
  return { tree, ids: [...map.values()] };
}

/** get_main_socket_priority (source/blender/editors/space_node/node_relationships.cc). */
const SOCKET_PRIORITY: Readonly<Record<string, number>> = { bool: 2, float: 4, vector: 5, color: 6, shader: 7 };

/**
 * A node's main socket (get_main_socket in node_relationships.cc): the declared default
 * link socket (Mix: A) if there is one; otherwise the first socket of the highest-priority
 * type (shader, colour, vector, float, boolean).
 */
export function mainSocket(n: ShaderNode, side: 'in' | 'out'): InputDef | OutputDef | undefined {
  const sockets: readonly (InputDef | OutputDef)[] = side === 'in' ? availableInputs(n) : availableOutputs(n);
  const declared = sockets.find((s) => (s as InputDef).defaultLink);
  if (declared) return declared;
  const best = Math.max(-1, ...sockets.map((s) => SOCKET_PRIORITY[s.type] ?? -1));
  return sockets.find((s) => SOCKET_PRIORITY[s.type] === best);
}

/**
 * Dropping a node on a link inserts it: the link's source goes into the node's main
 * input and the node's main output into the link's target (Blender's node insert offset
 * uses get_main_socket; types are converted as usual).
 */
export function insertOnLink(t: NodeTree, nodeId: string, linkId: string): NodeTree {
  const link = t.links.find((l) => l.id === linkId);
  const n = nodeById(t, nodeId);
  if (!link || !n || link.from.node === nodeId || link.to.node === nodeId) return t;
  const input = mainSocket(n, 'in');
  const output = mainSocket(n, 'out');
  if (!input || !output) return t;
  let tree = disconnect(t, linkId);
  tree = connect(tree, link.from, { node: nodeId, socket: input.id });
  return connect(tree, { node: nodeId, socket: output.id }, link.to);
}

/** M */
export const toggleMute = (t: NodeTree, ids: readonly string[]): NodeTree => {
  const mute = ids.some((id) => !nodeById(t, id)?.muted);
  return mapNodes(t, ids, (n) => ({ ...n, muted: mute }));
};

/** H */
export const toggleCollapse = (t: NodeTree, ids: readonly string[]): NodeTree => {
  const collapse = ids.some((id) => !nodeById(t, id)?.collapsed);
  return mapNodes(t, ids, (n) => ({ ...n, collapsed: collapse }));
};

/** Ctrl+H */
export const toggleHideUnused = (t: NodeTree, ids: readonly string[]): NodeTree => {
  const hide = ids.some((id) => !nodeById(t, id)?.hideUnused);
  return mapNodes(t, ids, (n) => ({ ...n, hideUnused: hide }));
};

export const togglePanel = (t: NodeTree, id: string, panel: string): NodeTree =>
  mapNodes(t, [id], (n) => ({ ...n, openPanels: n.openPanels.includes(panel) ? n.openPanels.filter((p) => p !== panel) : [...n.openPanels, panel] }));

/** Sets an unlinked input's value (clamped to the socket's range). */
export function setValue(t: NodeTree, id: string, socket: string, value: SocketValue): NodeTree {
  const n = nodeById(t, id);
  const def = n && inputDef(n, socket);
  if (!n || !def) return t;
  const clamp = (v: number) => Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, v));
  const v = typeof value === 'number' ? clamp(value) : value;
  return mapNodes(t, [id], (x) => ({ ...x, values: { ...x.values, [socket]: v } }));
}

/** Changes an option (Mix data type, Noise dimensions...). Links to sockets that disappear stay, invalid. */
export const setProp = (t: NodeTree, id: string, prop: string, value: PropValue): NodeTree =>
  mapNodes(t, [id], (n) => ({ ...n, props: { ...n.props, [prop]: value } }));

// --- The default material ---------------------------------------------------------------

/**
 * Material > New: a Principled BSDF into a Material Output, at Blender's positions
 * (ED_node_shader_default in source/blender/editors/space_node/node_edit.cc).
 */
export function defaultMaterialTree(): NodeTree {
  const a = addNode(EMPTY_TREE, 'ShaderNodeBsdfPrincipled', { x: -200, y: 100 });
  const b = addNode(a.tree, 'ShaderNodeOutputMaterial', { x: 200, y: 100 });
  return connect(b.tree, { node: a.id, socket: 'BSDF' }, { node: b.id, socket: 'Surface' });
}
