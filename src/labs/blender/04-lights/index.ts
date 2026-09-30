import type { LabDefinition } from '../../../core/lab';
import { STOOL_BLUEPRINT } from '../blueprint';
import { ILLUSTRATION } from './illustration';
import { BlenderApp } from '../../../apps/blender/blender-app';
import { type BlenderDecorations, type BlenderSetup, type BlenderState, toCoreLab } from '../../../apps/blender/stages/types';
import { LAB04_STAGES } from './stages';
import { vec3 } from '../../../apps/blender/math/vec3';

/**
 * New lights appear here instead of at the 3D Cursor (the origin), which is
 * inside the scenes' cube. A lab decision, not Blender's behaviour.
 */
const NEW_LIGHT_LOCATION = vec3(5, 5, 5);

export const lab04: LabDefinition<BlenderState, BlenderSetup, BlenderDecorations> = {
  id: '04-lights',
  number: '04',
  nameKey: 'lab04.name',
  descKey: 'lab04.desc',
  stages: toCoreLab(LAB04_STAGES),
  illustration: ILLUSTRATION,
  signatureKeys: ['shiftA', 'z', 'g', 'r'],
  blueprint: STOOL_BLUEPRINT,
  createApp: () =>
    new BlenderApp({
      statistics: false,
      addObjects: true,
      meter: true,
      propertiesTabs: ['data', 'world'],
      newLightLocation: NEW_LIGHT_LOCATION,
    }),
  page: {
    prefix: 'lab04',
    controls: ['add', 'shading', 'move', 'properties', 'meter', 'undo'],
    real: ['units', 'engines', 'world', 'meter', 'outOfScope'],
  },
};
