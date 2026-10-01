import type { LabDefinition } from '../../../core/lab';
import { STOOL_BLUEPRINT } from '../blueprint';
import { ILLUSTRATION } from './illustration';
import { BlenderApp } from '../../../apps/blender/blender-app';
import { type BlenderDecorations, type BlenderSetup, type BlenderState, toCoreLab } from '../../../apps/blender/stages/types';
import { LAB05_STAGES } from './stages';

export const lab05: LabDefinition<BlenderState, BlenderSetup, BlenderDecorations> = {
  id: '05-materials',
  number: '05',
  nameKey: 'lab05.name',
  descKey: 'lab05.desc',
  stages: toCoreLab(LAB05_STAGES),
  // Being built: free mode only (phase 2, the Shader Editor).
  preview: true,
  illustration: ILLUSTRATION,
  signatureKeys: ['shiftA', 'g'],
  blueprint: STOOL_BLUEPRINT,
  createApp: () => new BlenderApp({ statistics: false, shaderEditor: true }),
  page: {
    prefix: 'lab05',
    controls: ['add', 'link', 'move', 'cut', 'nodeKeys', 'view', 'undo'],
    real: ['shading', 'material', 'addMenu', 'uv'],
  },
};
