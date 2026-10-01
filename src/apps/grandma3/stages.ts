/** Stage types for grandMA3 / DMX labs, over the core's generic ones. */
import type { CheckResult, LabStages, StageContext, StageDefinition } from '../../core/stages/types';
import type { RigDecorations, RigSetup, RigState } from './state';

export type RigStageContext = StageContext<RigState>;
export type RigCheckResult = CheckResult<RigDecorations>;
export type RigStageDefinition = StageDefinition<RigState, RigSetup, RigDecorations>;
export type RigLabStages = LabStages<RigState, RigSetup, RigDecorations>;
