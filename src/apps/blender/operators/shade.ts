/**
 * object.shade_smooth / object.shade_flat (Object > Shade Smooth, Shade Flat),
 * on the selected mesh objects: every face of the base mesh becomes smooth or
 * flat. Modifiers carry the shading over to the faces they create.
 * FIDELITY? "Keep Sharp Edges" (on by default) keeps edges marked sharp; the lab
 * has no stored sharp edges, so the option has nothing to act on.
 */
import { withSmooth } from '../mesh/mesh-data';
import { type SceneObject, type SceneState, meshOf } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

export function shadeObjects(s: SceneState, smooth: boolean): SceneState {
  let changed = false;
  const objects = s.objects.map((o): SceneObject => {
    if (o.type !== 'mesh' || !s.selectedIds.includes(o.id)) return o;
    const m = meshOf(o);
    const already = smooth ? m.smoothFaces?.every(Boolean) === true : !m.smoothFaces?.some(Boolean);
    if (already || m.faces.length === 0) return o;
    changed = true;
    // Flat everywhere is the same as no attribute.
    return { ...o, mesh: withSmooth(m, smooth ? m.faces.map(() => true) : undefined) };
  });
  return changed ? { ...s, objects } : s;
}

// FIDELITY? Undo History names.
export const ShadeSmoothOp: OperatorCall = { name: 'Shade Smooth', apply: (s) => shadeObjects(s, true) };
export const ShadeFlatOp: OperatorCall = { name: 'Shade Flat', apply: (s) => shadeObjects(s, false) };
