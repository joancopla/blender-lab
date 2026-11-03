import { describe, expect, it } from 'vitest';
import { has } from '../../../core/i18n';
import { STEP_TEXT_FIELDS, parseToken } from '../../../core/pills/pill';
import frames from './frames.json';
import { lighting } from '.';

describe('lighting pill', () => {
  it('has 13 steps, one frame each, with unique ids', () => {
    expect(lighting.steps).toHaveLength(13);
    expect(frames).toHaveLength(13);
    expect(new Set(lighting.steps.map((s) => s.id)).size).toBe(13);
  });

  it('has its name, description and every step text', () => {
    expect(has(lighting.nameKey)).toBe(true);
    expect(has(lighting.descKey)).toBe(true);
    const missing = lighting.steps.flatMap((s) =>
      STEP_TEXT_FIELDS.filter((f) => !has(`${lighting.texts}.steps.${s.id}.${f}`)).map((f) => `${s.id}.${f}`),
    );
    expect(missing).toEqual([]);
  });

  it('has a text for every note and mouse button in the key rows', () => {
    const missing: string[] = [];
    for (const s of lighting.steps) {
      for (const token of s.rows.flat()) {
        const p = parseToken(token);
        if (p.kind === 'note' && !has(`${lighting.texts}.steps.${s.id}.notes.${p.id}`)) missing.push(`${s.id}: ${token}`);
        if (p.kind === 'keys')
          for (const part of p.parts) if (part.kind === 'mouse' && !has(`keyOverlay.mouse.${part.id}`)) missing.push(`${s.id}: ${token}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has an image for every step and for the cover', () => {
    expect(lighting.steps.every((s) => typeof s.image === 'string' && s.image.length > 0)).toBe(true);
    expect(lighting.cover).toBeTruthy();
    expect(lighting.stepCount).toBe(lighting.steps.length);
  });

  it('shows the viewport, then the camera view, then the final render', () => {
    const kind = lighting.steps.map((s) => (s.view.render ? 'render' : s.view.camera ? 'camera' : 'viewport'));
    expect(kind).toEqual(['viewport', 'viewport', 'viewport', ...Array(9).fill('camera'), 'render']);
    expect(lighting.steps.slice(0, 3).every((s) => s.view.grid.length > 0)).toBe(true);
  });
});
