import { describe, expect, it } from 'vitest';
import { has } from '../../../core/i18n';
import { STEP_TEXT_FIELDS, parseToken } from '../../../core/pills/pill';
import { neon } from '.';

describe('neon look pill', () => {
  it('has 9 steps with unique ids and an image each', () => {
    expect(neon.steps).toHaveLength(9);
    expect(new Set(neon.steps.map((s) => s.id)).size).toBe(9);
    expect(neon.stepCount).toBe(neon.steps.length);
    expect(neon.steps.every((s) => typeof s.image === 'string' && s.image.length > 0)).toBe(true);
  });

  it('has its name, description and every step text', () => {
    expect(has(neon.nameKey)).toBe(true);
    expect(has(neon.descKey)).toBe(true);
    const missing = neon.steps.flatMap((s) =>
      STEP_TEXT_FIELDS.filter((f) => !has(`${neon.texts}.steps.${s.id}.${f}`)).map((f) => `${s.id}.${f}`),
    );
    expect(missing).toEqual([]);
  });

  it('has a text for every note and mouse button in the key rows', () => {
    const missing: string[] = [];
    for (const s of neon.steps) {
      for (const token of s.rows.flat()) {
        const p = parseToken(token);
        if (p.kind === 'note' && !has(`${neon.texts}.steps.${s.id}.notes.${p.id}`)) missing.push(`${s.id}: ${token}`);
        if (p.kind === 'keys')
          for (const part of p.parts) if (part.kind === 'mouse' && !has(`keyOverlay.mouse.${part.id}`)) missing.push(`${s.id}: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('looks through the camera until the F12 render of the last step', () => {
    expect(neon.steps.slice(0, -1).every((s) => s.view.camera && !s.view.render)).toBe(true);
    expect(neon.steps.at(-1)!.view.render).toBe(true);
  });
});
