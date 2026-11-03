import { describe, expect, it } from 'vitest';
import { has } from '../../../core/i18n';
import { STEP_TEXT_FIELDS, parseToken } from '../../../core/pills/pill';
import frames from './frames.json';
import { speaker } from '.';

describe('speaker pill', () => {
  it('has 11 steps with unique ids and an image each', () => {
    expect(speaker.steps).toHaveLength(11);
    expect(frames).toHaveLength(11);
    expect(new Set(speaker.steps.map((s) => s.id)).size).toBe(11);
    expect(speaker.stepCount).toBe(speaker.steps.length);
    expect(speaker.steps.every((s) => typeof s.image === 'string' && s.image.length > 0)).toBe(true);
  });

  it('has its name, description and every step text', () => {
    expect(has(speaker.nameKey)).toBe(true);
    expect(has(speaker.descKey)).toBe(true);
    const missing = speaker.steps.flatMap((s) =>
      STEP_TEXT_FIELDS.filter((f) => !has(`${speaker.texts}.steps.${s.id}.${f}`)).map((f) => `${s.id}.${f}`),
    );
    expect(missing).toEqual([]);
  });

  it('has a text for every note and mouse button in the key rows', () => {
    const missing: string[] = [];
    for (const s of speaker.steps) {
      for (const token of s.rows.flat()) {
        const p = parseToken(token);
        if (p.kind === 'note' && !has(`${speaker.texts}.steps.${s.id}.notes.${p.id}`)) missing.push(`${s.id}: ${token}`);
        if (p.kind === 'keys')
          for (const part of p.parts) if (part.kind === 'mouse' && !has(`keyOverlay.mouse.${part.id}`)) missing.push(`${s.id}: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('models in Solid viewports and ends looking through the camera', () => {
    expect(speaker.steps.slice(0, -1).every((s) => !s.view.camera && s.view.grid.length > 0)).toBe(true);
    expect(speaker.steps.at(-1)!.view.camera).toBe(true);
    expect(speaker.steps.filter((s) => s.view.mode === 'Edit Mode').map((s) => s.id)).toEqual(['box', 'front', 'cone']);
  });
});
