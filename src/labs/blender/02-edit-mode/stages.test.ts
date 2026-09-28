import { describe, expect, it } from 'vitest';
import { vec3 } from '../../../apps/blender/math/vec3';
import { type MeshData, meshCounts } from '../../../apps/blender/mesh/mesh-data';
import { dissolveVerts, deleteElements } from '../../../apps/blender/mesh/ops/delete';
import { merge } from '../../../apps/blender/mesh/ops/merge';
import { editBox, editLoopOrRing, setSelectMode, toggleEditMode } from '../../../apps/blender/operators/edit-mode';
import { type MeshObject, type SceneState, meshOf } from '../../../apps/blender/scene/scene';
import { topologyOf } from '../../../apps/blender/edit/selection';
import type { BlenderStageContext as StageContext, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { viewProjection } from '../../../apps/blender/viewport/screen';
import { defaultViewState } from '../../../apps/blender/viewport/view-state';
import { has } from '../../../core/i18n';
import { LAB02_STAGES, REFERENCES, dirtyCube } from './stages';

const SIZE = { width: 1200, height: 800 };
const stage = (id: string): StageDefinition => LAB02_STAGES.stages.find((s) => s.id === id)!;

function ctx(st: StageDefinition, scene: SceneState, memory = new Map<string, unknown>()): StageContext {
  const view = defaultViewState();
  return {
    scene,
    initialScene: st.scene(),
    view,
    projection: viewProjection({ ...view, camera: null }, SIZE, null),
    size: SIZE,
    shading: 'SOLID',
    log: [],
    memory,
  };
}

/** Replaces an object's mesh (world reference -> local, given its location). */
function withMesh(s: SceneState, id: string, worldMesh: MeshData): SceneState {
  return {
    ...s,
    objects: s.objects.map((o) => {
      if (o.id !== id) return o;
      const at = o.location;
      return { ...o, mesh: { ...worldMesh, verts: worldMesh.verts.map((p) => vec3(p.x - at.x, p.y - at.y, p.z - at.z)) } } as MeshObject;
    }),
  };
}
const obj = (s: SceneState, id: string) => s.objects.find((o) => o.id === id) as MeshObject;

describe('lab 02 stages', () => {
  it('every text key exists in ca.json', () => {
    for (const s of LAB02_STAGES.stages) {
      for (const k of [s.titleKey, s.instructionKey, s.successKey, ...s.hintKeys]) expect(has(k), k).toBe(true);
      for (const k of s.keys) expect(has(`keys.${k}`), `keys.${k}`).toBe(true);
    }
  });

  it('1. Tab, then vertices, edges and faces in their modes', () => {
    const st = stage('modes');
    const memory = new Map<string, unknown>();
    let s = st.scene();
    expect(st.check(ctx(st, s, memory)).feedback?.key).toBe('lab02.s1.enterEdit');
    s = toggleEditMode(s);
    s = editBox(s, new Map([['cube', [1, 4, 5]]]), 'set');
    expect(st.check(ctx(st, s, memory)).feedback?.key).toBe('lab02.s1.mode.edge');
    s = setSelectMode(s, 'edge', false);
    const top = topologyOf(meshOf(obj(s, 'cube'))).faceEdges[5]!; // the top face's edges
    s = editBox(s, new Map([['cube', top]]), 'set');
    expect(st.check(ctx(st, s, memory)).feedback?.key).toBe('lab02.s1.mode.face');
    s = setSelectMode(s, 'face', false);
    s = editBox(s, new Map([['cube', [1, 2]]]), 'set');
    expect(st.check(ctx(st, s, memory)).done).toBe(true);
  });

  it('2. all four +X vertices; three of them means some are hidden', () => {
    const st = stage('xray');
    const s = st.scene();
    expect(st.check(ctx(st, editBox(s, new Map([['cube', [4, 5, 7]]]), 'set'))).feedback?.key).toBe('lab02.s2.missing');
    expect(st.check(ctx(st, editBox(s, new Map([['cube', [4, 5, 6, 7]]]), 'set'))).done).toBe(true);
  });

  it('3. equator, then two rings', () => {
    const st = stage('loops');
    const memory = new Map<string, unknown>();
    let s = st.scene();
    const t = topologyOf(meshOf(obj(s, 'sphere')));
    const ring = (i: number) => t.findEdge(1 + (i - 1) * 32, 1 + (i - 1) * 32 + 1)!;
    s = editLoopOrRing(s, 'sphere', ring(8), 'loop', false);
    expect(st.check(ctx(st, s, memory)).feedback?.key).toBe('lab02.s3.step1');
    s = editLoopOrRing(s, 'sphere', ring(5), 'loop', false);
    s = editLoopOrRing(s, 'sphere', ring(11), 'loop', true);
    expect(st.check(ctx(st, s, memory)).done).toBe(true);
  });

  it('4-8. the reference shapes pass their own stage', () => {
    for (const [id, objId] of [
      ['deform', 'cube'],
      ['extrude', 'cube'],
      ['container', 'cube'],
      ['loopcuts', 'box'],
      ['bevel', 'cube'],
    ] as const) {
      const st = stage(id);
      const s = withMesh(st.scene(), objId, REFERENCES[id]);
      expect(st.check(ctx(st, s)).done, id).toBe(true);
    }
  });

  it('4-8. the untouched start does not pass, with a useful message', () => {
    expect(stage('deform').check(ctx(stage('deform'), stage('deform').scene())).feedback?.key).toMatch(/^lab02\.shape\./);
    expect(stage('container').check(ctx(stage('container'), stage('container').scene())).feedback?.key).toBe('lab02.s6.notHollow');
    expect(stage('loopcuts').check(ctx(stage('loopcuts'), stage('loopcuts').scene())).feedback).toMatchObject({
      key: 'lab02.s7.cuts',
      params: { n: 0 },
    });
    expect(stage('bevel').check(ctx(stage('bevel'), stage('bevel').scene())).feedback?.key).toBe('lab02.s8.notYet');
  });

  it('9. cleaning the dirty cube with Merge by Distance, Delete Faces and Dissolve Vertices', () => {
    const st = stage('cleanup');
    let m = dirtyCube();
    expect(st.check(ctx(st, st.scene())).done).toBe(false);
    m = merge(m, m.verts.map((_, i) => i), 'distance').mesh;
    const tri = m.faces.findIndex((f) => f.length === 3);
    m = deleteElements(m, { verts: [], edges: [], faces: [tri] }, 'faces');
    const mid = m.verts.findIndex((p) => p.x === 0 && p.y === -1 && p.z === -1);
    m = dissolveVerts(m, [mid]);
    expect(meshCounts(m)).toMatchObject({ verts: 8, faces: 6 });
    const s = { ...st.scene(), objects: st.scene().objects.map((o) => (o.id === 'cube' ? { ...o, mesh: m } : o)) };
    expect(st.check(ctx(st, s)).done).toBe(true);
  });

  it('10. the stool', () => {
    const st = stage('final');
    expect(st.check(ctx(st, st.scene())).done).toBe(false);
    const placed = { ...st.scene(), objects: st.scene().objects.map((o) => (o.id === 'cube' ? { ...o, location: vec3(0, 0, 1.8) } : o)) };
    expect(st.check(ctx(st, withMesh(placed, 'cube', REFERENCES.final))).done).toBe(true);
  });
});

