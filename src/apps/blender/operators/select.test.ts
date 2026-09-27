import { describe, expect, it } from 'vitest';
import { blenderDefaultScene } from '../scene/default-scene';
import type { SceneState } from '../scene/scene';
import { SceneStore } from '../../../core/history/store';
import { vec3 } from '../math/vec3';
import { BoxSelectOp, SelectAllOp, SelectOp, boxSelect, clickSelect, outlinerSelect, selectAll } from './select';

/** Default scene plus two spheres. Starts with Cube selected and active. */
function scene(): SceneState {
  const s = blenderDefaultScene();
  const sphere = (id: string, name: string, x: number) => ({
    id,
    name,
    type: 'mesh' as const,
    primitive: 'uvSphere' as const,
    location: vec3(x, 0, 0),
    rotationDeg: vec3(0, 0, 0),
    scale: vec3(1, 1, 1),
  });
  return { ...s, objects: [...s.objects, sphere('s1', 'Sphere', 3), sphere('s2', 'Sphere.001', 6)] };
}

const sel = (s: SceneState) => ({ selected: [...s.selectedIds].sort(), active: s.activeId });

describe('click select', () => {
  it('selects only the clicked object and makes it active', () => {
    expect(sel(clickSelect(scene(), 's1', false))).toEqual({ selected: ['s1'], active: 's1' });
  });

  it('click on nothing deselects all but keeps the active object', () => {
    expect(sel(clickSelect(scene(), null, false))).toEqual({ selected: [], active: 'cube' });
  });

  it('shift+click on nothing does nothing', () => {
    const s = scene();
    expect(clickSelect(s, null, true)).toBe(s);
  });

  it('shift+click: unselected -> added and active', () => {
    expect(sel(clickSelect(scene(), 's1', true))).toEqual({ selected: ['cube', 's1'], active: 's1' });
  });

  it('shift+click: selected but not active -> becomes active', () => {
    let s = clickSelect(scene(), 's1', true); // cube, s1 (active)
    s = clickSelect(s, 'cube', true);
    expect(sel(s)).toEqual({ selected: ['cube', 's1'], active: 'cube' });
  });

  it('shift+click: active -> deselected, stays active', () => {
    const s = clickSelect(scene(), 'cube', true);
    expect(sel(s)).toEqual({ selected: [], active: 'cube' });
  });

  it('returns the same state when nothing changes', () => {
    const s = scene();
    expect(clickSelect(s, 'cube', false)).toBe(s);
  });
});

describe('select all', () => {
  it('A selects everything, Alt+A deselects, Ctrl+I inverts; active unchanged', () => {
    const all = selectAll(scene(), 'select');
    expect(all.selectedIds).toHaveLength(5);
    expect(all.activeId).toBe('cube');
    expect(selectAll(all, 'select')).toBe(all);
    expect(sel(selectAll(all, 'deselect'))).toEqual({ selected: [], active: 'cube' });
    expect(sel(selectAll(scene(), 'invert'))).toEqual({
      selected: ['camera', 'light', 's1', 's2'],
      active: 'cube',
    });
  });
});

describe('box select', () => {
  it('set / add / sub', () => {
    expect(sel(boxSelect(scene(), ['s1', 's2'], 'set'))).toEqual({ selected: ['s1', 's2'], active: 'cube' });
    expect(sel(boxSelect(scene(), ['s1'], 'add'))).toEqual({ selected: ['cube', 's1'], active: 'cube' });
    expect(sel(boxSelect(scene(), ['cube'], 'sub'))).toEqual({ selected: [], active: 'cube' });
  });

  it('an empty box in set mode deselects everything', () => {
    expect(sel(boxSelect(scene(), [], 'set'))).toEqual({ selected: [], active: 'cube' });
  });
});

describe('outliner select', () => {
  it('click selects and activates; ctrl+click toggles', () => {
    let s = outlinerSelect(scene(), 's1', false);
    expect(sel(s)).toEqual({ selected: ['s1'], active: 's1' });
    s = outlinerSelect(s, 's2', true);
    expect(sel(s)).toEqual({ selected: ['s1', 's2'], active: 's2' });
    s = outlinerSelect(s, 's1', true);
    expect(sel(s)).toEqual({ selected: ['s2'], active: 's2' });
    expect(sel(outlinerSelect(s, null, false))).toEqual({ selected: [], active: 's2' });
  });
});

describe('undo history', () => {
  it('each selection change is one undo step; no-ops are not recorded', () => {
    const store = new SceneStore(scene());
    expect(store.execute(SelectOp('cube', false))).toBe(false);
    store.execute(SelectOp('s1', false));
    store.execute(BoxSelectOp(['s2'], 'add'));
    store.execute(SelectAllOp('deselect'));
    expect(store.state.selectedIds).toEqual([]);
    store.undo();
    expect(sel(store.state)).toEqual({ selected: ['s1', 's2'], active: 's1' });
    store.undo();
    store.undo();
    expect(sel(store.state)).toEqual({ selected: ['cube'], active: 'cube' });
    expect(store.undo()).toBe(false);
    store.redo();
    expect(sel(store.state)).toEqual({ selected: ['s1'], active: 's1' });
    // A new operation drops the redo steps.
    store.execute(SelectOp('s2', false));
    expect(store.redo()).toBe(false);
    expect(store.log.map((e) => e.kind)).toEqual(['execute', 'execute', 'execute', 'undo', 'undo', 'undo', 'redo', 'execute']);
  });

  it('keeps at most 32 undo steps', () => {
    const store = new SceneStore(scene());
    for (let i = 0; i < 40; i++) store.execute(SelectOp(i % 2 ? 's1' : 's2', false));
    let undos = 0;
    while (store.undo()) undos++;
    expect(undos).toBe(32);
  });
});

describe('store preview', () => {
  it('shows the preview without recording it; cancel logs and restores', () => {
    const store = new SceneStore(scene());
    const moved = { ...store.state, selectedIds: [] };
    store.setPreview(moved);
    expect(store.displayState).toBe(moved);
    expect(store.state.selectedIds).toEqual(['cube']);
    store.logCancel('Move', 'rightClick');
    expect(store.displayState).toBe(store.state);
    expect(store.canUndo).toBe(false);
    expect(store.log).toEqual([{ kind: 'cancel', name: 'Move', via: 'rightClick' }]);
  });
});
