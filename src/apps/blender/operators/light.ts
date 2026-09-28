/**
 * Editing a light's settings (Properties > Object Data): one undo step per
 * change, named after the property's label. Values are kept in Blender's
 * ranges.
 * FIDELITY? Ranges (Power >= 0, Spot Size 1°–180°, Blend 0–1, Angle 0°–180°).
 */
import type { LightObject, LightType, SceneObject, SceneState } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

export type LightPatch = Partial<Omit<LightObject, 'id' | 'type' | 'location' | 'rotationDeg' | 'scale'>>;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function fix(p: LightPatch): LightPatch {
  const out: Record<string, unknown> = { ...p };
  if (p.energy !== undefined) out.energy = Math.max(0, p.energy);
  if (p.shadowSoftSize !== undefined) out.shadowSoftSize = Math.max(0, p.shadowSoftSize);
  if (p.angleDeg !== undefined) out.angleDeg = clamp(p.angleDeg, 0, 180);
  if (p.spotSizeDeg !== undefined) out.spotSizeDeg = clamp(p.spotSizeDeg, 1, 180);
  if (p.spotBlend !== undefined) out.spotBlend = clamp(p.spotBlend, 0, 1);
  if (p.size !== undefined) out.size = Math.max(0, p.size);
  if (p.sizeY !== undefined) out.sizeY = Math.max(0, p.sizeY);
  if (p.color !== undefined) out.color = { x: clamp(p.color.x, 0, 1), y: clamp(p.color.y, 0, 1), z: clamp(p.color.z, 0, 1) };
  return out as LightPatch;
}

const same = (a: unknown, b: unknown): boolean =>
  a === b ||
  (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b));

/** Changes a light's settings; the same state if nothing changes. */
export function setLight(s: SceneState, id: string, patch: LightPatch): SceneState {
  let changed = false;
  const fixed = fix(patch);
  const objects = s.objects.map((o): SceneObject => {
    if (o.id !== id || o.type !== 'light') return o;
    const current = o as unknown as Record<string, unknown>;
    if (Object.entries(fixed).every(([k, v]) => same(current[k], v))) return o;
    changed = true;
    return { ...o, ...fixed } as LightObject;
  });
  return changed ? { ...s, objects } : s;
}

/** `label`: the property's label (Power, Radius, Spot Size...), used as the undo name. */
export const SetLightOp = (id: string, patch: LightPatch, label: string): OperatorCall => ({
  name: label,
  apply: (s) => setLight(s, id, patch),
});

/** The Type buttons (Point / Sun / Spot / Area). */
export const SetLightTypeOp = (id: string, lightType: LightType): OperatorCall => SetLightOp(id, { lightType }, 'Type');
