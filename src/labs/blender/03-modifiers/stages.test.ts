import { describe, expect, it } from 'vitest';
import { add, vec3 } from '../../../apps/blender/math/vec3';
import { type MeshData, meshFromFaces } from '../../../apps/blender/mesh/mesh-data';
import { extrudeRegion } from '../../../apps/blender/mesh/ops/extrude';
import { faceCenter, faceNormal } from '../../../apps/blender/mesh/geometry';
import { addModifier, applyModifier, moveModifier, removeModifier, setModifier } from '../../../apps/blender/operators/modifiers';
import { shadeObjects } from '../../../apps/blender/operators/shade';
import type { MeshObject, SceneState } from '../../../apps/blender/scene/scene';
import type { BlenderStageContext as StageContext, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { viewProjection } from '../../../apps/blender/viewport/screen';
import { defaultViewState } from '../../../apps/blender/viewport/view-state';
import { has } from '../../../core/i18n';
import { LAB03_STAGES, S10_MAX_FACES, S10_REF, S2_REF, gridBox, shapeScores } from './stages';

const SIZE = { width: 1200, height: 800 };
const stage = (id: string): StageDefinition => LAB03_STAGES.stages.find((s) => s.id === id)!;

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
const run = (id: string, scene: SceneState, memory?: Map<string, unknown>) => stage(id).check(ctx(stage(id), scene, memory));
const objectOf = (s: SceneState) => s.objects.find((o) => o.type === 'mesh') as MeshObject;
const withMesh = (s: SceneState, m: MeshData): SceneState => ({
  ...s,
  objects: s.objects.map((o) => (o.type === 'mesh' ? { ...o, mesh: m } : o)),
});

describe('Lab 03 stages', () => {
  it('every text exists', () => {
    for (const st of LAB03_STAGES.stages) {
      for (const k of [st.titleKey, st.instructionKey, st.successKey, ...st.hintKeys]) expect(has(k), k).toBe(true);
    }
    for (const k of ['lab03.name', 'lab03.desc', 'lab03.intro.lead', 'lab03.real.lead', 'lab03.shape.extra', 'lab03.zone.top']) {
      expect(has(k), k).toBe(true);
    }
  });

  it('every stage starts unfinished', () => {
    for (const st of LAB03_STAGES.stages) expect(st.check(ctx(st, st.scene())).done, st.id).toBe(false);
  });

  it('1. Subdivision Surface with Levels Viewport 2', () => {
    let s = stage('subsurf').scene();
    const id = objectOf(s).id;
    s = addModifier(s, id, 'SUBSURF');
    expect(run('subsurf', s).feedback?.key).toBe('lab03.s1.levels');
    s = setModifier(s, id, 'Subdivision', { levels: 2 });
    expect(run('subsurf', s).done).toBe(true);
  });

  it('2. support loops: near the edges passes, a plain subdivided cube does not', () => {
    const s = stage('support').scene();
    const loops = (at: number) => objectOf(withMesh(s, gridBox([-1, -at, at, 1], [-1, -at, at, 1], [-1, -at, at, 1])));
    const worst = (at: number) => Math.min(...shapeScores(loops(at), withMesh(s, loops(at).mesh!), S2_REF));
    expect(worst(0.8)).toBeGreaterThan(0.99);
    expect(worst(0.9)).toBeGreaterThanOrEqual(0.99);
    expect(worst(0.6)).toBeGreaterThanOrEqual(0.99);
    // Cuts left where Ctrl+R puts them (a third of the way), halfway, or none at all: too round.
    expect(worst(1 / 3)).toBeLessThan(0.99);
    expect(worst(0.5)).toBeLessThan(0.99);
    expect(Math.min(...shapeScores(objectOf(s), s, S2_REF))).toBeLessThan(0.99);
    expect(run('support', withMesh(s, loops(0.8).mesh!)).done).toBe(true);
  });

  it('3. Mirror with Clipping; without Merge the seam stays open', () => {
    let s = addModifier(stage('mirror').scene(), 'half', 'MIRROR');
    expect(run('mirror', s).feedback?.key).toBe('lab03.s3.clip');
    expect(run('mirror', setModifier(s, 'half', 'Mirror', { useMirrorMerge: false, useClip: true })).feedback?.key).toBe(
      'lab03.s3.seam',
    );
    s = setModifier(s, 'half', 'Mirror', { useClip: true });
    expect(run('mirror', s).done).toBe(true);
  });

  it('4. Array: 6 steps with Relative Offset X = 1 and Z = 1', () => {
    let s = addModifier(stage('array').scene(), 'step', 'ARRAY');
    s = setModifier(s, 'step', 'Array', { count: 6 });
    expect(run('array', s).feedback?.key).toBe('lab03.s4.offset');
    s = setModifier(s, 'step', 'Array', { relativeOffsetDisplace: vec3(1, 0, 1) });
    expect(run('array', s).done).toBe(true);
  });

  it('5. Bevel modifier with Angle and 3 segments; editing the base mesh is not allowed', () => {
    let s = addModifier(stage('bevel').scene(), 'slab', 'BEVEL');
    expect(run('bevel', s).feedback?.key).toBe('lab03.s5.segments');
    s = setModifier(s, 'slab', 'Bevel', { segments: 3 });
    expect(run('bevel', s).done).toBe(true);
    expect(run('bevel', applyModifier(s, 'slab', 'Bevel').state).feedback?.key).toBe('lab03.s5.destructive');
  });

  it('6. the order: Mirror before Subdivision', () => {
    const s = stage('order').scene();
    expect(run('order', s).feedback?.key).toBe('lab03.s6.order');
    expect(run('order', moveModifier(s, 'half', 'Mirror', 0)).done).toBe(true);
    expect(run('order', removeModifier(s, 'half', 'Mirror')).feedback?.key).toBe('lab03.s6.keep');
  });

  it('7. Solidify of 0.1 m with Fill Rim', () => {
    let s = addModifier(stage('solidify').scene(), 'seat', 'SOLIDIFY');
    expect(run('solidify', s).feedback?.key).toBe('lab03.s7.thickness');
    s = setModifier(s, 'seat', 'Solidify', { thickness: 0.1 });
    expect(run('solidify', s).done).toBe(true);
    expect(run('solidify', setModifier(s, 'seat', 'Solidify', { useRim: false })).feedback?.key).toBe('lab03.s7.rim');
  });

  it('8. Shade Smooth, then Flat, then Auto Smooth', () => {
    const memory = new Map<string, unknown>();
    let s = stage('shading').scene();
    s = shadeObjects(s, 'smooth');
    expect(run('shading', s, memory).feedback?.key).toBe('lab03.s8.step1');
    s = shadeObjects(s, 'flat');
    expect(run('shading', s, memory).feedback?.key).toBe('lab03.s8.step2');
    s = shadeObjects(s, 'autoSmooth');
    expect(run('shading', s, memory).done).toBe(true);
    // Auto Smooth straight away does not skip the steps.
    const fresh = new Map<string, unknown>();
    expect(run('shading', shadeObjects(stage('shading').scene(), 'autoSmooth'), fresh).done).toBe(false);
  });

  it('9. apply the Mirror, keep the Subdivision; deleting it is not applying', () => {
    const s = stage('apply').scene();
    expect(run('apply', applyModifier(s, 'half', 'Mirror').state).done).toBe(true);
    expect(run('apply', removeModifier(s, 'half', 'Mirror')).feedback?.key).toBe('lab03.s9.deleted');
    expect(run('apply', removeModifier(s, 'half', 'Subdivision')).feedback?.key).toBe('lab03.s9.keepSubsurf');
  });

  it('10. a quarter of the stool with Mirror X and Y passes; the whole stool without Mirror does not', () => {
    // Quarter: seat x, y in [0, 1] cut at 1/3, open on the mirror planes, with the corner leg extruded.
    const box = gridBox([0, 1 / 3, 1], [0, 1 / 3, 1], [-0.2, 0.2]);
    const open = box.faces.filter((_, f) => {
      const c = faceCenter(box, f);
      const n = faceNormal(box, f);
      return !((Math.abs(c.x) < 1e-9 && n.x < -0.5) || (Math.abs(c.y) < 1e-9 && n.y < -0.5));
    });
    let quarter = meshFromFaces(box.verts, open);
    const leg = quarter.faces.findIndex((_, f) => {
      const c = faceCenter(quarter, f);
      return faceNormal(quarter, f).z < -0.5 && c.x > 0.5 && c.y > 0.5;
    });
    const r = extrudeRegion(quarter, [leg]);
    const legVerts = new Set(r.mesh.faces[leg]!);
    quarter = { ...r.mesh, verts: r.mesh.verts.map((p, i) => (legVerts.has(i) ? add(p, vec3(0, 0, -1.6)) : p)) };
    expect(quarter.faces.length).toBeLessThanOrEqual(S10_MAX_FACES);

    let s = withMesh(stage('final').scene(), quarter);
    s = addModifier(s, 'cube', 'MIRROR');
    s = setModifier(s, 'cube', 'Mirror', { useAxis: [true, true, false] });
    expect(run('final', s).done).toBe(true);

    // The Lab 02 stool as base mesh, without modifiers: right shape, but no Mirror.
    const whole = { ...S10_REF, verts: S10_REF.verts.map((p) => vec3(p.x, p.y, p.z - 1.8)) };
    expect(run('final', withMesh(stage('final').scene(), whole)).feedback?.key).toBe('lab03.s10.mirror');
  });
});
