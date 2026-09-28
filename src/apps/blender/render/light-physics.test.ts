import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import type { LightObject, LightType } from '../scene/scene';
import { blackbody, irradiance, lightPose, luminance, spotFactor, worldIrradiance } from './light-physics';

/** A light at (0, 0, h) pointing straight down (no rotation: local -Z is down). */
const light = (lightType: LightType, h: number, extra: Partial<LightObject> = {}): LightObject => ({
  id: 'l',
  name: 'Light',
  type: 'light',
  lightType,
  location: vec3(0, 0, h),
  rotationDeg: vec3(0, 0, 0),
  scale: vec3(1, 1, 1),
  ...extra,
});
const floor = vec3(0, 0, 0);
const up = vec3(0, 0, 1);

describe('light physics', () => {
  it('lights shine along their local -Z', () => {
    expect(lightPose(light('SPOT', 2)).direction).toEqual(vec3(0, 0, -1));
    const tilted = lightPose(light('SUN', 2, { rotationDeg: vec3(90, 0, 0) })).direction;
    expect(tilted.y).toBeCloseTo(1, 9);
  });

  it('Point: P / 4π over d² (plus the Radius²), and a quarter at twice the distance', () => {
    const e2 = irradiance(light('POINT', 2, { shadowSoftSize: 0 }), floor, up);
    expect(e2).toBeCloseTo(1000 / (4 * Math.PI) / 4, 9);
    const e4 = irradiance(light('POINT', 4, { shadowSoftSize: 0 }), floor, up);
    expect(e4 / e2).toBeCloseTo(0.25, 9);
    // The Radius keeps it finite next to the lamp.
    expect(irradiance(light('POINT', 0.001), floor, up)).toBeLessThan(1000 / (4 * Math.PI) / 0.01 + 1);
  });

  it('surfaces turned away get nothing; a slanted one gets the cosine', () => {
    expect(irradiance(light('POINT', 2), floor, vec3(0, 0, -1))).toBe(0);
    const straight = irradiance(light('SUN', 2), floor, up);
    const slanted = irradiance(light('SUN', 2), floor, vec3(Math.SQRT1_2, 0, Math.SQRT1_2));
    expect(slanted / straight).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it('Sun: Strength whatever the distance', () => {
    expect(irradiance(light('SUN', 2, { energy: 3 }), floor, up)).toBeCloseTo(3, 9);
    expect(irradiance(light('SUN', 200, { energy: 3 }), floor, up)).toBeCloseTo(3, 9);
  });

  it('Spot: full inside the cone, nothing outside, a smooth edge with Blend', () => {
    const cos = (deg: number) => Math.cos((deg * Math.PI) / 180);
    expect(spotFactor(45, 0.15, cos(10))).toBe(1);
    expect(spotFactor(45, 0.15, cos(30))).toBe(0);
    const edge = spotFactor(45, 0.15, cos(21.5));
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
    // A point 45° off the axis of a 45° spot is outside.
    expect(irradiance(light('SPOT', 1), vec3(1, 0, 0), up)).toBe(0);
  });

  it('Area: far away it behaves like a point of intensity P / π', () => {
    const far = irradiance(light('AREA', 20, { size: 0.5 }), floor, up);
    // (The samples off the axis make it a little less, 0.02 %.)
    expect(far / (1000 / Math.PI / 400)).toBeCloseTo(1, 3);
    // It only shines forwards.
    expect(irradiance(light('AREA', -2), floor, vec3(0, 0, -1))).toBe(0);
  });

  it('World: π · luminance · Strength', () => {
    expect(worldIrradiance({ color: vec3(1, 1, 1), strength: 2 })).toBeCloseTo(2 * Math.PI, 9);
  });

  it('Blackbody: luminance 1; warm is red, cold is blue', () => {
    for (const k of [2000, 6500, 12000]) expect(luminance(blackbody(k))).toBeCloseTo(1, 9);
    const warm = blackbody(2700);
    const cold = blackbody(10000);
    expect(warm.x).toBeGreaterThan(warm.z);
    expect(cold.z).toBeGreaterThan(cold.x);
  });
});
