import { describe, expect, it } from 'vitest';
import { NewMaterialOp, AssignMaterialOp } from '../../../apps/blender/operators/material';
import * as Ops from '../../../apps/blender/operators/material-nodes';
import type { SceneState } from '../../../apps/blender/scene/scene';
import type { BlenderStageContext as StageContext, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { viewProjection } from '../../../apps/blender/viewport/screen';
import { defaultViewState } from '../../../apps/blender/viewport/view-state';
import type { ColorRampData } from '../../../apps/blender/shading/node-types';
import { type NodeTree, addNode, connect, setProp, setValue } from '../../../apps/blender/shading/tree';
import { has } from '../../../core/i18n';
import { LAB05_STAGES, LAB05_TEST } from './stages';

const SIZE = { width: 1200, height: 800 };
const stage = (id: string): StageDefinition => LAB05_STAGES.stages.find((s) => s.id === id)!;
function ctx(st: StageDefinition, scene: SceneState): StageContext {
  const view = defaultViewState();
  return { scene, initialScene: st.scene(), view, projection: viewProjection({ ...view, camera: null }, SIZE, null), size: SIZE, shading: 'MATERIAL', log: [], memory: new Map() };
}
const run = (id: string, scene: SceneState) => stage(id).check(ctx(stage(id), scene));

const select = (s: SceneState, id: string): SceneState => ({ ...s, activeId: id, selectedIds: [id] });
const matIdOf = (s: SceneState, objectId: string) => {
  const o = s.objects.find((x) => x.id === objectId);
  return o?.type === 'mesh' ? o.materialSlots![0]! : '';
};
/** Edits the tree of the material drawn on an object. */
function editOn(s: SceneState, objectId: string, edit: (t: NodeTree) => NodeTree): SceneState {
  return Ops.editTree('test', matIdOf(s, objectId), edit).apply(s);
}
const principledId = (t: NodeTree) => t.nodes.find((n) => n.type === 'ShaderNodeBsdfPrincipled')!.id;
const setP = (socket: string, v: number | readonly number[]) => (t: NodeTree) => setValue(t, principledId(t), socket, v as never);

describe('Lab 05 stages', () => {
  it('every text exists', () => {
    for (const st of LAB05_STAGES.stages) {
      for (const k of [st.titleKey, st.instructionKey, st.successKey, ...st.hintKeys]) expect(has(k), k).toBe(true);
    }
  });

  it('no stage is done at the start', () => {
    for (const st of LAB05_STAGES.stages) expect(st.check(ctx(st, st.scene())).done, st.id).toBe(false);
  });

  it('feedback keys exist', () => {
    for (const st of LAB05_STAGES.stages) {
      const r = st.check(ctx(st, st.scene()));
      if (r.feedback) expect(has(r.feedback.key), r.feedback.key).toBe(true);
    }
  });

  it('1: New and a new Base Color', () => {
    let s = NewMaterialOp('sphere').apply(stage('firstMaterial').scene());
    expect(run('firstMaterial', s).done).toBe(false);
    s = editOn(s, 'sphere', setP('Base Color', [0.8, 0.1, 0.1, 1]));
    expect(run('firstMaterial', s).done).toBe(true);
  });

  it('2: gold and plastic made by the student, not the references', () => {
    let s = stage('metalPlastic').scene();
    s = AssignMaterialOp('gold', 'refGold').apply(s);
    expect(run('metalPlastic', s).feedback?.key).toBe('lab05.s2.ownMaterial');
    s = NewMaterialOp('gold').apply(s); // a copy of the reference does not count either
    expect(run('metalPlastic', s).feedback?.key).toBe('lab05.s2.ownMaterial');
    // Empty the slot and start from a new "Material".
    s = { ...s, objects: s.objects.map((o) => (o.id === 'gold' && o.type === 'mesh' ? { ...o, materialSlots: [null] } : o)) };
    s = NewMaterialOp('gold').apply(s);
    s = editOn(s, 'gold', (t) => setP('Roughness', 0.2)(setP('Metallic', 1)(setP('Base Color', [1, 0.7, 0.3, 1])(t))));
    s = select(NewMaterialOp('plastic').apply(select(s, 'plastic')), 'plastic');
    s = editOn(s, 'plastic', (t) => setP('Roughness', 0.4)(setP('Base Color', [0.7, 0.03, 0.03, 1])(t)));
    expect(run('metalPlastic', s).done).toBe(true);
  });

  it('3: roughness near the reference', () => {
    const s = stage('roughness').scene();
    expect(run('roughness', s).feedback?.key).toBe('lab05.s3.lower');
    expect(run('roughness', editOn(s, 'mine', setP('Roughness', 0.28))).done).toBe(true);
    expect(run('roughness', editOn(s, 'mine', setP('Roughness', 0.05))).feedback?.key).toBe('lab05.s3.higher');
  });

  it('4: glass', () => {
    let s = stage('glass').scene();
    s = editOn(s, 'glass', setP('Transmission Weight', 1));
    expect(run('glass', s).feedback?.key).toBe('lab05.s4.roughness');
    s = editOn(s, 'glass', setP('Roughness', 0));
    expect(run('glass', s).done).toBe(true);
  });

  it('5: emission on the bulb, not on the base', () => {
    const s = stage('emission').scene();
    expect(run('emission', editOn(s, 'base', setP('Emission Strength', 5))).feedback?.key).toBe('lab05.s5.wrongObject');
    expect(run('emission', editOn(s, 'bulb', setP('Emission Strength', 3))).done).toBe(true);
  });

  it('6: Noise > Color Ramp > Base Color, step by step', () => {
    let s = stage('firstGraph').scene();
    let noise = '';
    let ramp = '';
    s = editOn(s, 'cube', (t) => {
      const a = addNode(t, 'ShaderNodeTexNoise', { x: 0, y: 0 });
      noise = a.id;
      return a.tree;
    });
    expect(run('firstGraph', s).feedback?.key).toBe('lab05.s6.addRamp');
    s = editOn(s, 'cube', (t) => {
      const a = addNode(t, 'ShaderNodeValToRGB', { x: 0, y: 0 });
      ramp = a.id;
      return a.tree;
    });
    expect(run('firstGraph', s).feedback?.key).toBe('lab05.s6.noiseToRamp');
    s = editOn(s, 'cube', (t) => connect(t, { node: noise, socket: 'Fac' }, { node: ramp, socket: 'Fac' }));
    expect(run('firstGraph', s).feedback?.key).toBe('lab05.s6.rampToBase');
    s = editOn(s, 'cube', (t) => connect(t, { node: ramp, socket: 'Color' }, { node: principledId(t), socket: 'Base Color' }));
    expect(run('firstGraph', s).done).toBe(true);
  });

  it('7: Texture Coordinate > Mapping > Noise, with a new Scale', () => {
    let s = stage('scale').scene();
    let map = '';
    s = editOn(s, 'cube', (t) => {
      const noise = t.nodes.find((n) => n.type === 'ShaderNodeTexNoise')!.id;
      const tc = addNode(t, 'ShaderNodeTexCoord', { x: 0, y: 0 });
      const m = addNode(tc.tree, 'ShaderNodeMapping', { x: 0, y: 0 });
      map = m.id;
      let x = connect(m.tree, { node: tc.id, socket: 'Object' }, { node: m.id, socket: 'Vector' });
      x = connect(x, { node: m.id, socket: 'Vector' }, { node: noise, socket: 'Vector' });
      return x;
    });
    expect(run('scale', s).feedback?.key).toBe('lab05.s7.scale');
    s = editOn(s, 'cube', (t) => setValue(t, map, 'Scale', [3, 3, 3]));
    expect(run('scale', s).done).toBe(true);
  });

  it('8: Bump from the noise into Normal', () => {
    let s = stage('bump').scene();
    s = editOn(s, 'cube', (t) => {
      const noise = t.nodes.find((n) => n.type === 'ShaderNodeTexNoise')!.id;
      const b = addNode(t, 'ShaderNodeBump', { x: 0, y: 0 });
      let x = connect(b.tree, { node: noise, socket: 'Fac' }, { node: b.id, socket: 'Height' });
      x = connect(x, { node: b.id, socket: 'Normal' }, { node: principledId(x), socket: 'Normal' });
      return x;
    });
    expect(run('bump', s).done).toBe(true);
  });

  it('9: one noise mask for colour and roughness', () => {
    let s = stage('mix').scene();
    s = editOn(s, 'cube', (t) => {
      const p = principledId(t);
      const noise = addNode(t, 'ShaderNodeTexNoise', { x: 0, y: 0 });
      const mix = addNode(noise.tree, 'ShaderNodeMix', { x: 0, y: 0 }, { data_type: 'RGBA' });
      const mixF = addNode(mix.tree, 'ShaderNodeMix', { x: 0, y: 0 }, { data_type: 'FLOAT' });
      let x = connect(mixF.tree, { node: noise.id, socket: 'Fac' }, { node: mix.id, socket: 'Factor_Float' });
      x = connect(x, { node: mix.id, socket: 'Result_Color' }, { node: p, socket: 'Base Color' });
      x = connect(x, { node: noise.id, socket: 'Fac' }, { node: mixF.id, socket: 'Factor_Float' });
      return connect(x, { node: mixF.id, socket: 'Result_Float' }, { node: p, socket: 'Roughness' });
    });
    expect(run('mix', s).done).toBe(true);
  });

  it('9: a different noise for roughness is not the same mask', () => {
    let s = stage('mix').scene();
    s = editOn(s, 'cube', (t) => {
      const p = principledId(t);
      const n1 = addNode(t, 'ShaderNodeTexNoise', { x: 0, y: 0 });
      const n2 = addNode(n1.tree, 'ShaderNodeTexNoise', { x: 0, y: 0 });
      const mix = addNode(n2.tree, 'ShaderNodeMix', { x: 0, y: 0 }, { data_type: 'RGBA' });
      let x = connect(mix.tree, { node: n1.id, socket: 'Fac' }, { node: mix.id, socket: 'Factor_Float' });
      x = connect(x, { node: mix.id, socket: 'Result_Color' }, { node: p, socket: 'Base Color' });
      return connect(x, { node: n2.id, socket: 'Fac' }, { node: p, socket: 'Roughness' });
    });
    expect(run('mix', s).feedback?.key).toBe('lab05.s9.sameMask');
  });

  it('10: wood seat and metal legs', () => {
    let s = stage('final').scene();
    s = NewMaterialOp('seat').apply(s);
    s = select(NewMaterialOp('legs').apply(select(s, 'legs')), 'legs');
    expect(run('final', s).feedback?.key).toBe('lab05.s10.woodTexture');
    s = editOn(s, 'seat', (t) => {
      const w = addNode(t, 'ShaderNodeTexWave', { x: 0, y: 0 }, { wave_type: 'RINGS' });
      const r = addNode(w.tree, 'ShaderNodeValToRGB', { x: 0, y: 0 });
      const ramp: ColorRampData = { interpolation: 'LINEAR', colorMode: 'RGB', stops: [{ position: 0, color: [0.3, 0.12, 0.04, 1] }, { position: 1, color: [0.55, 0.3, 0.12, 1] }] };
      let x = setProp(r.tree, r.id, 'color_ramp', ramp);
      x = connect(x, { node: w.id, socket: 'Fac' }, { node: r.id, socket: 'Fac' });
      return connect(x, { node: r.id, socket: 'Color' }, { node: principledId(x), socket: 'Base Color' });
    });
    expect(run('final', s).feedback?.key).toBe('lab05.s10.metal');
    s = editOn(s, 'legs', (t) => setP('Roughness', 0.3)(setP('Metallic', 1)(t)));
    expect(run('final', s).done).toBe(true);
  });

  it('the stage 6 solution is the start of stages 7 and 8', () => {
    expect(LAB05_TEST.chainIssue(LAB05_TEST.spottedTree())).toBeNull();
  });
});
