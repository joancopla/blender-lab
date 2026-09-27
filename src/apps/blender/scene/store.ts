/**
 * Blender's history: the core undo history over Blender's scene state.
 */
import { HistoryStore, type OperatorCall as CoreOperatorCall } from '../../../core/history/store';
import type { SceneState } from './scene';

export { UNDO_STEPS, type LogEntry } from '../../../core/history/store';

export type OperatorCall = CoreOperatorCall<SceneState>;

export class SceneStore extends HistoryStore<SceneState> {}
