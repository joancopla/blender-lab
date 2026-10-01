import type { LabDefinition } from '../../../core/lab';
import { RigApp } from '../../../apps/grandma3/rig-app';
import type { RigDecorations, RigSetup, RigState } from '../../../apps/grandma3/state';
import { PLOT_BLUEPRINT } from '../blueprint';
import { ILLUSTRATION } from './illustration';
import { LAB01_STAGES } from './stages';

export const ma3Lab01: LabDefinition<RigState, RigSetup, RigDecorations> = {
  id: 'ma3-01-dmx',
  number: '01',
  nameKey: 'ma3lab01.name',
  descKey: 'ma3lab01.desc',
  stages: LAB01_STAGES,
  illustration: ILLUSTRATION,
  signatureKeys: ['dmxUniverse', 'dmxChannel', 'dmxAddress'],
  blueprint: PLOT_BLUEPRINT,
  createApp: () => new RigApp(),
  page: {
    prefix: 'ma3lab01',
    controls: ['fader', 'value', 'pages', 'select', 'patch', 'undo'],
    real: ['dmxkey', 'patch', 'absolute', 'sheet'],
  },
};
