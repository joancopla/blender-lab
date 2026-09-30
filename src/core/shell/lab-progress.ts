/** A lab's saved progress, summed up for the index and the lab page. */
import type { LabDefinition } from '../lab';
import { ProgressStore } from '../stages/progress';

export interface LabProgress {
  readonly done: number;
  readonly total: number;
  readonly started: boolean;
}

export function progressOf(lab: LabDefinition): LabProgress {
  const p = ProgressStore.read(lab.id);
  const total = lab.stages.stages.length;
  const done = lab.stages.stages.filter((s) => p.completed.includes(s.id)).length;
  return { done, total, started: done > 0 || p.current !== 0 };
}
