import type { LabDefinition } from '../../../core/lab';
import { STOOL_BLUEPRINT } from '../blueprint';
import { BlenderApp } from '../../../apps/blender/blender-app';
import { type BlenderDecorations, type BlenderSetup, type BlenderState, toCoreLab } from '../../../apps/blender/stages/types';
import { LAB01_STAGES } from './stages';

export const lab01: LabDefinition<BlenderState, BlenderSetup, BlenderDecorations> = {
  id: '01-viewport',
  number: '01',
  nameKey: 'lab01.name',
  descKey: 'lab01.desc',
  stages: toCoreLab(LAB01_STAGES),
  blueprint: STOOL_BLUEPRINT,
  createApp: () => new BlenderApp(),
  page: {
    prefix: 'lab01',
    controls: ['orbit', 'pan', 'zoom', 'views', 'select', 'transform', 'undo'],
    real: ['navigation', 'emulation', 'views', 'frame', 'select', 'transform', 'clear', 'undo'],
  },
};
