import type { LabDefinition } from '../../../core/lab';
import { RigApp } from '../../../apps/grandma3/rig-app';
import type { RigDecorations, RigSetup, RigState } from '../../../apps/grandma3/state';
import { PLOT_BLUEPRINT } from '../blueprint';
import { ILLUSTRATION } from './illustration';
import { LAB02_STAGES } from './stages';

export const ma3Lab02: LabDefinition<RigState, RigSetup, RigDecorations> = {
  id: 'ma3-02-addresses',
  number: '02',
  nameKey: 'ma3lab02.name',
  descKey: 'ma3lab02.desc',
  stages: LAB02_STAGES,
  illustration: ILLUSTRATION,
  signatureKeys: ['dmxFootprint', 'dmxAbsolute', 'dmxPercent'],
  blueprint: PLOT_BLUEPRINT,
  createApp: () => new RigApp(),
  page: {
    prefix: 'ma3lab02',
    controls: ['fader', 'value', 'pages', 'select', 'patch', 'undo'],
    real: ['percent', 'address', 'absolute'],
  },
};
