import { describe, expect, it } from 'vitest';
import { type Vec3, vec3 } from '../math/vec3';
import { editBox, editSelectAll, toggleEditMode } from '../operators/edit-mode';
import { mesh, sceneWith } from '../scene/factory';
import { type MeshObject, type SceneState, meshOf } from '../scene/scene';
import { viewProjection } from '../viewport/screen';
import { AXIS_VIEW_ROTATIONS } from '../viewport/view-state';
import { ComponentTransform } from './component-transform';

const SIZE = { width: 800, height: 600 };
const FRONT = viewProjection(
  { rotation: AXIS_VIEW_ROTATIONS.front, target: vec3(0, 0, 0), distance: 10, projection: 'perspective', camera: null },
  SIZE,
  null,
);

/** Cube at (0,0,1) in Edit Mode with only its top face (vertices 1, 3, 5, 7) selected. */
function topFaceSelected(over: Partial<MeshObject> = {}): SceneState {
  let s = toggleEditMode(sceneWith([{ ...mesh('c', 'Cube', 'cube', vec3(0, 0, 1)), ...over }], { selected: ['c'], active: 'c' }));
  s = editSelectAll(s, 'deselect');
  return editBox(s, new Map([['c', [1, 3, 5, 7]]]), 'set');
}

const vertsOf = (s: SceneState) => meshOf(s.objects.find((o) => o.id === 'c') as MeshObject).verts;
const run = (s: SceneState, kind: 'translate' | 'rotate' | 'resize', keys: string[], opts = {}) => {
  const t = new ComponentTransform(kind, s, FRONT, SIZE, { x: 500, y: 300 }, opts);
  for (const k of keys) t.key(k, false);
  return t;
};
const expectVec = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
  expect(a.z).toBeCloseTo(b.z, 9);
};

describe('G / R / S on components', () => {
  it('G Z 1 moves only the selected vertices (in local mesh coordinates)', () => {
    const v = vertsOf(run(topFaceSelected(), 'translate', ['KeyZ', 'Digit1']).preview);
    expectVec(v[1]!, vec3(-1, -1, 2)); // top
    expectVec(v[0]!, vec3(-1, -1, -1)); // bottom unchanged
  });

  it('S 0.5 scales around the median of the selection', () => {
    const v = vertsOf(run(topFaceSelected(), 'resize', ['Digit0', 'Period', 'Digit5']).preview);
    expectVec(v[7]!, vec3(0.5, 0.5, 1));
    expectVec(v[6]!, vec3(1, 1, -1));
  });

  it('R Z 90 rotates the selection around its median', () => {
    const v = vertsOf(run(topFaceSelected(), 'rotate', ['KeyZ', 'Digit9', 'Digit0']).preview);
    // (1, 1) -> (-1, 1) after +90° around Z.
    expectVec(v[7]!, vec3(-1, 1, 1));
  });

  it('local axes follow the object; the object scale is respected', () => {
    const s = topFaceSelected({ rotationDeg: vec3(0, 0, 90), scale: vec3(2, 2, 2) });
    const v = vertsOf(run(s, 'translate', ['KeyX', 'KeyX', 'Digit2']).preview);
    // 2 m along the object's local X = 1 unit in mesh space (scale 2).
    expectVec(v[7]!, vec3(2, 1, 1));
  });

  it('a custom normal: local Z becomes the given direction', () => {
    const t = run(topFaceSelected(), 'translate', ['Digit1'], {
      normal: vec3(1, 0, 0),
      constraint: { space: 'local', kind: 'axis', axis: 2 },
      localLabel: 'normal',
    });
    expectVec(vertsOf(t.preview)[7]!, vec3(2, 1, 1));
    expect(t.header).toBe('D: [1|] (1.0000 m) along normal Z');
  });

  it('needs selected vertices; the scene is untouched until confirmed', () => {
    const s = topFaceSelected();
    expect(ComponentTransform.canStart(s)).toBe(true);
    expect(ComponentTransform.canStart(editSelectAll(s, 'deselect'))).toBe(false);
    run(s, 'translate', ['KeyZ', 'Digit5']);
    expectVec(vertsOf(s)[1]!, vec3(-1, -1, 1));
  });
});
