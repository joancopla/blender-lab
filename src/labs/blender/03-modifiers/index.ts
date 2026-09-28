import type { LabDefinition } from '../../../core/lab';
import { STOOL_BLUEPRINT } from '../blueprint';
import { BlenderApp } from '../../../apps/blender/blender-app';
import { type BlenderDecorations, type BlenderSetup, type BlenderState, toCoreLab } from '../../../apps/blender/stages/types';
import { LAB03_STAGES } from './stages';

export const lab03: LabDefinition<BlenderState, BlenderSetup, BlenderDecorations> = {
  id: '03-modifiers',
  number: '03',
  nameKey: 'lab03.name',
  descKey: 'lab03.desc',
  stages: toCoreLab(LAB03_STAGES),
  blueprint: STOOL_BLUEPRINT,
  preview: true,
  createApp: () => new BlenderApp({ statistics: true, propertiesTabs: ['modifiers', 'data'] }),
  page: {
    prefix: 'lab03',
    controls: ['subdivisionSet', 'shade', 'properties', 'undo'],
    real: ['subdivisionSet', 'shade', 'levels', 'preview'],
  },
};
