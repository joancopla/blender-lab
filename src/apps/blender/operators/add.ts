/**
 * Add (Shift+A) in Object Mode: a new object at the 3D Cursor, not rotated,
 * selected and active (the others are deselected), with Blender's name and
 * defaults. One undo step, named after Blender's operator.
 * FIDELITY? The 3D Cursor is always at the world origin in the lab; Blender
 * also shows an Adjust Last Operation panel (size, location, rotation).
 * A lab can place new lights elsewhere (`lightAt`): a lab decision, so that a
 * new light is not hidden inside the scene's objects.
 */
import { type Vec3, vec3 } from '../math/vec3';
import { uniqueName } from '../scene/names';
import type { LightObject, LightType, MeshObject, PrimitiveKind, SceneObject, SceneState } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

export type AddKind = { readonly kind: 'light'; readonly lightType: LightType } | { readonly kind: 'mesh'; readonly primitive: PrimitiveKind };

const LIGHT_NAMES: Record<LightType, string> = { POINT: 'Point', SUN: 'Sun', SPOT: 'Spot', AREA: 'Area' };
const MESH_NAMES: Record<PrimitiveKind, string> = {
  plane: 'Plane',
  cube: 'Cube',
  uvSphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
};
/** Undo History names (the operators' names). FIDELITY? */
const MESH_OPS: Record<PrimitiveKind, string> = {
  plane: 'Add Plane',
  cube: 'Add Cube',
  uvSphere: 'Add UV Sphere',
  cylinder: 'Add Cylinder',
  cone: 'Add Cone',
  torus: 'Add Torus',
};

/** An id no other object has: "cube-2", "point-1"... */
function freshId(s: SceneState, base: string): string {
  const ids = new Set(s.objects.map((o) => o.id));
  for (let i = 1; ; i++) if (!ids.has(`${base}-${i}`)) return `${base}-${i}`;
}

/**
 * Adds the object (only in Object Mode). Returns the new state and the new
 * object's id. `lightAt`: where new lights go instead of the 3D Cursor.
 */
export function addObject(s: SceneState, what: AddKind, lightAt?: Vec3): { state: SceneState; id: string | null } {
  if ((s.editObjectIds?.length ?? 0) > 0) return { state: s, id: null };
  const names = s.objects.map((o) => o.name);
  const at = what.kind === 'light' && lightAt ? lightAt : vec3(0, 0, 0);
  const place = { location: at, rotationDeg: vec3(0, 0, 0), scale: vec3(1, 1, 1) };
  let object: SceneObject;
  if (what.kind === 'light') {
    const light: LightObject = {
      id: freshId(s, what.lightType.toLowerCase()),
      name: uniqueName(LIGHT_NAMES[what.lightType], names),
      type: 'light',
      lightType: what.lightType,
      ...place,
    };
    object = light;
  } else {
    const mesh: MeshObject = {
      id: freshId(s, what.primitive.toLowerCase()),
      name: uniqueName(MESH_NAMES[what.primitive], names),
      type: 'mesh',
      primitive: what.primitive,
      ...place,
    };
    object = mesh;
  }
  return {
    state: { ...s, objects: [...s.objects, object], selectedIds: [object.id], activeId: object.id },
    id: object.id,
  };
}

export const AddObjectOp = (what: AddKind, lightAt?: Vec3): OperatorCall => ({
  name: what.kind === 'light' ? 'Add Light' : MESH_OPS[what.primitive],
  apply: (s) => addObject(s, what, lightAt).state,
});
