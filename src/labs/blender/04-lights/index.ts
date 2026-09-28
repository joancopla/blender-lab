import type { LabDefinition } from '../../../core/lab';
import { STOOL_BLUEPRINT } from '../blueprint';
import { BlenderApp } from '../../../apps/blender/blender-app';
import { type BlenderDecorations, type BlenderSetup, type BlenderState, toCoreLab } from '../../../apps/blender/stages/types';
import { LAB04_STAGES } from './stages';

export const lab04: LabDefinition<BlenderState, BlenderSetup, BlenderDecorations> = {
  id: '04-lights',
  number: '04',
  nameKey: 'lab04.name',
  descKey: 'lab04.desc',
  stages: toCoreLab(LAB04_STAGES),
  blueprint: STOOL_BLUEPRINT,
  preview: true,
  createApp: () => new BlenderApp({ statistics: false, addObjects: true, meter: true, propertiesTabs: ['data', 'world'] }),
  page: {
    prefix: 'lab04',
    controls: ['add', 'move', 'undo'],
    real: ['units', 'preview'],
  },
};
