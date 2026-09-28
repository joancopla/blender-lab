import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import { uniqueName } from '../scene/names';
import { type LightObject, lightData } from '../scene/scene';
import { SceneStore } from '../scene/store';
import { AddObjectOp, addObject } from './add';

describe('Add (Shift+A)', () => {
  it('a light at the origin, selected and active, with the defaults of its type', () => {
    const { state, id } = addObject(blenderDefaultScene(), { kind: 'light', lightType: 'SPOT' });
    const o = state.objects.find((x) => x.id === id) as LightObject;
    expect(o.name).toBe('Spot');
    expect(o.location).toEqual(vec3(0, 0, 0));
    expect(state.selectedIds).toEqual([id]);
    expect(state.activeId).toBe(id);
    expect(lightData(o).spotSizeDeg).toBe(45);
  });

  it('names like Blender: Cube is taken, so Cube.001', () => {
    let s = addObject(blenderDefaultScene(), { kind: 'mesh', primitive: 'cube' }).state;
    expect(s.objects.at(-1)!.name).toBe('Cube.001');
    s = addObject(s, { kind: 'mesh', primitive: 'cube' }).state;
    expect(s.objects.at(-1)!.name).toBe('Cube.002');
    expect(new Set(s.objects.map((o) => o.id)).size).toBe(s.objects.length);
    expect(uniqueName('Sphere', [])).toBe('Sphere');
    expect(uniqueName('Point.001', ['Point.001'])).toBe('Point.002');
  });

  it('nothing in Edit Mode', () => {
    const s = { ...blenderDefaultScene(), editObjectIds: ['cube'] };
    expect(addObject(s, { kind: 'light', lightType: 'SUN' }).state).toBe(s);
  });

  it('one undo step named after the operator', () => {
    const store = new SceneStore(blenderDefaultScene());
    store.execute(AddObjectOp({ kind: 'light', lightType: 'AREA' }));
    store.execute(AddObjectOp({ kind: 'mesh', primitive: 'uvSphere' }));
    expect(store.log.map((e) => e.name)).toEqual(['Add Light', 'Add UV Sphere']);
    store.undo();
    expect(store.state.objects.at(-1)!.name).toBe('Area');
  });
});
