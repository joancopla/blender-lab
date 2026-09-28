/**
 * Shade Smooth, Shade Auto Smooth and Shade Flat (Object Context Menu and
 * Object menu), on the selected mesh objects:
 * - Shade Smooth: every face smooth, Auto Smooth off.
 * - Shade Auto Smooth: every face smooth, Auto Smooth on (Object Data >
 *   Normals, 30° by default): edges sharper than the angle stay sharp.
 * - Shade Flat: every face flat, Auto Smooth off.
 * Modifiers carry the face shading over to the faces they create; Auto Smooth
 * applies to the result.
 * FIDELITY? Whether Shade Smooth and Shade Flat turn Auto Smooth off.
 * FIDELITY? "Keep Sharp Edges" keeps edges marked sharp; the lab has none.
 */
import { withSmooth } from '../mesh/mesh-data';
import { type MeshObject, type SceneObject, type SceneState, meshOf } from '../scene/scene';
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
    if ((o.autoSmooth ?? false) !== auto) next = { ...next, autoSmooth: auto };
    if (next !== o) changed = true;
    return next;
  });
  return changed ? { ...s, objects } : s;
}

// FIDELITY? Undo History names.
export const ShadeSmoothOp: OperatorCall = { name: 'Shade Smooth', apply: (s) => shadeObjects(s, 'smooth') };
export const ShadeAutoSmoothOp: OperatorCall = { name: 'Shade Auto Smooth', apply: (s) => shadeObjects(s, 'autoSmooth') };
export const ShadeFlatOp: OperatorCall = { name: 'Shade Flat', apply: (s) => shadeObjects(s, 'flat') };
