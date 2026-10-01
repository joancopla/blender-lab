/**
 * Lab 05 (Materials and nodes): still being built. For now only free mode, with a
 * cube that has Blender's default material (Principled BSDF into Material Output).
 * Texts in ca.json under "lab05".
 */
import './texts';
import { vec3 } from '../../../apps/blender/math/vec3';
import { mesh, sceneWith } from '../../../apps/blender/scene/factory';
import type { SceneState } from '../../../apps/blender/scene/scene';
import { defaultMaterialTree } from '../../../apps/blender/shading/tree';
import type { BlenderLabStages as LabStages } from '../../../apps/blender/stages/types';

/** The default cube with its material "Material", as in Blender's startup file. */
export function materialScene(): SceneState {
  const cube = { ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 0)), materialSlots: ['material'] };
  return {
    ...sceneWith([cube], { selected: ['cube'], active: 'cube' }),
    materials: [{ id: 'material', name: 'Material', tree: defaultMaterialTree() }],
  };
}

export const LAB05_STAGES: LabStages = {
  labId: '05-materials',
  stages: [],
  freeScene: materialScene,
};
