import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import type { MeshObject, SceneState } from '../scene/scene';
import { SceneStore } from '../scene/store';
import {
  AddModifierOp,
  MoveModifierOp,
  RemoveModifierOp,
  SetModifierOp,
  addModifier,
  moveModifier,
  removeModifier,
  setModifier,
} from './modifiers';

const cubeOf = (s: SceneState) => s.objects.find((o) => o.id === 'cube') as MeshObject;
const names = (s: SceneState) => (cubeOf(s).modifiers ?? []).map((m) => m.name);

describe('modifier operators', () => {
  it('adds at the end with unique names', () => {
    let s = blenderDefaultScene();
    s = addModifier(s, 'cube', 'MIRROR');
    s = addModifier(s, 'cube', 'ARRAY');
    s = addModifier(s, 'cube', 'MIRROR');
    expect(names(s)).toEqual(['Mirror', 'Array', 'Mirror.001']);
  });

  it('cameras and lights take no modifiers', () => {
    const s = blenderDefaultScene();
    expect(addModifier(s, 'camera', 'MIRROR')).toBe(s);
  });

  it('removes and moves by name', () => {
    let s = blenderDefaultScene();
    for (const t of ['MIRROR', 'ARRAY', 'MIRROR'] as const) s = addModifier(s, 'cube', t);
    expect(names(moveModifier(s, 'cube', 'Mirror.001', 0))).toEqual(['Mirror.001', 'Mirror', 'Array']);
    expect(names(moveModifier(s, 'cube', 'Mirror', 99))).toEqual(['Array', 'Mirror.001', 'Mirror']);
    expect(moveModifier(s, 'cube', 'Array', 1)).toBe(s);
    expect(names(removeModifier(s, 'cube', 'Array'))).toEqual(['Mirror', 'Mirror.001']);
    expect(removeModifier(s, 'cube', 'Nope')).toBe(s);
  });

  it('edits fields; renaming keeps names unique; same values change nothing', () => {
    let s = addModifier(addModifier(blenderDefaultScene(), 'cube', 'MIRROR'), 'cube', 'ARRAY');
    s = setModifier(s, 'cube', 'Array', { count: 4, relativeOffsetDisplace: vec3(0, 0, 1) });
    const arr = cubeOf(s).modifiers![1]!;
    expect(arr.type === 'ARRAY' && arr.count).toBe(4);
    expect(setModifier(s, 'cube', 'Array', { count: 4, relativeOffsetDisplace: vec3(0, 0, 1) })).toBe(s);
    expect(names(setModifier(s, 'cube', 'Array', { name: 'Mirror' }))).toEqual(['Mirror', 'Mirror.001']);
  });

  it('every change is one undo step', () => {
    const store = new SceneStore(blenderDefaultScene());
    store.execute(AddModifierOp('cube', 'ARRAY'));
    store.execute(SetModifierOp('cube', 'Array', { count: 3 }, 'Count'));
    store.execute(AddModifierOp('cube', 'MIRROR'));
    store.execute(MoveModifierOp('cube', 'Mirror', 0));
    expect(names(store.state)).toEqual(['Mirror', 'Array']);
    store.execute(RemoveModifierOp('cube', 'Array'));
    expect(names(store.state)).toEqual(['Mirror']);
    store.undo();
    store.undo();
    expect(names(store.state)).toEqual(['Array', 'Mirror']);
    store.undo();
    store.undo();
    const arr = cubeOf(store.state).modifiers![0]!;
    expect(arr.type === 'ARRAY' && arr.count).toBe(2);
    expect(store.log.filter((e) => e.kind === 'execute').map((e) => e.name)).toEqual([
      'Add Modifier',
      'Count',
      'Add Modifier',
      'Move to Index',
      'Remove Modifier',
    ]);
  });
});
