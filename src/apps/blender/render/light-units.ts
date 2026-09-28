/**
 * Blender light units -> three.js light intensities. The only place where they
 * are converted (three.js lights are physical: a diffuse surface of albedo ρ
 * lit with irradiance E shows ρ · E / π, as in render/light-physics.ts).
 *
 * - Point, Spot: PointLight / SpotLight intensity I = P / 4π (W/sr); three.js
 *   then gives E = I · cos θ / d². Blender's Radius has no three.js equivalent
 *   here (it softens shadows; see the renderer).
 * - Sun: DirectionalLight intensity = Strength (W/m²).
 * - Area: RectAreaLight intensity is the panel's radiance L = P / (π A).
 *   Disks and ellipses become rectangles of the same area.
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
  readonly kind: 'point' | 'spot' | 'directional' | 'rectArea';
  readonly intensity: number;
  /** SpotLight: half angle (radians) and penumbra (0..1). */
  readonly angle?: number;
  readonly penumbra?: number;
  /** RectAreaLight size (metres). */
  readonly width?: number;
  readonly height?: number;
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
    case 'AREA': {
      const w = d.size;
      const h = d.shape === 'RECTANGLE' || d.shape === 'ELLIPSE' ? d.sizeY : d.size;
      const round = d.shape === 'DISK' || d.shape === 'ELLIPSE';
      // A disk of diameter w (x h) has area π w h / 4: a rectangle of the same area.
      const k = round ? Math.sqrt(Math.PI / 4) : 1;
      const width = Math.max(1e-4, w * k);
      const height = Math.max(1e-4, h * k);
      return {
        kind: 'rectArea',
        intensity: (d.energy * POWER_CALIBRATION) / (Math.PI * width * height),
        width,
        height,
      };
    }
  }
}

/** AmbientLight intensity for a uniform World (its colour is the World colour). */
export const worldAmbientIntensity = (w: WorldSettings): number => Math.PI * w.strength;

/** Exposure (stops) -> three.js toneMappingExposure. */
export const exposureFactor = (stops: number): number => 2 ** stops;
