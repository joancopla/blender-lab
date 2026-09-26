/**
 * Helpers to build scenes for labs and stages.
 */
import { type Vec3, vec3 } from '../math/vec3';
import { blenderDefaultScene } from './default-scene';
import type { MeshObject, PrimitiveKind, SceneObject, SceneState } from './scene';

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
