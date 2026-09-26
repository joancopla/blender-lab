/**
 * object.location_clear / rotation_clear / scale_clear (Alt+G, Alt+R, Alt+S),
 * on the selected objects.
 */
import { vec3 } from '../math/vec3';
import type { SceneObject, SceneState } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

type Field = 'location' | 'rotationDeg' | 'scale';

const CLEARED: Record<Field, ReturnType<typeof vec3>> = {
  location: vec3(0, 0, 0),
  rotationDeg: vec3(0, 0, 0),
  scale: vec3(1, 1, 1),
};

function clearField(s: SceneState, field: Field): SceneState {
  let changed = false;
  const objects = s.objects.map((o): SceneObject => {
    if (!s.selectedIds.includes(o.id)) return o;
    const v = o[field];
    const c = CLEARED[field];
    if (v.x === c.x && v.y === c.y && v.z === c.z) return o;
    changed = true;
    return { ...o, [field]: c };
  });
  return changed ? { ...s, objects } : s;
}

// FIDELITY? Undo History names.
export const ClearLocationOp: OperatorCall = { name: 'Clear Location', apply: (s) => clearField(s, 'location') };
export const ClearRotationOp: OperatorCall = { name: 'Clear Rotation', apply: (s) => clearField(s, 'rotationDeg') };
export const ClearScaleOp: OperatorCall = { name: 'Clear Scale', apply: (s) => clearField(s, 'scale') };
