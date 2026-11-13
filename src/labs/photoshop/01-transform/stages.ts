/**
 * Stages of the Transform lab. Phase 1 only has free mode; the stages of
 * specs/photoshop/01-transform.md come in phase 2.
 */
import type { LabStages } from '../../../core/stages/types';
import type { PsDecorations, PsSetup, PsState } from '../../../apps/photoshop/document/state';
import { freeDocument } from './documents';

export const PS_LAB01_STAGES: LabStages<PsState, PsSetup, PsDecorations> = {
  labId: 'ps-01-transform',
  stages: [],
  freeSetup: freeDocument,
};
