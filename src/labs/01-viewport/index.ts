import type { LabDefinition } from '../../engine/lab';
import { LAB01_STAGES } from './stages';

export const lab01: LabDefinition = {
  id: '01-viewport',
  nameKey: 'lab01.name',
  descKey: 'lab01.desc',
  initialScene: () => LAB01_STAGES.stages[0]!.scene(),
  stages: LAB01_STAGES,
  page: {
    prefix: 'lab01',
    controls: ['orbit', 'pan', 'zoom', 'views', 'select', 'transform', 'undo'],
    real: ['navigation', 'emulation', 'views', 'frame', 'select', 'transform', 'clear', 'undo'],
  },
};
