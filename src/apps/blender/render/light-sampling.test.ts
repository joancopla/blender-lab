import { describe, expect, it } from 'vitest';
import { length, vec3 } from '../math/vec3';
import { type LightObject, lightData } from '../scene/scene';
import { MAX_SAMPLES, halton } from './accumulator';
import { lightSample } from './light-sampling';

const data = (extra: Partial<LightObject>) =>
  lightData({ id: 'l', name: 'L', type: 'light', lightType: 'POINT', location: vec3(0, 0, 0), rotationDeg: vec3(0, 0, 0), scale: vec3(1, 1, 1), ...extra });

describe('light samples for soft shadows', () => {
  it('Halton points are in 0..1 and spread out', () => {
    const xs = Array.from({ length: MAX_SAMPLES }, (_, k) => halton(k, 2));
    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(new Set(xs).size).toBe(MAX_SAMPLES);
  });

  it('Point: inside the Radius; Radius 0 does not move', () => {
    for (let k = 0; k < MAX_SAMPLES; k++) expect(length(lightSample(data({ shadowSoftSize: 0.3 }), k).offset)).toBeLessThanOrEqual(0.3 + 1e-9);
    expect(lightSample(data({ shadowSoftSize: 0 }), 5).offset).toEqual(vec3(0, 0, 0));
  });

  it('Area: on its surface, inside its size', () => {
    for (let k = 0; k < MAX_SAMPLES; k++) {
      const o = lightSample(data({ lightType: 'AREA', shape: 'RECTANGLE', size: 2, sizeY: 1 }), k).offset;
      expect(Math.abs(o.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(0.5);
      expect(o.z).toBe(0);
    }
  });

  it('Sun: tilted within half its Angle', () => {
    for (let k = 0; k < MAX_SAMPLES; k++) {
      const s = lightSample(data({ lightType: 'SUN', angleDeg: 10 }), k);
      expect(Math.hypot(s.tiltX, s.tiltY)).toBeLessThanOrEqual((5 * Math.PI) / 180 + 1e-9);
    }
  });
});
