import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import type { SceneState } from '../scene/scene';
import { SceneStore } from '../../../core/history/store';
import { SetTransformOp, dimensions, readField, setField } from './set-transform';

const cubeOf = (s: SceneState) => s.objects.find((o) => o.id === 'cube')!;

describe('N panel transform edits', () => {
  it('sets one component', () => {
    const s = setField(blenderDefaultScene(), 'cube', 'location', 2, 3);
    expect(cubeOf(s).location).toEqual(vec3(0, 0, 3));
    expect(readField(cubeOf(s), 'location', 2)).toBe(3);
  });

  it('dimensions change the scale', () => {
    const s = setField(blenderDefaultScene(), 'cube', 'dimensions', 0, 3);
    expect(cubeOf(s).scale).toEqual(vec3(1.5, 1, 1));
    expect(dimensions(cubeOf(s))).toEqual(vec3(3, 2, 2));
  });

  it('cameras and lights have no dimensions to change', () => {
    const s = blenderDefaultScene();
    expect(setField(s, 'light', 'dimensions', 0, 5)).toBe(s);
  });

  it('each edit is one undo step; the same value is not recorded', () => {
    const store = new SceneStore(blenderDefaultScene());
    store.execute(SetTransformOp('cube', 'rotation', 2, 45));
    expect(store.execute(SetTransformOp('cube', 'rotation', 2, 45))).toBe(false);
    expect(cubeOf(store.state).rotationDeg).toEqual(vec3(0, 0, 45));
    store.undo();
    expect(cubeOf(store.state).rotationDeg).toEqual(vec3(0, 0, 0));
  });
});
