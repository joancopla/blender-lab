import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { mesh, sceneWith } from '../scene/factory';
import { type MeshObject, type SceneState, isEditMode, selectModeOf } from '../scene/scene';
import { SceneStore } from '../scene/store';
import {
  EditSelectOp,
  ToggleEditModeOp,
  editBox,
  editClick,
  editLoopOrRing,
  editSelectAll,
  selectionOf,
  setSelectMode,
  toggleEditMode,
} from './edit-mode';

const twoCubes = (): SceneState =>
  sceneWith([mesh('a', 'Cube', 'cube', vec3(0, 0, 1)), mesh('b', 'Cube.001', 'cube', vec3(4, 0, 1))], {
    selected: ['a', 'b'],
    active: 'a',
  });
const obj = (s: SceneState, id: string) => s.objects.find((o) => o.id === id) as MeshObject;

describe('Tab', () => {
  it('selected mesh objects enter Edit Mode together; Tab again leaves', () => {
    const s = toggleEditMode(twoCubes());
    expect(isEditMode(s)).toBe(true);
    expect(s.editObjectIds).toEqual(['a', 'b']);
    expect(isEditMode(toggleEditMode(s))).toBe(false);
  });

  it('needs an active mesh object; cameras and lights stay out', () => {
    const s = { ...twoCubes(), selectedIds: ['a', 'camera'], activeId: 'camera' };
    expect(toggleEditMode(s)).toBe(s);
    expect(toggleEditMode({ ...s, activeId: 'a' }).editObjectIds).toEqual(['a']);
  });

  it('new primitives start with everything selected', () => {
    expect(selectionOf(obj(toggleEditMode(twoCubes()), 'a')).faces).toHaveLength(6);
  });

  it('is an undo step', () => {
    const store = new SceneStore(twoCubes());
    store.execute(ToggleEditModeOp);
    store.undo();
    expect(isEditMode(store.state)).toBe(false);
  });
});

describe('select mode', () => {
  it('2 switches to edge mode; Shift+3 adds face mode; the last one cannot be removed', () => {
    let s = toggleEditMode(twoCubes());
    s = setSelectMode(s, 'edge', false);
    expect(selectModeOf(s)).toEqual({ vert: false, edge: true, face: false });
    s = setSelectMode(s, 'face', true);
    expect(selectModeOf(s)).toEqual({ vert: false, edge: true, face: true });
    const onlyFace = setSelectMode(setSelectMode(s, 'face', false), 'face', true);
    expect(selectModeOf(onlyFace)).toEqual({ vert: false, edge: false, face: true });
  });

  it('converts the selection of every edit object', () => {
    let s = toggleEditMode(twoCubes());
    s = editClick(s, { objectId: 'a', ref: { kind: 'vert', index: 1 } }, false);
    s = setSelectMode(s, 'face', false);
    expect(selectionOf(obj(s, 'a')).verts).toEqual([]);
  });
});

describe('component selection across objects', () => {
  it('click selects in one object and deselects the other; that object becomes active', () => {
    let s = toggleEditMode(twoCubes());
    s = editClick(s, { objectId: 'b', ref: { kind: 'vert', index: 0 } }, false);
    expect(selectionOf(obj(s, 'b')).verts).toEqual([0]);
    expect(selectionOf(obj(s, 'a')).verts).toEqual([]);
    expect(s.activeId).toBe('b');
  });

  it('shift+click keeps the other object; click on nothing deselects everything', () => {
    let s = editClick(toggleEditMode(twoCubes()), { objectId: 'a', ref: { kind: 'vert', index: 0 } }, false);
    s = editClick(s, { objectId: 'b', ref: { kind: 'vert', index: 7 } }, true);
    expect(selectionOf(obj(s, 'a')).verts).toEqual([0]);
    expect(selectionOf(obj(s, 'b')).verts).toEqual([7]);
    s = editClick(s, null, false);
    expect(selectionOf(obj(s, 'a')).verts).toEqual([]);
    expect(selectionOf(obj(s, 'b')).verts).toEqual([]);
  });

  it('box and select all per object', () => {
    let s = editSelectAll(toggleEditMode(twoCubes()), 'deselect');
    s = editBox(s, new Map([['a', [1, 3, 5, 7]]]), 'set');
    expect(selectionOf(obj(s, 'a')).faces).toEqual([5]);
    expect(selectionOf(obj(s, 'b')).verts).toEqual([]);
    expect(selectionOf(obj(editSelectAll(s, 'select'), 'b')).faces).toHaveLength(6);
  });

  it('loop and ring select', () => {
    let s = toggleEditMode(twoCubes());
    s = setSelectMode(s, 'edge', false);
    s = editLoopOrRing(s, 'a', 0, 'ring', false);
    expect(selectionOf(obj(s, 'a')).edges).toHaveLength(4);
  });

  it('a selection that changes nothing is not an undo step', () => {
    const store = new SceneStore(toggleEditMode(twoCubes()));
    store.execute(EditSelectOp({ objectId: 'a', ref: { kind: 'vert', index: 0 } }, false));
    expect(store.execute(EditSelectOp({ objectId: 'a', ref: { kind: 'vert', index: 0 } }, false))).toBe(false);
  });
});
