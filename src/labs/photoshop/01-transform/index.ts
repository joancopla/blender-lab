import type { LabDefinition } from '../../../core/lab';
import { PhotoshopApp } from '../../../apps/photoshop/photoshop-app';
import type { PsDecorations, PsSetup, PsState } from '../../../apps/photoshop/document/state';
import { PS_LAB01_STAGES } from './stages';
import './texts';

export const psLab01: LabDefinition<PsState, PsSetup, PsDecorations> = {
  id: 'ps-01-transform',
  number: '01',
  nameKey: 'pslab01.name',
  descKey: 'pslab01.desc',
  stages: PS_LAB01_STAGES,
  // Phase 1: the replica in free mode. The stages come in phase 2.
  preview: true,
  createApp: () => new PhotoshopApp(),
  page: {
    prefix: 'pslab01',
    controls: ['enter', 'scale', 'free', 'centre', 'rotate', 'distort', 'skew', 'perspective', 'apply', 'cancel', 'undo'],
    real: ['shortcut', 'pixels', 'warp', 'reference'],
  },
};
