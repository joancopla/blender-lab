import type { LabDefinition } from '../../engine/lab';
import { vec3 } from '../../engine/math/vec3';
import { blenderDefaultScene } from '../../engine/scene/default-scene';
import { mesh } from '../../engine/scene/factory';
import type { SceneState } from '../../engine/scene/scene';

/** Provisional scene until the stages exist (phase 7). */
function playground(): SceneState {
  const s = blenderDefaultScene();
  return {
    ...s,
    objects: [
      ...s.objects,
      mesh('cylinder', 'Cylinder', 'cylinder', vec3(4, 0, 1)),
      mesh('sphere', 'Sphere', 'uvSphere', vec3(-4, 0, 1)),
    ],
  };
}

export const lab02: LabDefinition = {
  id: '02-edit-mode',
  nameKey: 'lab02.name',
  descKey: 'lab02.desc',
  initialScene: playground,
  stages: { labId: '02-edit-mode', stages: [], freeScene: playground },
};
