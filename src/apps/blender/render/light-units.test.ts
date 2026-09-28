import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { type LightObject, lightData } from '../scene/scene';
import { irradiance } from './light-physics';
import { exposureFactor, threeLight, worldAmbientIntensity } from './light-units';

const light = (extra: Partial<LightObject>): LightObject => ({
  id: 'l',
  name: 'Light',
  type: 'light',
  lightType: 'POINT',
  location: vec3(0, 0, 3),
  rotationDeg: vec3(0, 0, 0),
  scale: vec3(1, 1, 1),
  ...extra,
});

describe('Blender -> three.js light units', () => {
  it('Point: three.js I / d² equals the physics irradiance (Radius 0)', () => {
    const o = light({ energy: 500, shadowSoftSize: 0 });
    const t = threeLight(lightData(o));
    expect(t.kind).toBe('point');
    expect(t.intensity / 9).toBeCloseTo(irradiance(o, vec3(0, 0, 0), vec3(0, 0, 1)), 9);
  });

  it('Sun: intensity is Strength', () => {
    expect(threeLight(lightData(light({ lightType: 'SUN', energy: 4 }))).intensity).toBe(4);
  });

  it('Spot: half angle and Blend as penumbra, same intensity as a Point', () => {
    const t = threeLight(lightData(light({ lightType: 'SPOT', spotSizeDeg: 60, spotBlend: 0.3 })));
    expect(t.angle).toBeCloseTo(Math.PI / 6, 9);
    expect(t.penumbra).toBe(0.3);
    expect(t.intensity).toBeCloseTo(1000 / (4 * Math.PI), 9);
  });

  it('Area: radiance P / πA; a disk becomes a rectangle of the same area', () => {
    const sq = threeLight(lightData(light({ lightType: 'AREA', size: 2 })));
    expect(sq.intensity).toBeCloseTo(1000 / (Math.PI * 4), 9);
    const disk = threeLight(lightData(light({ lightType: 'AREA', shape: 'DISK', size: 2 })));
    expect(disk.width! * disk.height!).toBeCloseTo(Math.PI, 9);
  });

  it('World and exposure', () => {
    expect(worldAmbientIntensity({ color: vec3(1, 1, 1), strength: 2 })).toBeCloseTo(2 * Math.PI, 9);
    expect(exposureFactor(1)).toBe(2);
    expect(exposureFactor(-2)).toBe(0.25);
  });
});
