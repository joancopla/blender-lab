import { describe, expect, it } from 'vitest';
import { STOOL_BLUEPRINT } from './blueprint';
import { LAB01_STAGES } from './01-viewport/stages';
import { LAB02_STAGES } from './02-edit-mode/stages';

const labs = [LAB01_STAGES, LAB02_STAGES];

describe('stool blueprint', () => {
  it('only uses stages that exist', () => {
    for (const l of STOOL_BLUEPRINT.lines) {
      const lab = labs.find((x) => x.labId === l.lab);
      expect(lab, `${l.id}: lab ${l.lab}`).toBeDefined();
      expect(lab!.stages.map((s) => s.id), `${l.id}: stage ${l.stage}`).toContain(l.stage);
    }
  });

  it('gives every stage at least one line', () => {
    for (const lab of labs) {
      for (const s of lab.stages) {
        expect(STOOL_BLUEPRINT.lines.some((l) => l.lab === lab.labId && l.stage === s.id), `${lab.labId}/${s.id}`).toBe(true);
      }
    }
  });

  it('has unique line ids and lines in every view', () => {
    const ids = STOOL_BLUEPRINT.lines.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of ['front', 'side', 'top'] as const) expect(STOOL_BLUEPRINT.lines.some((l) => l.view === v)).toBe(true);
  });
});
