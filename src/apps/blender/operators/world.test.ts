import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import { DEFAULT_WORLD, worldOf } from '../scene/scene';
import { SceneStore } from '../scene/store';
import { SetWorldOp, setWorld } from './world';

describe('World settings', () => {
  it('defaults, changes and limits', () => {
    const s = blenderDefaultScene();
    expect(worldOf(s)).toEqual(DEFAULT_WORLD);
    expect(worldOf(setWorld(s, { strength: 2 })).strength).toBe(2);
    expect(worldOf(setWorld(s, { strength: -1 })).strength).toBe(0);
    expect(worldOf(setWorld(s, { color: vec3(1, 0.5, 0) })).color).toEqual(vec3(1, 0.5, 0));
    expect(setWorld(s, { strength: DEFAULT_WORLD.strength })).toBe(s);
  });

  it('one undo step per change', () => {
    const store = new SceneStore(blenderDefaultScene());
    store.execute(SetWorldOp({ strength: 3 }, 'Strength'));
    expect(store.log.at(-1)!.name).toBe('Strength');
    store.undo();
    expect(worldOf(store.state).strength).toBe(1);
  });
});
