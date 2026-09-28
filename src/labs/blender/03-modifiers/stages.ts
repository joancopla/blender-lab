/**
 * Lab 03 stages (modifiers). Preview: only free mode for now; the stages come
 * in Phase 5. All texts live in ca.json under "lab03".
 */
import './texts';
import { vec3 } from '../../../apps/blender/math/vec3';
import { mesh, sceneWith } from '../../../apps/blender/scene/factory';
import type { BlenderLabStages as LabStages } from '../../../apps/blender/stages/types';

export const LAB03_STAGES: LabStages = {
  labId: '03-modifiers',
  stages: [],
  freeScene: () => sceneWith([mesh('cube', 'Cube', 'cube', vec3(0, 0, 1))], { selected: ['cube'], active: 'cube' }),
};
