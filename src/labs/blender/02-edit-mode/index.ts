import type { LabDefinition } from '../../../core/lab';
import { STOOL_BLUEPRINT } from '../blueprint';
import { ILLUSTRATION } from './illustration';
import { BlenderApp } from '../../../apps/blender/blender-app';
import { type BlenderDecorations, type BlenderSetup, type BlenderState, toCoreLab } from '../../../apps/blender/stages/types';
import { LAB02_STAGES } from './stages';

export const lab02: LabDefinition<BlenderState, BlenderSetup, BlenderDecorations> = {
  id: '02-edit-mode',
  number: '02',
  nameKey: 'lab02.name',
  descKey: 'lab02.desc',
  stages: toCoreLab(LAB02_STAGES),
  illustration: ILLUSTRATION,
  signatureKeys: ['tab', 'e', 'i', 'ctrlR', 'ctrlB'],
  blueprint: STOOL_BLUEPRINT,
  createApp: () => new BlenderApp({ statistics: true, analyzer: true }),
  page: {
    prefix: 'lab02',
    controls: ['tab', 'modes', 'xray', 'loops', 'move', 'extrude', 'inset', 'loopcut', 'bevel', 'delete'],
    real: ['editMode', 'selectModes', 'xray', 'loops', 'extrude', 'inset', 'loopcut', 'bevel', 'delete', 'merge', 'fill', 'analyzer', 'outOfScope'],
  },
};
