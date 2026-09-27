import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { toggleEditMode } from '../operators/edit-mode';
import { mesh, sceneWith } from '../scene/factory';
import { componentsInRect, pickComponent, pickEdge, pickFace, pickVert } from './component-picking';
import { viewProjection, worldToScreen } from './screen';
import { AXIS_VIEW_ROTATIONS } from './view-state';

const SIZE = { width: 800, height: 600 };
// Front view of a cube at the origin: -Y face towards the viewer.
const FRONT = viewProjection(
  { rotation: AXIS_VIEW_ROTATIONS.front, target: vec3(0, 0, 0), distance: 10, projection: 'perspective', camera: null },
  SIZE,
  null,
);
const scene = toggleEditMode(sceneWith([mesh('c', 'Cube', 'cube', vec3(0, 0, 0))], { selected: ['c'], active: 'c' }));
const ctx = (xray: boolean) => ({ scene, projection: FRONT, size: SIZE, xray });
const FULL = { x: 0, y: 0, width: 800, height: 600 };

// Cube vertex index = 4*ix + 2*iy + iz: front (y = -1) vertices are 0, 1, 4, 5.
const at = (x: number, y: number, z: number) => worldToScreen(FRONT, SIZE, vec3(x, y, z))!;

describe('component picking', () => {
  it('picks the front vertex, not the one behind it', () => {
    const p = at(1, -1, 1);
    expect(pickVert(ctx(false), p.x + 2, p.y)).toEqual({ objectId: 'c', ref: { kind: 'vert', index: 5 } });
  });

  it('without X-ray, box select only takes visible vertices; with X-ray, all', () => {
    expect(componentsInRect(ctx(false), 'vert', FULL).get('c')).toEqual([0, 1, 4, 5]);
    expect(componentsInRect(ctx(true), 'vert', FULL).get('c')).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('edges: the nearest visible one', () => {
    const a = at(-1, -1, 1);
    const b = at(1, -1, 1);
    const hit = pickEdge(ctx(false), (a.x + b.x) / 2, a.y + 3)!;
    expect(hit.ref.kind).toBe('edge');
    expect(componentsInRect(ctx(false), 'edge', FULL).get('c')).toHaveLength(4); // the front face's edges
  });

  it('faces: the one under the cursor; X-ray uses face centres', () => {
    const c = at(0, -1, 0);
    expect(pickFace(ctx(false), c.x, c.y)?.ref).toEqual({ kind: 'face', index: 2 }); // -Y face
    expect(componentsInRect(ctx(false), 'face', FULL).get('c')).toEqual([2]);
    expect(componentsInRect(ctx(true), 'face', FULL).get('c')).toHaveLength(6);
  });

  it('nothing under the cursor', () => {
    expect(pickComponent(ctx(false), { vert: true, edge: false, face: false }, 5, 5)).toBeNull();
  });

  it('with vertex and face modes on, a nearby vertex wins over the face', () => {
    const p = at(1, -1, 1);
    const mode = { vert: true, edge: false, face: true };
    expect(pickComponent(ctx(false), mode, p.x + 3, p.y + 3)?.ref.kind).toBe('vert');
    const c = at(0, -1, 0);
    expect(pickComponent(ctx(false), mode, c.x, c.y)?.ref.kind).toBe('face');
  });
});
