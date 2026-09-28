import { describe, expect, it } from 'vitest';
import { blenderDefaultScene } from '../scene/default-scene';
import { type MeshObject, type SceneState, meshOf } from '../scene/scene';
import { SceneStore } from '../scene/store';
import { SetAutoSmoothOp, ShadeAutoSmoothOp, ShadeFlatOp, ShadeSmoothOp, setAutoSmooth } from './shade';

describe('Object Data > Normals > Auto Smooth', () => {
  it('toggles the checkbox and sets the angle, limited to 0–180°', () => {
    const s = selected(['cube']);
    const on = setAutoSmooth(s, 'cube', { autoSmooth: true });
    expect(cubeOf(on).autoSmooth).toBe(true);
    expect(cubeOf(setAutoSmooth(on, 'cube', { angleDeg: 45 })).autoSmoothAngleDeg).toBe(45);
    expect(cubeOf(setAutoSmooth(on, 'cube', { angleDeg: 400 })).autoSmoothAngleDeg).toBe(180);
    // The default angle (30°) and an unchanged checkbox change nothing.
    expect(setAutoSmooth(s, 'cube', { autoSmooth: false, angleDeg: 30 })).toBe(s);
  });

  it('each change is one undo step named after the property', () => {
    const store = new SceneStore(selected(['cube']));
    expect(store.execute(SetAutoSmoothOp('cube', { autoSmooth: true }, 'Auto Smooth'))).toBe(true);
    expect(store.execute(SetAutoSmoothOp('cube', { angleDeg: 60 }, 'Angle'))).toBe(true);
    expect(store.log.slice(-2).map((e) => e.name)).toEqual(['Auto Smooth', 'Angle']);
  });
});

const cubeOf = (s: SceneState) => s.objects.find((o) => o.id === 'cube') as MeshObject;
const selected = (ids: string[]): SceneState => ({ ...blenderDefaultScene(), selectedIds: ids, activeId: ids[0] ?? null });

describe('Shade Smooth / Shade Flat', () => {
  it('Shade Smooth makes every face of the selected meshes smooth; others are untouched', () => {
    const before = selected(['cube', 'light']);
    const s = ShadeSmoothOp.apply(before);
    expect(meshOf(cubeOf(s)).smoothFaces).toEqual([true, true, true, true, true, true]);
    expect(s.objects.find((o) => o.id === 'light')).toBe(before.objects.find((o) => o.id === 'light'));
  });

  it('Shade Flat removes the smooth shading', () => {
    const s = ShadeFlatOp.apply(ShadeSmoothOp.apply(selected(['cube'])));
    expect(meshOf(cubeOf(s)).smoothFaces).toBeUndefined();
  });

  it('nothing selected or already shaded that way: no change, no undo step', () => {
    expect(ShadeSmoothOp.apply(selected([]))).toEqual(selected([]));
    const flat = selected(['cube']);
    expect(ShadeFlatOp.apply(flat)).toBe(flat);
    const store = new SceneStore(selected(['cube']));
    expect(store.execute(ShadeSmoothOp)).toBe(true);
    expect(store.execute(ShadeSmoothOp)).toBe(false);
    expect(store.log.at(-1)).toEqual({ kind: 'execute', name: 'Shade Smooth' });
  });

  it('undo brings back the flat cube', () => {
    const store = new SceneStore(selected(['cube']));
    store.execute(ShadeSmoothOp);
    store.undo();
    expect(meshOf(cubeOf(store.state)).smoothFaces).toBeUndefined();
  });

  it('Shade Auto Smooth: smooth faces and Auto Smooth on; Smooth and Flat leave the checkbox alone', () => {
    const auto = ShadeAutoSmoothOp.apply(selected(['cube']));
    expect(cubeOf(auto).autoSmooth).toBe(true);
    expect(meshOf(cubeOf(auto)).smoothFaces).toEqual([true, true, true, true, true, true]);
    // Already smooth, Auto Smooth stays on: nothing to do.
    expect(ShadeSmoothOp.apply(auto)).toBe(auto);
    const flat = ShadeFlatOp.apply(auto);
    expect(meshOf(cubeOf(flat)).smoothFaces).toBeUndefined();
    expect(cubeOf(flat).autoSmooth).toBe(true);
    expect(ShadeAutoSmoothOp.apply(auto)).toBe(auto);
  });
});
