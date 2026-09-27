/**
 * Object Mode selection operators. Pure functions: they return the same state
 * object when nothing changes, so the store records no undo step.
 */
import type { SceneState } from '../scene/scene';
import type { OperatorCall } from '../../../core/history/store';

function withSelection(s: SceneState, selectedIds: readonly string[], activeId: string | null): SceneState {
  // Keep scene order so comparisons and the Outliner are stable.
  const set = new Set(selectedIds);
  const ordered = s.objects.filter((o) => set.has(o.id)).map((o) => o.id);
  const same =
    activeId === s.activeId &&
    ordered.length === s.selectedIds.length &&
    ordered.every((id, i) => id === s.selectedIds[i]);
  return same ? s : { ...s, selectedIds: ordered, activeId };
}

/**
 * view3d.select (click).
 * - Click: select the object, make it active, deselect the rest.
 * - Shift+click (extend/toggle): unselected -> select and make active;
 *   selected but not active -> make active; active -> deselect (it stays active).
 * - Click on nothing: deselect all (the active object stays active).
 * - Shift+click on nothing: nothing.
 */
export function clickSelect(s: SceneState, id: string | null, extend: boolean): SceneState {
  if (id === null) return extend ? s : withSelection(s, [], s.activeId);
  if (!extend) return withSelection(s, [id], id);
  const selected = s.selectedIds.includes(id);
  if (!selected) return withSelection(s, [...s.selectedIds, id], id);
  if (s.activeId !== id) return withSelection(s, s.selectedIds, id);
  return withSelection(
    s,
    s.selectedIds.filter((x) => x !== id),
    s.activeId,
  );
}

export type SelectAllAction = 'select' | 'deselect' | 'invert';

/** object.select_all: A, Alt+A, Ctrl+I. The active object does not change. */
export function selectAll(s: SceneState, action: SelectAllAction): SceneState {
  const all = s.objects.map((o) => o.id);
  if (action === 'select') return withSelection(s, all, s.activeId);
  if (action === 'deselect') return withSelection(s, [], s.activeId);
  return withSelection(
    s,
    all.filter((id) => !s.selectedIds.includes(id)),
    s.activeId,
  );
}

export type BoxMode = 'set' | 'add' | 'sub';

/**
 * view3d.select_box. `set` replaces the selection, `add` extends it, `sub`
 * removes from it. The active object does not change.
 */
export function boxSelect(s: SceneState, ids: readonly string[], mode: BoxMode): SceneState {
  if (mode === 'set') return withSelection(s, ids, s.activeId);
  if (mode === 'add') return withSelection(s, [...s.selectedIds, ...ids], s.activeId);
  return withSelection(
    s,
    s.selectedIds.filter((id) => !ids.includes(id)),
    s.activeId,
  );
}

/**
 * Outliner click (outliner.item_activate).
 * - Click: select, make active, deselect the rest.
 * - Ctrl+click: toggle. Unselected -> select and make active; selected -> deselect.
 * - Click on empty space: deselect all.
 * FIDELITY? Ctrl+click on a selected object.
 */
export function outlinerSelect(s: SceneState, id: string | null, extend: boolean): SceneState {
  if (id === null) return extend ? s : withSelection(s, [], s.activeId);
  if (!extend) return withSelection(s, [id], id);
  if (!s.selectedIds.includes(id)) return withSelection(s, [...s.selectedIds, id], id);
  return withSelection(
    s,
    s.selectedIds.filter((x) => x !== id),
    s.activeId,
  );
}

// Operator calls for the store. FIDELITY? Names as in Edit > Undo History.
export const SelectOp = (id: string | null, extend: boolean): OperatorCall => ({
  name: 'Select',
  apply: (s) => clickSelect(s, id, extend),
});

export const SelectAllOp = (action: SelectAllAction): OperatorCall => ({
  name: '(De)select All',
  apply: (s) => selectAll(s, action),
});

export const BoxSelectOp = (ids: readonly string[], mode: BoxMode): OperatorCall => ({
  name: 'Box Select',
  apply: (s) => boxSelect(s, ids, mode),
});

export const OutlinerSelectOp = (id: string | null, extend: boolean): OperatorCall => ({
  name: 'Activate Item',
  apply: (s) => outlinerSelect(s, id, extend),
});
