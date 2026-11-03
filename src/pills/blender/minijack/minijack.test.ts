import { describe, expect, it } from 'vitest';
import { has } from '../../../core/i18n';
import { STEP_TEXT_FIELDS, parseToken } from '../../../core/pills/pill';
import frames from './frames.json';
import { minijack } from '.';

describe('minijack pill', () => {
  it('has 18 steps, one frame each, with unique ids', () => {
    expect(minijack.steps).toHaveLength(18);
    expect(frames).toHaveLength(18);
    expect(new Set(minijack.steps.map((s) => s.id)).size).toBe(18);
  });

  it('has its name, description and every step text', () => {
    expect(has(minijack.nameKey)).toBe(true);
    expect(has(minijack.descKey)).toBe(true);
    const missing = minijack.steps.flatMap((s) =>
      STEP_TEXT_FIELDS.filter((f) => !has(`${minijack.texts}.steps.${s.id}.${f}`)).map((f) => `${s.id}.${f}`),
    );
    expect(missing).toEqual([]);
  });

  it('has a text for every note and mouse button in the key rows', () => {
    const missing: string[] = [];
    for (const s of minijack.steps) {
      for (const token of s.rows.flat()) {
        const p = parseToken(token);
        if (p.kind === 'note' && !has(`${minijack.texts}.steps.${s.id}.notes.${p.id}`)) missing.push(`${s.id}: ${token}`);
        if (p.kind === 'keys')
          for (const part of p.parts) if (part.kind === 'mouse' && !has(`keyOverlay.mouse.${part.id}`)) missing.push(`${s.id}: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has an image for every step and for the cover', () => {
    expect(minijack.steps.every((s) => typeof s.image === 'string' && s.image.length > 0)).toBe(true);
    expect(minijack.cover).toBeTruthy();
    expect(minijack.stepCount).toBe(minijack.steps.length);
  });

  it('shows the beauty render only on the last step', () => {
    const last = minijack.steps.at(-1)!;
    expect(last.view.render).toBe(true);
    expect(minijack.steps.slice(0, -1).every((s) => !s.view.render && s.view.grid.length > 0)).toBe(true);
  });
});
