import { describe, expect, it } from 'vitest';
import { SelectInteraction } from './select-interaction';

const NO = { ctrl: false, shift: false, alt: false };
const SHIFT = { ...NO, shift: true };
const CTRL = { ...NO, ctrl: true };

describe('SelectInteraction', () => {
  it('click without moving selects at the press point', () => {
    const s = new SelectInteraction();
    expect(s.pointerDown(0, NO, 100, 50)).toBe(true);
    s.pointerMove(101, 51); // under the drag threshold
    expect(s.pointerUp(0)).toEqual({ type: 'click', x: 100, y: 50, extend: false, ctrl: false, alt: false });
    expect(s.busy).toBe(false);
  });

  it('shift+click extends', () => {
    const s = new SelectInteraction();
    s.pointerDown(0, SHIFT, 10, 10);
    expect(s.pointerUp(0)).toEqual({ type: 'click', x: 10, y: 10, extend: true, ctrl: false, alt: false });
  });

  it('dragging makes a box; modifiers choose the mode', () => {
    for (const [mods, mode] of [
      [NO, 'set'],
      [SHIFT, 'add'],
      [CTRL, 'sub'],
    ] as const) {
      const s = new SelectInteraction();
      s.pointerDown(0, mods, 100, 100);
      s.pointerMove(60, 140);
      expect(s.box).toEqual({ x: 60, y: 100, width: 40, height: 40 });
      expect(s.pointerUp(0)).toEqual({ type: 'box', rect: { x: 60, y: 100, width: 40, height: 40 }, mode });
    }
  });

  it('right click or Esc cancels a box drag', () => {
    const s = new SelectInteraction();
    s.pointerDown(0, NO, 0, 0);
    s.pointerMove(50, 50);
    s.pointerDown(2, NO, 50, 50);
    expect(s.pointerUp(0)).toBeNull();
    expect(s.busy).toBe(false);

    s.pointerDown(0, NO, 0, 0);
    s.pointerMove(50, 50);
    expect(s.cancel()).toBe(true);
    expect(s.pointerUp(0)).toBeNull();
  });

  it('B then LMB drag extends; MMB or Shift+LMB drag subtracts', () => {
    const s = new SelectInteraction();
    s.startModal();
    expect(s.modalWaiting).toBe(true);
    s.pointerDown(0, NO, 0, 0);
    s.pointerMove(20, 20);
    expect(s.pointerUp(0)).toEqual({ type: 'box', rect: { x: 0, y: 0, width: 20, height: 20 }, mode: 'add' });
    expect(s.busy).toBe(false);

    s.startModal();
    s.pointerDown(1, NO, 0, 0);
    s.pointerMove(20, 20);
    expect(s.pointerUp(1)).toMatchObject({ type: 'box', mode: 'sub' });

    s.startModal();
    s.pointerDown(0, SHIFT, 0, 0);
    s.pointerMove(20, 20);
    expect(s.pointerUp(0)).toMatchObject({ type: 'box', mode: 'sub' });
  });

  it('B is cancelled with right click or Esc', () => {
    const s = new SelectInteraction();
    s.startModal();
    s.pointerDown(2, NO, 0, 0);
    expect(s.busy).toBe(false);
    s.startModal();
    expect(s.cancel()).toBe(true);
    expect(s.busy).toBe(false);
  });

  it('ignores other buttons when idle, so navigation can use them', () => {
    const s = new SelectInteraction();
    expect(s.pointerDown(1, NO, 0, 0)).toBe(false);
    expect(s.pointerDown(2, NO, 0, 0)).toBe(false);
  });
});
