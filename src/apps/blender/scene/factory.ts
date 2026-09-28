/**
 * Helpers to build scenes for labs and stages.
 */
import { quatToEulerXYZ } from '../math/euler';
import { DEG, fromAxisAngle } from '../math/quat';
import { type Vec3, cross, dot, length, normalize, sub, vec3 } from '../math/vec3';
import { blenderDefaultScene } from './default-scene';
import type { LightObject, LightType, MeshObject, PrimitiveKind, SceneObject, SceneState } from './scene';

export function mesh(
  id: string,
  name: string,
  primitive: PrimitiveKind,
  location: Vec3,
  rotationDeg: Vec3 = vec3(0, 0, 0),
  scale: Vec3 = vec3(1, 1, 1),
): MeshObject {
  return { id, name, type: 'mesh', primitive, location, rotationDeg, scale };
}

/**
 * Camera and Light of the default scene plus the given objects. Selection and
 * active object are given by id (none by default).
 */
export function sceneWith(
  objects: readonly SceneObject[],
  selection: { selected?: readonly string[]; active?: string | null } = {},
): SceneState {
  const base = blenderDefaultScene();
  return {
    ...base,
    objects: [...base.objects.filter((o) => o.type !== 'mesh'), ...objects],
    selectedIds: selection.selected ?? [],
    activeId: selection.active ?? null,
  };
}

/**
 * XYZ Euler rotation (degrees) that points an object's local -Z from `from`
 * towards `to`: how a light or a camera is aimed.
 */
export function aimRotation(from: Vec3, to: Vec3): Vec3 {
  const dir = normalize(sub(to, from));
  const down = vec3(0, 0, -1);
  const axis = cross(down, dir);
  const s = length(axis);
  const c = dot(down, dir);
  const q = s > 1e-9 ? fromAxisAngle(normalize(axis), Math.atan2(s, c)) : fromAxisAngle(vec3(1, 0, 0), c < 0 ? Math.PI : 0);
  const e = quatToEulerXYZ(q);
  return vec3(e.x / DEG, e.y / DEG, e.z / DEG);
}

/** A light at `location`, aimed at `target` (Sun, Spot and Area shine along local -Z). */
export function light(
  id: string,
  name: string,
  lightType: LightType,
  location: Vec3,
  target: Vec3 = vec3(location.x, location.y, 0),
  settings: Partial<Omit<LightObject, 'id' | 'name' | 'type' | 'lightType' | 'location'>> = {},
): LightObject {
  return { id, name, type: 'light', lightType, location, rotationDeg: aimRotation(location, target), scale: vec3(1, 1, 1), ...settings };
}
