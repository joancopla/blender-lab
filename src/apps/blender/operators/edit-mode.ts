/**
 * Edit Mode operators at scene level: entering/leaving Edit Mode (Tab), the
 * select mode (1/2/3) and component selection across every object in Edit
 * Mode (multi-object editing). Every one is an undo step.
 */
import {
  type BoxMode,
  type ComponentKind,
  type ComponentRef,
  type SelectAllAction,
  boxComponents,
  convertSelection,
  fromBase,
  linkedFromSelection,
  loopSelect,
  onlyComponent,
  ringSelect,
  selectAllComponents,
  selectAllOn,
  selectLess,
  selectLinked,
  selectMore,
  toggleComponent,
} from '../edit/selection';
import type { MeshData } from '../mesh/mesh-data';
import {
  type ComponentSelection,
  type MeshObject,
  type SceneState,
  type SelectMode,
  findObject,
  isEditMode,
  meshOf,
  selectModeOf,
} from '../scene/scene';
import type { OperatorCall } from '../../../core/history/store';

const allSelectedCache = new WeakMap<MeshData, ComponentSelection>();

/**
 * The object's Edit Mode selection (new primitives: everything selected). The
 * same object is returned for the same state, so callers can compare references.
 */
export function selectionOf(o: MeshObject): ComponentSelection {
  if (o.meshSelection) return o.meshSelection;
  const m = meshOf(o);
  let all = allSelectedCache.get(m);
  if (!all) {
    all = selectAllComponents(m);
    allSelectedCache.set(m, all);
  }
  return all;
}

const sameList = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameSelection = (a: ComponentSelection, b: ComponentSelection) =>
  sameList(a.verts, b.verts) &&
  sameList(a.edges, b.edges) &&
  sameList(a.faces, b.faces) &&
  a.active?.kind === b.active?.kind &&
  a.active?.index === b.active?.index;

/**
 * Applies `fn` to the selection of every object in Edit Mode. Returns the same
 * state when nothing changes (no undo step).
 */
function mapEditSelections(
  s: SceneState,
  fn: (o: MeshObject, m: MeshData, sel: ComponentSelection) => ComponentSelection,
): SceneState {
  const ids = new Set(s.editObjectIds ?? []);
  let changed = false;
  const objects = s.objects.map((o) => {
    if (o.type !== 'mesh' || !ids.has(o.id)) return o;
    const sel = selectionOf(o);
    const next = fn(o, meshOf(o), sel);
    if (sameSelection(sel, next)) return o;
    changed = true;
    return { ...o, meshSelection: next };
  });
  return changed ? { ...s, objects } : s;
}

// ---------------------------------------------------------------------------
// Tab

/**
 * Tab: every selected mesh object (plus the active one) enters Edit Mode; Tab
 * again goes back to Object Mode. Needs an active mesh object.
 * FIDELITY? Blender's multi-object editing rules for non-mesh selected objects.
 */
export function toggleEditMode(s: SceneState): SceneState {
  if (isEditMode(s)) return { ...s, editObjectIds: [] };
  const active = findObject(s, s.activeId);
  if (active?.type !== 'mesh') return s;
  const ids = s.objects
    .filter((o) => o.type === 'mesh' && (o.id === active.id || s.selectedIds.includes(o.id)))
    .map((o) => o.id);
  return { ...s, editObjectIds: ids };
}

// ---------------------------------------------------------------------------
// Select mode

/** 1 / 2 / 3 set one mode; with Shift they add or remove it (at least one stays on). */
export function setSelectMode(s: SceneState, kind: ComponentKind, extend: boolean): SceneState {
  const current = selectModeOf(s);
  let next: SelectMode;
  if (extend) {
    next = { ...current, [kind]: !current[kind] };
    if (!next.vert && !next.edge && !next.face) return s;
  } else {
    next = { vert: kind === 'vert', edge: kind === 'edge', face: kind === 'face' };
  }
  if (next.vert === current.vert && next.edge === current.edge && next.face === current.face) return s;
  const converted = mapEditSelections({ ...s, selectMode: next }, (_, m, sel) => convertSelection(m, sel, next));
  return converted.selectMode === next ? converted : { ...converted, selectMode: next };
}

// ---------------------------------------------------------------------------
// Picking results

export interface ComponentHit {
  readonly objectId: string;
  readonly ref: ComponentRef;
}

/**
 * Click on a component. Without Shift: only that element, in every edit object.
 * With Shift: add / make active / deselect. Clicking on nothing deselects all.
 * The clicked object becomes the active object.
 */
export function editClick(s: SceneState, hit: ComponentHit | null, extend: boolean): SceneState {
  const mode = selectModeOf(s);
  if (!hit) return extend ? s : mapEditSelections(s, (_, m) => fromBase(m, 'vert', []));
  const next = mapEditSelections(s, (o, m, sel) => {
    if (o.id === hit.objectId) return extend ? toggleComponent(m, sel, hit.ref, mode) : onlyComponent(m, hit.ref, mode);
    return extend ? sel : fromBase(m, 'vert', []);
  });
  return next.activeId === hit.objectId ? next : { ...next, activeId: hit.objectId };
}

/** Box select: base elements inside the box, per object. */
export function editBox(s: SceneState, inside: ReadonlyMap<string, readonly number[]>, boxMode: BoxMode): SceneState {
  const mode = selectModeOf(s);
  return mapEditSelections(s, (o, m, sel) => boxComponents(m, sel, inside.get(o.id) ?? [], boxMode, mode));
}

export function editSelectAll(s: SceneState, action: SelectAllAction): SceneState {
  const mode = selectModeOf(s);
  return mapEditSelections(s, (_, m, sel) => selectAllOn(m, sel, action, mode));
}

/** Alt+click (loop) or Ctrl+Alt+click (ring) on an edge; Shift adds. */
export function editLoopOrRing(
  s: SceneState,
  objectId: string,
  edge: number,
  kind: 'loop' | 'ring',
  extend: boolean,
): SceneState {
  const mode = selectModeOf(s);
  const next = mapEditSelections(s, (o, m, sel) => {
    if (o.id !== objectId) return extend ? sel : fromBase(m, 'vert', []);
    return kind === 'loop' ? loopSelect(m, sel, edge, extend, mode) : ringSelect(m, sel, edge, extend, mode);
  });
  return next.activeId === objectId ? next : { ...next, activeId: objectId };
}

/** L: everything connected to the vertices under the cursor (added to the selection). */
export function editLinkedPick(s: SceneState, objectId: string, verts: readonly number[]): SceneState {
  const mode = selectModeOf(s);
  return mapEditSelections(s, (o, m, sel) => (o.id === objectId ? selectLinked(m, sel, verts, mode) : sel));
}

/** Ctrl+L: everything connected to the selection. */
export function editLinked(s: SceneState): SceneState {
  const mode = selectModeOf(s);
  return mapEditSelections(s, (_, m, sel) => linkedFromSelection(m, sel, mode));
}

export function editMoreLess(s: SceneState, more: boolean): SceneState {
  const mode = selectModeOf(s);
  return mapEditSelections(s, (_, m, sel) => (more ? selectMore(m, sel, mode) : selectLess(m, sel, mode)));
}

// ---------------------------------------------------------------------------
// Operator calls. FIDELITY? Names as in Edit > Undo History.

export const ToggleEditModeOp: OperatorCall = { name: 'Toggle Edit Mode', apply: toggleEditMode };
export const SelectModeOp = (kind: ComponentKind, extend: boolean): OperatorCall => ({
  name: 'Select Mode',
  apply: (s) => setSelectMode(s, kind, extend),
});
export const EditSelectOp = (hit: ComponentHit | null, extend: boolean): OperatorCall => ({
  name: 'Select',
  apply: (s) => editClick(s, hit, extend),
});
export const EditBoxSelectOp = (inside: ReadonlyMap<string, readonly number[]>, mode: BoxMode): OperatorCall => ({
  name: 'Box Select',
  apply: (s) => editBox(s, inside, mode),
});
export const EditSelectAllOp = (action: SelectAllAction): OperatorCall => ({
  name: '(De)select All',
  apply: (s) => editSelectAll(s, action),
});
export const LoopSelectOp = (objectId: string, edge: number, kind: 'loop' | 'ring', extend: boolean): OperatorCall => ({
  name: kind === 'loop' ? 'Loop Select' : 'Edge Ring Select',
  apply: (s) => editLoopOrRing(s, objectId, edge, kind, extend),
});
export const SelectLinkedPickOp = (objectId: string, verts: readonly number[]): OperatorCall => ({
  name: 'Select Linked Pick',
  apply: (s) => editLinkedPick(s, objectId, verts),
});
export const SelectLinkedOp: OperatorCall = { name: 'Select Linked All', apply: editLinked };
export const SelectMoreLessOp = (more: boolean): OperatorCall => ({
  name: more ? 'Select More' : 'Select Less',
  apply: (s) => editMoreLess(s, more),
});
