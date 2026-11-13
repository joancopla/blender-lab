import { describe, expect, it } from 'vitest';
import { type Point, type Quad, applyMat, isParallelogram, pt, quadBounds, quadCentre, quadToRect, rectQuad, rectToQuad } from '../geometry';
import { beginSession, pushBox, sessionLayerQuad, undoBox } from './session';
import { type Modifiers, dragAction, dragQuad, fromReadout, quadAngle, quickTransform, readout } from './transform';

const NONE: Modifiers = { shift: false, alt: false, ctrl: false };
const SHIFT: Modifiers = { ...NONE, shift: true };
const ALT: Modifiers = { ...NONE, alt: true };
const CTRL: Modifiers = { ...NONE, ctrl: true };

const RECT = { x: 100, y: 100, w: 400, h: 200 };
const BOX = rectQuad(RECT);

function close(a: Point, b: Point, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
}

function closeQuad(a: Quad, b: Quad, digits = 6): void {
  a.forEach((p, i) => close(p, b[i]!, digits));
}

describe('homography', () => {
  it('takes the corners of the rectangle to the corners of the quad', () => {
    const q: Quad = [pt(120, 90), pt(480, 140), pt(520, 330), pt(60, 300)];
    const m = rectToQuad(RECT, q);
    rectQuad(RECT).forEach((p, i) => close(applyMat(m, p), q[i]!));
    const back = quadToRect(q, RECT);
    q.forEach((p, i) => close(applyMat(back, p), rectQuad(RECT)[i]!));
  });

  it('is affine for a parallelogram: the centre goes to the centre', () => {
    const q: Quad = [pt(0, 0), pt(200, 50), pt(260, 150), pt(60, 100)];
    close(applyMat(rectToQuad(RECT, q), pt(300, 200)), quadCentre(q));
  });
});

describe('which action a drag does', () => {
  it('Free Transform: scale, and distort, skew or perspective with the modifiers', () => {
    expect(dragAction('free', 'br', NONE)).toBe('scale');
    expect(dragAction('free', 'br', CTRL)).toBe('distort');
    expect(dragAction('free', 'br', { shift: true, alt: true, ctrl: true })).toBe('perspective');
    expect(dragAction('free', 't', NONE)).toBe('scale');
    expect(dragAction('free', 't', CTRL)).toBe('distort');
    expect(dragAction('free', 't', { ...CTRL, shift: true })).toBe('skew');
    expect(dragAction('free', 'inside', NONE)).toBe('move');
    expect(dragAction('free', 'outside', NONE)).toBe('rotate');
  });

  it('a Transformar command keeps its handles to that transform', () => {
    expect(dragAction('scale', 'br', CTRL)).toBe('scale');
    expect(dragAction('scale', 'outside', NONE)).toBe('none');
    expect(dragAction('skew', 't', NONE)).toBe('skew');
    expect(dragAction('distort', 'tl', NONE)).toBe('distort');
    expect(dragAction('perspective', 'tl', NONE)).toBe('perspective');
    expect(dragAction('rotate', 'outside', NONE)).toBe('rotate');
  });
});

describe('scale', () => {
  it('is proportional by default, from the opposite corner', () => {
    // Half the diagonal towards the top left corner.
    const q = dragQuad(BOX, 'free', 'br', pt(500, 300), pt(300, 200), NONE);
    closeQuad(q, rectQuad({ x: 100, y: 100, w: 200, h: 100 }));
  });

  it('stays proportional when the drag is off the diagonal', () => {
    const q = dragQuad(BOX, 'free', 'br', pt(500, 300), pt(350, 300), NONE);
    const b = quadBounds(q);
    expect(b.w / b.h).toBeCloseTo(2, 6);
    close(q[0], pt(100, 100));
  });

  it('with Shift each direction is free', () => {
    const q = dragQuad(BOX, 'free', 'br', pt(500, 300), pt(700, 250), SHIFT);
    closeQuad(q, rectQuad({ x: 100, y: 100, w: 600, h: 150 }));
  });

  it('with Alt scales from the centre', () => {
    const q = dragQuad(BOX, 'free', 'br', pt(500, 300), pt(400, 250), ALT);
    closeQuad(q, rectQuad({ x: 200, y: 150, w: 200, h: 100 }));
  });

  it('a side handle with Shift only changes its own direction', () => {
    const q = dragQuad(BOX, 'free', 'r', pt(500, 200), pt(900, 260), SHIFT);
    closeQuad(q, rectQuad({ x: 100, y: 100, w: 800, h: 200 }));
  });

  it('past the opposite corner the layer flips', () => {
    const q = dragQuad(BOX, 'free', 'br', pt(500, 300), pt(-300, -100), NONE);
    close(q[2], pt(-300, -100));
    close(q[0], pt(100, 100));
  });

  it('follows the sides of a box that was rotated', () => {
    const turned = quickTransform(BOX, 'rotate90cw');
    // Its "right" side now points down the screen.
    const q = dragQuad(turned, 'free', 'r', pt(300, 400), pt(300, 600), SHIFT);
    expect(quadAngle(q)).toBeCloseTo(90, 6);
    expect(quadBounds(q).h).toBeCloseTo(600, 6);
    expect(quadBounds(q).w).toBeCloseTo(200, 6);
  });
});

describe('move and rotate', () => {
  it('dragging inside moves the box', () => {
    const q = dragQuad(BOX, 'free', 'inside', pt(300, 200), pt(330, 180), NONE);
    closeQuad(q, rectQuad({ x: 130, y: 80, w: 400, h: 200 }));
  });

  it('dragging outside rotates around the centre, clockwise positive', () => {
    const c = quadCentre(BOX);
    const q = dragQuad(BOX, 'free', 'outside', pt(c.x + 300, c.y), pt(c.x, c.y + 300), NONE);
    expect(quadAngle(q)).toBeCloseTo(90, 6);
    close(quadCentre(q), c);
  });

  it('with Shift the angle snaps to 15° steps', () => {
    const c = quadCentre(BOX);
    const rad = (20 * Math.PI) / 180;
    const q = dragQuad(BOX, 'free', 'outside', pt(c.x + 300, c.y), pt(c.x + 300 * Math.cos(rad), c.y + 300 * Math.sin(rad)), SHIFT);
    expect(quadAngle(q)).toBeCloseTo(15, 6);
  });

  it('outside the box, Scale does nothing', () => {
    expect(dragQuad(BOX, 'scale', 'outside', pt(700, 500), pt(600, 600), NONE)).toBe(BOX);
  });
});

describe('skew, distort and perspective', () => {
  it('skew slides a side along itself', () => {
    const q = dragQuad(BOX, 'skew', 't', pt(300, 100), pt(380, 40), NONE);
    closeQuad(q, [pt(180, 100), pt(580, 100), pt(500, 300), pt(100, 300)]);
    expect(isParallelogram(q)).toBe(true);
  });

  it('Ctrl + Shift on a side handle skews in Free Transform', () => {
    const q = dragQuad(BOX, 'free', 'r', pt(500, 200), pt(540, 260), { ...CTRL, shift: true });
    closeQuad(q, [pt(100, 100), pt(500, 160), pt(500, 360), pt(100, 300)]);
  });

  it('distort moves one corner on its own', () => {
    const q = dragQuad(BOX, 'distort', 'tr', pt(500, 100), pt(460, 150), NONE);
    closeQuad(q, [pt(100, 100), pt(460, 150), pt(500, 300), pt(100, 300)]);
    expect(isParallelogram(q)).toBe(false);
  });

  it('Ctrl on a corner distorts in Free Transform', () => {
    const q = dragQuad(BOX, 'free', 'tl', pt(100, 100), pt(150, 130), CTRL);
    close(q[0], pt(150, 130));
    close(q[1], pt(500, 100));
  });

  it('perspective mirrors the corner at the other end of the side', () => {
    const q = dragQuad(BOX, 'perspective', 'tl', pt(100, 100), pt(180, 110), NONE);
    closeQuad(q, [pt(180, 100), pt(420, 100), pt(500, 300), pt(100, 300)]);
    const v = dragQuad(BOX, 'perspective', 'tl', pt(100, 100), pt(110, 150), NONE);
    closeQuad(v, [pt(100, 150), pt(500, 100), pt(500, 300), pt(100, 250)]);
  });

  it('a drag that would fold the box is ignored', () => {
    expect(dragQuad(BOX, 'distort', 'tl', pt(100, 100), pt(600, 400), NONE)).toBe(BOX);
  });
});

describe('options bar values', () => {
  it('reads 100 %, 0° for the starting box', () => {
    const r = readout(RECT, BOX);
    expect(r).toMatchObject({ x: 300, y: 200 });
    expect(r.w).toBeCloseTo(100, 6);
    expect(r.h).toBeCloseTo(100, 6);
    expect(r.angle).toBeCloseTo(0, 6);
    expect(r.skew).toBeCloseTo(0, 6);
  });

  it('reads scale and rotation, and builds the same box back', () => {
    const scaled = dragQuad(BOX, 'free', 'br', pt(500, 300), pt(300, 200), NONE);
    const c = quadCentre(scaled);
    const turned = dragQuad(scaled, 'free', 'outside', pt(c.x + 100, c.y), pt(c.x + 100 * Math.cos(0.5), c.y + 100 * Math.sin(0.5)), NONE);
    const r = readout(RECT, turned);
    expect(r.w).toBeCloseTo(50, 6);
    expect(r.h).toBeCloseTo(50, 6);
    expect(r.angle).toBeCloseTo((0.5 * 180) / Math.PI, 6);
    closeQuad(fromReadout(RECT, r), turned);
  });

  it('round-trips a skewed box', () => {
    const q = dragQuad(BOX, 'skew', 't', pt(300, 100), pt(380, 100), NONE);
    closeQuad(fromReadout(RECT, readout(RECT, q)), q);
  });
});

describe('commands without a box', () => {
  it('flip horizontal mirrors the corners around the centre', () => {
    closeQuad(quickTransform(BOX, 'flipH'), [pt(500, 100), pt(100, 100), pt(100, 300), pt(500, 300)]);
  });

  it('rotating 180° is not the same as flipping', () => {
    closeQuad(quickTransform(BOX, 'rotate180'), [pt(500, 300), pt(100, 300), pt(100, 100), pt(500, 100)]);
  });

  it('rotate 90° clockwise turns the top side to point down', () => {
    expect(quadAngle(quickTransform(BOX, 'rotate90cw'))).toBeCloseTo(90, 6);
    expect(quadAngle(quickTransform(BOX, 'rotate90ccw'))).toBeCloseTo(-90, 6);
  });
});

describe('session', () => {
  it('starts with an upright box around a layer that was rotated before', () => {
    const layer = quickTransform(BOX, 'rotate90cw');
    const s = beginSession('a', layer, 'free');
    expect(s.start).toEqual(quadBounds(layer));
    expect(readout(s.start, s.box).angle).toBeCloseTo(0, 6);
    closeQuad(sessionLayerQuad(s), layer);
  });

  it('applies what happens to the box to the corners of the layer', () => {
    const layer = quickTransform(BOX, 'rotate90cw');
    const s0 = beginSession('a', layer, 'free');
    const box = dragQuad(s0.box, 'free', 'inside', pt(0, 0), pt(50, -20), NONE);
    const s1 = pushBox(s0, box);
    sessionLayerQuad(s1).forEach((p, i) => close(p, pt(layer[i]!.x + 50, layer[i]!.y - 20)));
    expect(undoBox(s1).box).toBe(s0.box);
    expect(undoBox(s0)).toBe(s0);
  });
});
