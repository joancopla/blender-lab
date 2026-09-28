/**
 * Shade Smooth, Shade Auto Smooth and Shade Flat (Object Context Menu and
 * Object menu), on the selected mesh objects:
 * - Shade Smooth: every face smooth.
 * - Shade Auto Smooth: every face smooth, and Auto Smooth on (Object Data >
 *   Normals, 30° by default): edges sharper than the angle stay sharp.
 * - Shade Flat: every face flat.
 * Shade Smooth and Shade Flat leave the Auto Smooth checkbox as it is.
 * Modifiers carry the face shading over to the faces they create; Auto Smooth
 * applies to the result.
 * FIDELITY? "Keep Sharp Edges" keeps edges marked sharp; the lab has none.
 */
import { withSmooth } from '../mesh/mesh-data';
import { DEFAULT_AUTO_SMOOTH_ANGLE_DEG, type MeshObject, type SceneObject, type SceneState, meshOf } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

export type Shading = 'smooth' | 'autoSmooth' | 'flat';

export function shadeObjects(s: SceneState, shading: Shading): SceneState {
  const smooth = shading !== 'flat';
  const auto = shading === 'autoSmooth';
  let changed = false;
  const objects = s.objects.map((o): SceneObject => {
    if (o.type !== 'mesh' || !s.selectedIds.includes(o.id)) return o;
    let next: MeshObject = o;
    const m = meshOf(o);
    const facesDone = smooth ? m.smoothFaces?.every(Boolean) === true : !m.smoothFaces?.some(Boolean);
    // Flat everywhere is the same as no attribute.
    if (!facesDone && m.faces.length > 0) next = { ...next, mesh: withSmooth(m, smooth ? m.faces.map(() => true) : undefined) };
    if (auto && !o.autoSmooth) next = { ...next, autoSmooth: true };
    if (next !== o) changed = true;
    return next;
  });
  return changed ? { ...s, objects } : s;
}

/** Object Data > Normals: the Auto Smooth checkbox and its angle (0–180°). */
export function setAutoSmooth(
  s: SceneState,
  objectId: string,
  patch: { readonly autoSmooth?: boolean; readonly angleDeg?: number },
): SceneState {
  let changed = false;
  const objects = s.objects.map((o): SceneObject => {
    if (o.type !== 'mesh' || o.id !== objectId) return o;
    let next: MeshObject = o;
    if (patch.autoSmooth !== undefined && patch.autoSmooth !== (o.autoSmooth ?? false)) {
      next = { ...next, autoSmooth: patch.autoSmooth };
    }
    if (patch.angleDeg !== undefined) {
      const angle = Math.max(0, Math.min(180, patch.angleDeg));
      if (angle !== (o.autoSmoothAngleDeg ?? DEFAULT_AUTO_SMOOTH_ANGLE_DEG)) next = { ...next, autoSmoothAngleDeg: angle };
    }
    if (next !== o) changed = true;
    return next;
  });
  return changed ? { ...s, objects } : s;
}

/** `label`: the property's label, used as the undo name ("Auto Smooth", "Angle"). */
export const SetAutoSmoothOp = (
  objectId: string,
  patch: { readonly autoSmooth?: boolean; readonly angleDeg?: number },
  label: string,
): OperatorCall => ({ name: label, apply: (s) => setAutoSmooth(s, objectId, patch) });

// FIDELITY? Undo History names.
export const ShadeSmoothOp: OperatorCall = { name: 'Shade Smooth', apply: (s) => shadeObjects(s, 'smooth') };
export const ShadeAutoSmoothOp: OperatorCall = { name: 'Shade Auto Smooth', apply: (s) => shadeObjects(s, 'autoSmooth') };
export const ShadeFlatOp: OperatorCall = { name: 'Shade Flat', apply: (s) => shadeObjects(s, 'flat') };
