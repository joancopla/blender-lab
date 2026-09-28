import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { evaluatedMesh } from '../modifiers/stack';
import { addModifier } from '../operators/modifiers';
import { blenderDefaultScene } from './default-scene';
import { unionBounds } from './scene';

describe('bounds for framing (Numpad ., Home)', () => {
  it("measure the modifiers' result when asked, the base mesh by default", () => {
    const s = addModifier(blenderDefaultScene(), 'cube', 'ARRAY');
    const cube = s.objects.filter((o) => o.id === 'cube');
    // Default Array: 2 copies, one cube width apart along X.
    expect(unionBounds(cube, (o) => evaluatedMesh(o, s))).toEqual({ min: vec3(-1, -1, -1), max: vec3(3, 1, 1) });
    expect(unionBounds(cube)).toEqual({ min: vec3(-1, -1, -1), max: vec3(1, 1, 1) });
  });
});
