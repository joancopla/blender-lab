/**
 * Blender light units -> three.js light intensities. The only place where they
 * are converted (three.js lights are physical: a diffuse surface of albedo ρ
 * lit with irradiance E shows ρ · E / π, as in render/light-physics.ts).
 *
 * - Point, Spot: PointLight / SpotLight intensity I = P / 4π (W/sr); three.js
 *   then gives E = I · cos θ / d². Blender's Radius has no three.js equivalent
 *   here (it softens shadows; see the renderer).
 * - Sun: DirectionalLight intensity = Strength (W/m²).
 * - Area: a wide SpotLight of intensity P / π moved over the panel at every
 *   sample (see below).
 * - World: AmbientLight intensity π · Strength (three.js gives irradiance =
 *   colour · intensity, and a uniform sky of radiance L gives E = π L).
 *
 * POWER_CALIBRATION scales Point, Spot and Area power: 1 means Blender's watts
 * follow the formulas above exactly. To be calibrated once against a Blender
 * render of a reference scene.
 * FIDELITY? POWER_CALIBRATION, and the Spot cone limited to 179.8°.
 */
import type { LightData, WorldSettings } from '../scene/scene';

export const POWER_CALIBRATION = 1;

export interface ThreeLightSettings {
  readonly kind: 'point' | 'spot' | 'directional';
  readonly intensity: number;
  /** SpotLight: half angle (radians) and penumbra (0..1). */
  readonly angle?: number;
  readonly penumbra?: number;
}

export function threeLight(d: LightData): ThreeLightSettings {
  switch (d.lightType) {
    case 'POINT':
      return { kind: 'point', intensity: (d.energy * POWER_CALIBRATION) / (4 * Math.PI) };
    case 'SPOT': {
      const full = Math.min(d.spotSizeDeg, 179.8);
      return {
        kind: 'spot',
        intensity: (d.energy * POWER_CALIBRATION) / (4 * Math.PI),
        angle: ((full / 2) * Math.PI) / 180,
        penumbra: Math.max(0, Math.min(1, d.spotBlend)),
      };
    }
    case 'SUN':
      return { kind: 'directional', intensity: d.energy };
    case 'AREA':
      // Each progressive sample puts the whole panel at one point of its
      // surface (light-sampling.ts): a flat diffuse emitter whose intensity is
      // (P / π) · cos θ, i.e. a SpotLight of intensity P / π opening to 90°
      // with its edge fading like the cosine. Averaging the samples integrates
      // the panel, and it casts shadows (a RectAreaLight cannot).
      // Adaptat de cifog-lab (xavikai), labs/lighting/scene.js.
      return {
        kind: 'spot',
        intensity: (d.energy * POWER_CALIBRATION) / Math.PI,
        angle: (89.5 * Math.PI) / 180,
        penumbra: 1,
      };
  }
}

/** AmbientLight intensity for a uniform World (its colour is the World colour). */
export const worldAmbientIntensity = (w: WorldSettings): number => Math.PI * w.strength;

/** Exposure (stops) -> three.js toneMappingExposure. */
export const exposureFactor = (stops: number): number => 2 ** stops;
