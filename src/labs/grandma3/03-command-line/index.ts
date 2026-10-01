import type { LabDefinition } from '../../../core/lab';
import { RigApp } from '../../../apps/grandma3/rig-app';
import type { RigDecorations, RigSetup, RigState } from '../../../apps/grandma3/state';
import { PLOT_BLUEPRINT } from '../blueprint';
import { ILLUSTRATION } from './illustration';
import { LAB03_STAGES } from './stages';

export const ma3Lab03: LabDefinition<RigState, RigSetup, RigDecorations> = {
  id: 'ma3-03-command-line',
  number: '03',
  nameKey: 'ma3lab03.name',
  descKey: 'ma3lab03.desc',
  stages: LAB03_STAGES,
  illustration: ILLUSTRATION,
  signatureKeys: ['ma3Thru', 'ma3At', 'ma3Please'],
  blueprint: PLOT_BLUEPRINT,
  createApp: () => new RigApp(),
  page: {
    prefix: 'ma3lab03',
    controls: ['type', 'please', 'back', 'clear', 'clearAll', 'undo'],
    real: ['default', 'minus', 'single', 'clear'],
  },
};
