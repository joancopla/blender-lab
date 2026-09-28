import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import { type LightObject, type SceneState, lightData } from '../scene/scene';
import { SceneStore } from '../scene/store';
import { SetLightOp, SetLightTypeOp, setLight } from './light';

const lightOf = (s: SceneState) => s.objects.find((o) => o.id === 'light') as LightObject;

describe('light settings', () => {
  it('changes a setting, kept in range', () => {
    let s = setLight(blenderDefaultScene(), 'light', { energy: 250 });
    expect(lightData(lightOf(s)).energy).toBe(250);
    s = setLight(s, 'light', { spotBlend: 3, spotSizeDeg: 0, energy: -5 });
    expect([lightOf(s).spotBlend, lightOf(s).spotSizeDeg, lightOf(s).energy]).toEqual([1, 1, 0]);
    s = setLight(s, 'light', { color: vec3(2, 0.5, -1) });
    expect(lightOf(s).color).toEqual(vec3(1, 0.5, 0));
  });

  it('the same value changes nothing; other objects are not lights', () => {
    const s = setLight(blenderDefaultScene(), 'light', { energy: 250 });
    expect(setLight(s, 'light', { energy: 250 })).toBe(s);
    const d = blenderDefaultScene();
    expect(setLight(d, 'cube', { energy: 5 })).toBe(d);
  });

  it('one undo step per change, named after the property', () => {
    const store = new SceneStore(blenderDefaultScene());
    store.execute(SetLightTypeOp('light', 'SUN'));
    store.execute(SetLightOp('light', { energy: 3 }, 'Strength'));
    expect(store.log.map((e) => e.name)).toEqual(['Type', 'Strength']);
    expect(lightData(lightOf(store.state)).lightType).toBe('SUN');
    store.undo();
    store.undo();
    expect(lightOf(store.state).lightType).toBe('POINT');
  });
});
