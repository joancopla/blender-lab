import type { LabDefinition } from '../../engine/lab';
import { LAB02_STAGES } from './stages';

export const lab02: LabDefinition = {
  id: '02-edit-mode',
  nameKey: 'lab02.name',
  descKey: 'lab02.desc',
  initialScene: () => LAB02_STAGES.stages[0]!.scene(),
  stages: LAB02_STAGES,
  page: {
    prefix: 'lab02',
    controls: ['tab', 'modes', 'xray', 'loops', 'move', 'extrude', 'inset', 'loopcut', 'bevel', 'delete'],
    real: ['editMode', 'selectModes', 'xray', 'loops', 'extrude', 'inset', 'loopcut', 'bevel', 'delete', 'merge', 'fill', 'analyzer', 'outOfScope'],
    statistics: true,
    analyzer: true,
  },
};
