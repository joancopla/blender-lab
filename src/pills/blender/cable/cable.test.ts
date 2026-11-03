import { describe, expect, it } from 'vitest';
import { has } from '../../../core/i18n';
import { STEP_TEXT_FIELDS, parseToken } from '../../../core/pills/pill';
import frames from './frames.json';
import { cable } from '.';

describe('cable pill', () => {
  it('has 11 steps, one frame each, with unique ids', () => {
    expect(cable.steps).toHaveLength(11);
    expect(frames).toHaveLength(11);
    expect(new Set(cable.steps.map((s) => s.id)).size).toBe(11);
    expect(cable.stepCount).toBe(cable.steps.length);
  });

  it('has its name, description and every step text', () => {
    expect(has(cable.nameKey)).toBe(true);
    expect(has(cable.descKey)).toBe(true);
    const missing = cable.steps.flatMap((s) =>
      STEP_TEXT_FIELDS.filter((f) => !has(`${cable.texts}.steps.${s.id}.${f}`)).map((f) => `${s.id}.${f}`),
    );
    expect(missing).toEqual([]);
  });

  it('has a text for every note and mouse button in the key rows', () => {
    const missing: string[] = [];
    for (const s of cable.steps) {
      for (const token of s.rows.flat()) {
        const p = parseToken(token);
        if (p.kind === 'note' && !has(`${cable.texts}.steps.${s.id}.notes.${p.id}`)) missing.push(`${s.id}: ${token}`);
        if (p.kind === 'keys')
          for (const part of p.parts) if (part.kind === 'mouse' && !has(`keyOverlay.mouse.${part.id}`)) missing.push(`${s.id}: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('draws the curve over every Edit Mode step and the bare curve of step 1', () => {
    const withOverlay = cable.steps.filter((s) => (s.view.overlay?.length ?? 0) > 0).map((s) => s.id);
    expect(withOverlay).toEqual(['curve', 'edit', 'select', 'extrude', 'auto', 'open', 'cross']);
    expect(cable.steps.filter((s) => s.view.mode === 'Edit Mode').every((s) => withOverlay.includes(s.id))).toBe(true);
  });

  it('shows the F12 render only on the last step', () => {
    expect(cable.steps.at(-1)!.view.render).toBe(true);
    expect(cable.steps.slice(0, -1).every((s) => !s.view.render && s.view.grid.length > 0)).toBe(true);
    expect(cable.steps.every((s) => typeof s.image === 'string' && s.image.length > 0)).toBe(true);
  });
});
