import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { blenderDefaultScene } from '../scene/default-scene';
import type { SceneState } from '../scene/scene';
import { chooseClickTarget, pickAt, rayTriangle } from './picking';
import { viewProjection, worldToScreen } from './screen';
import { AXIS_VIEW_ROTATIONS } from './view-state';

const SIZE = { width: 800, height: 600 };
const frontVp = (distance = 10) =>
  viewProjection(
    { rotation: AXIS_VIEW_ROTATIONS.front, target: vec3(0, 0, 0), distance, projection: 'perspective', camera: null },
    SIZE,
    null,
  );

/** Cube at the origin and a second cube right behind it (+Y), both on the view axis. */
function twoCubes(): SceneState {
  const s = blenderDefaultScene();
  return {
    ...s,
    objects: [
      ...s.objects,
      {
        id: 'cube2',
        name: 'Cube.001',
        type: 'mesh',
        primitive: 'cube',
        location: vec3(0, 4, 0),
        rotationDeg: vec3(0, 0, 0),
        scale: vec3(1, 1, 1),
      },
    ],
  };
}

describe('rayTriangle', () => {
  it('hits from both sides and misses outside', () => {
    const a = vec3(-1, -1, 0);
    const b = vec3(1, -1, 0);
    const c = vec3(0, 1, 0);
    expect(rayTriangle(vec3(0, 0, 5), vec3(0, 0, -1), a, b, c)).toBeCloseTo(5, 9);
    expect(rayTriangle(vec3(0, 0, -5), vec3(0, 0, 1), a, b, c)).toBeCloseTo(5, 9);
    expect(rayTriangle(vec3(3, 0, 5), vec3(0, 0, -1), a, b, c)).toBeNull();
    expect(rayTriangle(vec3(0, 0, 5), vec3(0, 0, 1), a, b, c)).toBeNull();
  });
});

describe('pickAt', () => {
  it('hits the cube in the centre of the Front view, closest first', () => {
    const hits = pickAt(twoCubes(), frontVp(), SIZE, 400, 300);
    expect(hits.map((h) => h.id)).toEqual(['cube', 'cube2']);
    // Front face of the cube is 1 m in front of the origin: depth 9.
    expect(hits[0]!.depth).toBeCloseTo(9, 6);
  });

  it('misses in empty space', () => {
    expect(pickAt(twoCubes(), frontVp(), SIZE, 5, 5)).toEqual([]);
  });

  it('respects scale and rotation', () => {
    const s = twoCubes();
    const scaled: SceneState = {
      ...s,
      objects: s.objects.map((o) => (o.id === 'cube' ? { ...o, scale: vec3(3, 1, 1), location: vec3(0, 0, 0) } : o)),
    };
    const vp = frontVp();
    const p = worldToScreen(vp, SIZE, vec3(2.5, -1, 0))!;
    expect(pickAt(scaled, vp, SIZE, p.x, p.y).map((h) => h.id)).toContain('cube');
    expect(pickAt(twoCubes(), vp, SIZE, p.x, p.y).map((h) => h.id)).not.toContain('cube');
  });

  it('picks the light by its icon and skips hidden objects', () => {
    const s = blenderDefaultScene();
    const vp = viewProjection(
      { rotation: AXIS_VIEW_ROTATIONS.front, target: vec3(0, 0, 0), distance: 30, projection: 'perspective', camera: null },
      SIZE,
      null,
    );
    const light = s.objects.find((o) => o.id === 'light')!;
    const p = worldToScreen(vp, SIZE, light.location)!;
    expect(pickAt(s, vp, SIZE, p.x + 4, p.y).map((h) => h.id)).toEqual(['light']);
    expect(pickAt(s, vp, SIZE, p.x, p.y, { hiddenIds: new Set(['light']) })).toEqual([]);
  });

  it('picks the camera near its wire', () => {
    const s = blenderDefaultScene();
    const cam = s.objects.find((o) => o.id === 'camera')!;
    const vp = frontVp(30);
    // The camera's origin (apex of the pyramid) is on its wires.
    const p = worldToScreen(vp, SIZE, cam.location)!;
    expect(pickAt(s, vp, SIZE, p.x + 2, p.y).map((h) => h.id)).toContain('camera');
  });
});

describe('click cycling', () => {
  it('first click takes the closest; clicking again on the active one takes the next', () => {
    const s = twoCubes(); // cube is selected and active
    const hits = [
      { id: 'cube', depth: 9 },
      { id: 'cube2', depth: 13 },
    ];
    expect(chooseClickTarget(hits, s)).toBe('cube2');
    const s2 = { ...s, selectedIds: ['cube2'], activeId: 'cube2' };
    expect(chooseClickTarget(hits, s2)).toBe('cube');
    const none = { ...s, selectedIds: [], activeId: 'cube' };
    expect(chooseClickTarget(hits, none)).toBe('cube');
    expect(chooseClickTarget([], s)).toBeNull();
  });
});
