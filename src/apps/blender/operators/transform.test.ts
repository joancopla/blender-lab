import { describe, expect, it } from 'vitest';
import { vec3, type Vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import type { MeshObject, SceneState } from '../scene/scene';
import { viewProjection, worldToScreen } from '../viewport/screen';
import { AXIS_VIEW_ROTATIONS } from '../viewport/view-state';
import { TransformModal, type TransformKind } from './transform';

const SIZE = { width: 800, height: 600 };
const FRONT = viewProjection(
  { rotation: AXIS_VIEW_ROTATIONS.front, target: vec3(0, 0, 0), distance: 10, projection: 'perspective', camera: null },
  SIZE,
  null,
);
const CENTRE = { x: 400, y: 300 };

function cubeScene(over: Partial<MeshObject> = {}, extra: MeshObject[] = []): SceneState {
  const s = blenderDefaultScene();
  return {
    ...s,
    objects: [...s.objects.map((o) => (o.id === 'cube' ? ({ ...o, ...over } as MeshObject) : o)), ...extra],
    selectedIds: ['cube', ...extra.map((e) => e.id)],
  };
}

const cube = (s: SceneState) => s.objects.find((o) => o.id === 'cube')!;

function run(kind: TransformKind, scene: SceneState, keys: string[], mouse = { x: 500, y: 300 }) {
  const m = new TransformModal(kind, scene, FRONT, SIZE, mouse);
  for (const k of keys) {
    const shift = k.startsWith('Shift+');
    m.key(shift ? k.slice(6) : k, shift);
  }
  return m;
}

const expectVec = (a: Vec3, b: Vec3, digits = 6) => {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
};

describe('Grab (G)', () => {
  it('G X 2: exact 2 m along global X', () => {
    const m = run('translate', cubeScene(), ['KeyX', 'Digit2']);
    expectVec(cube(m.preview).location, vec3(2, 0, 0));
    expect(m.header).toBe('D: [2|] (2.0000 m) along global X');
  });

  it('G Z - 1 . 5: negative decimals', () => {
    const m = run('translate', cubeScene(), ['KeyZ', 'Minus', 'Digit1', 'Period', 'Digit5']);
    expectVec(cube(m.preview).location, vec3(0, 0, -1.5));
  });

  it('X X is the local axis; X X X removes the constraint', () => {
    const rotated = cubeScene({ rotationDeg: vec3(0, 0, 90) });
    const local = run('translate', rotated, ['KeyX', 'KeyX', 'Digit1']);
    expect(local.constraint).toEqual({ space: 'local', kind: 'axis', axis: 0 });
    expectVec(cube(local.preview).location, vec3(0, 1, 0));
    const none = run('translate', rotated, ['KeyX', 'KeyX', 'KeyX']);
    expect(none.constraint).toBeNull();
  });

  it('without constraint, typed numbers go to X, Tab moves to Y and Z', () => {
    const m = run('translate', cubeScene(), ['Digit1', 'Tab', 'Digit2', 'Tab', 'Digit3']);
    expectVec(cube(m.preview).location, vec3(1, 2, 3));
  });

  it('follows the mouse in the view plane', () => {
    const m = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    m.mouseMove(500, 250);
    const loc = cube(m.preview).location;
    // Front view: screen right is +X, screen up is +Z; Y does not change.
    expect(loc.x).toBeGreaterThan(0);
    expect(loc.z).toBeGreaterThan(0);
    expect(loc.y).toBeCloseTo(0, 9);
    // The object stays under the mouse: its screen position moved by the mouse delta.
    const s = worldToScreen(FRONT, SIZE, loc)!;
    expect(s.x).toBeCloseTo(500, 6);
    expect(s.y).toBeCloseTo(250, 6);
  });

  it('axis constraint ignores the perpendicular mouse movement', () => {
    const m = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    m.key('KeyZ', false);
    m.mouseMove(550, 300);
    expectVec(cube(m.preview).location, vec3(0, 0, 0));
  });

  it('Ctrl snaps to 1 m increments along the axis', () => {
    const m = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    m.key('KeyX', false);
    const onePointThree = worldToScreen(FRONT, SIZE, vec3(1.3, 0, 0))!;
    m.setModifiers(true, false);
    m.mouseMove(onePointThree.x, 300);
    expectVec(cube(m.preview).location, vec3(1, 0, 0));
  });

  it('Shift slows the mouse down (precision)', () => {
    const fast = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    fast.mouseMove(500, 300);
    const slow = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    slow.setModifiers(false, true);
    slow.mouseMove(500, 300);
    expect(cube(slow.preview).location.x).toBeCloseTo(cube(fast.preview).location.x * 0.1, 9);
  });

  it('Shift+Z locks Z (moves in the XY plane)', () => {
    const top = viewProjection(
      { rotation: AXIS_VIEW_ROTATIONS.top, target: vec3(0, 0, 0), distance: 10, projection: 'perspective', camera: null },
      SIZE,
      null,
    );
    const m = new TransformModal('translate', cubeScene(), top, SIZE, CENTRE);
    m.key('KeyZ', true);
    expect(m.constraint).toEqual({ space: 'global', kind: 'plane', axis: 2 });
    m.mouseMove(450, 250);
    const loc = cube(m.preview).location;
    expect(loc.z).toBeCloseTo(0, 9);
    expect(loc.x).toBeGreaterThan(0);
    expect(loc.y).toBeGreaterThan(0);
  });

  it('middle click picks the axis closest to the mouse movement', () => {
    const m = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    m.mouseMove(400, 200); // straight up: Z in the Front view
    expect(m.button(1)).toBeNull();
    expect(m.constraint).toEqual({ space: 'global', kind: 'axis', axis: 2 });
  });

  it('Backspace returns control to the mouse', () => {
    const m = new TransformModal('translate', cubeScene(), FRONT, SIZE, CENTRE);
    m.key('KeyX', false);
    m.key('Digit5', false);
    m.key('Backspace', false);
    expectVec(cube(m.preview).location, vec3(0, 0, 0));
  });
});

describe('Rotate (R)', () => {
  it('R Z 45: exact rotation around global Z', () => {
    const m = run('rotate', cubeScene(), ['KeyZ', 'Digit4', 'Digit5']);
    expectVec(cube(m.preview).rotationDeg, vec3(0, 0, 45));
    expect(m.header).toBe('Rot: [45|] along global Z');
  });

  it('rotates positions around the median point', () => {
    const other: MeshObject = { ...(cube(cubeScene()) as MeshObject), id: 'c2', name: 'Cube.001', location: vec3(2, 0, 0) };
    const m = run('rotate', cubeScene({}, [other]), ['KeyZ', 'Digit9', 'Digit0']);
    const p = m.preview;
    // Pivot is (1, 0, 0): the cubes swap to (1, -1, 0) and (1, 1, 0).
    expectVec(cube(p).location, vec3(1, -1, 0));
    expectVec(p.objects.find((o) => o.id === 'c2')!.location, vec3(1, 1, 0));
  });

  it('with the mouse, turning counter-clockwise on screen turns the object counter-clockwise', () => {
    const m = new TransformModal('rotate', cubeScene(), FRONT, SIZE, { x: 500, y: 300 });
    m.mouseMove(400, 200); // a quarter turn counter-clockwise around the pivot
    // Front view: counter-clockwise on screen is a rotation around -Y.
    expectVec(cube(m.preview).rotationDeg, vec3(0, -90, 0), 4);
    // Constraining to Y (pointing away from the viewer) gives the same visual result.
    m.key('KeyY', false);
    expectVec(cube(m.preview).rotationDeg, vec3(0, -90, 0), 4);
  });

  it('Ctrl snaps to 5°', () => {
    const m = new TransformModal('rotate', cubeScene(), FRONT, SIZE, { x: 500, y: 300 });
    m.key('KeyY', false);
    m.setModifiers(true, false);
    const a = 33 * (Math.PI / 180);
    m.mouseMove(400 + 100 * Math.cos(a), 300 - 100 * Math.sin(a));
    expect(Math.abs(cube(m.preview).rotationDeg.y)).toBeCloseTo(35, 6);
  });
});

describe('Resize (S)', () => {
  it('S 1.5: uniform scale', () => {
    const m = run('resize', cubeScene(), ['Digit1', 'Period', 'Digit5']);
    expectVec(cube(m.preview).scale, vec3(1.5, 1.5, 1.5));
  });

  it('S Z 2 and S Shift+Z 2', () => {
    expectVec(cube(run('resize', cubeScene(), ['KeyZ', 'Digit2']).preview).scale, vec3(1, 1, 2));
    expectVec(cube(run('resize', cubeScene(), ['Shift+KeyZ', 'Digit2']).preview).scale, vec3(2, 2, 1));
  });

  it('global axis on a rotated object scales the matching local axis', () => {
    const m = run('resize', cubeScene({ rotationDeg: vec3(0, 0, 90) }), ['KeyX', 'Digit2']);
    expectVec(cube(m.preview).scale, vec3(1, 2, 1));
  });

  it('follows the ratio of distances to the pivot; Ctrl snaps to 0.1', () => {
    const m = new TransformModal('resize', cubeScene(), FRONT, SIZE, { x: 500, y: 300 });
    m.mouseMove(600, 300);
    expectVec(cube(m.preview).scale, vec3(2, 2, 2));
    m.setModifiers(true, false);
    m.mouseMove(555, 300);
    expectVec(cube(m.preview).scale, vec3(1.6, 1.6, 1.6));
  });

  it('scales positions around the median point', () => {
    const other: MeshObject = { ...(cube(cubeScene()) as MeshObject), id: 'c2', name: 'Cube.001', location: vec3(2, 0, 0) };
    const p = run('resize', cubeScene({}, [other]), ['Digit2']).preview;
    expectVec(cube(p).location, vec3(-1, 0, 0));
    expectVec(p.objects.find((o) => o.id === 'c2')!.location, vec3(3, 0, 0));
  });
});

describe('confirm and cancel', () => {
  it('Enter / LMB confirm; Esc / RMB cancel; cancel keeps the exact original', () => {
    const s = cubeScene();
    const m = new TransformModal('translate', s, FRONT, SIZE, CENTRE);
    m.mouseMove(530, 270);
    expect(m.key('Enter', false)).toBe('confirm');
    expect(m.key('NumpadEnter', false)).toBe('confirm');
    expect(m.button(0)).toBe('confirm');
    expect(m.key('Escape', false)).toBe('cancel');
    expect(m.button(2)).toBe('cancel');
    expect(m.original).toBe(s);
  });

  it('cannot start without a selection', () => {
    expect(TransformModal.canStart({ ...cubeScene(), selectedIds: [] })).toBe(false);
    expect(TransformModal.canStart(cubeScene())).toBe(true);
  });

  it('only selected objects move', () => {
    const m = run('translate', cubeScene(), ['KeyX', 'Digit3']);
    const light = m.preview.objects.find((o) => o.id === 'light')!;
    expectVec(light.location, vec3(4.0762, 1.0055, 5.9039));
  });
});
