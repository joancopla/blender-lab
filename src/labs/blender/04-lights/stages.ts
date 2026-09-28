/**
 * Lab 04 stages (lights). Preview: only free mode for now; the stages come in
 * Phase 5. All texts live in ca.json under "lab04".
 */
import './texts';
import { vec3 } from '../../../apps/blender/math/vec3';
import { mesh, sceneWith } from '../../../apps/blender/scene/factory';
import type { BlenderLabStages as LabStages } from '../../../apps/blender/stages/types';

export const LAB04_STAGES: LabStages = {
  labId: '04-lights',
  stages: [],
  freeScene: () =>
    sceneWith([mesh('floor', 'Plane', 'plane', vec3(0, 0, 0), vec3(0, 0, 0), vec3(4, 4, 1)), mesh('cube', 'Cube', 'cube', vec3(0, 0, 1))], {
      selected: ['cube'],
      active: 'cube',
    }),
};
