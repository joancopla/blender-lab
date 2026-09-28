import { describe, expect, it } from 'vitest';
import { type Vec3, add, cross, normalize, scale, sub, vec3 } from '../../../apps/blender/math/vec3';
import { setLight } from '../../../apps/blender/operators/light';
import { setWorld } from '../../../apps/blender/operators/world';
import type { ShadingMode } from '../../../apps/blender/render/render-setup';
import { aimRotation, light } from '../../../apps/blender/scene/factory';
import { type LightObject, type SceneState, activeCamera } from '../../../apps/blender/scene/scene';
import type { BlenderStageContext as StageContext, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { viewProjection } from '../../../apps/blender/viewport/screen';
import { defaultViewState } from '../../../apps/blender/viewport/view-state';
import { has } from '../../../core/i18n';
import { LAB04_STAGES, SHAPES } from './stages';

const SIZE = { width: 1200, height: 800 };
const stage = (id: string): StageDefinition => LAB04_STAGES.stages.find((s) => s.id === id)!;

function ctx(st: StageDefinition, scene: SceneState, shading: ShadingMode, memory: Map<string, unknown>): StageContext {
  const view = defaultViewState();
  return {
    scene,
    initialScene: st.scene(),
    view,
    projection: viewProjection({ ...view, camera: null }, SIZE, null),
    size: SIZE,
    shading,
    log: [],
    memory,
  };
}
const run = (id: string, scene: SceneState, shading: ShadingMode = 'RENDERED', memory = new Map<string, unknown>()) =>
  stage(id).check(ctx(stage(id), scene, shading, memory));
/** Adds the light, or replaces the one with the same id. */
const put = (s: SceneState, l: LightObject): SceneState => ({
  ...s,
  objects: [...s.objects.filter((o) => o.id !== l.id), l],
});
const moveTo = (s: SceneState, id: string, location: Vec3): SceneState => ({
  ...s,
  objects: s.objects.map((o) => (o.id === id ? { ...o, location } : o)),
});

describe('Lab 04 stages', () => {
  it('every text exists', () => {
    for (const st of LAB04_STAGES.stages) {
      for (const k of [st.titleKey, st.instructionKey, st.successKey, ...st.hintKeys]) expect(has(k), k).toBe(true);
    }
    const feedback = [
      's1.add', 's1.rendered', 's2.rendered', 's2.missing', 's3.double', 's3.keepDistance', 's3.compensate',
      's4.rendered', 's4.hard', 's4.soft', 's5.both', 's5.needCool', 's5.needWarm', 's6.keepSpot', 's6.middleDark',
      's6.othersLit', 's6.blend', 's7.keepSun', 's7.off', 's8.count', 's8.flat', 's8.harsh', 's8.rim', 's9.blue',
      's9.brightness', 's9.strength', 's10.lights', 's10.ratio', 's10.shadow', 's10.back', 's10.rendered',
    ];
    for (const k of feedback) expect(has(`lab04.${k}`), k).toBe(true);
    for (const k of ['lab04.name', 'lab04.desc', 'lab04.intro.lead', 'lab04.real.lead']) expect(has(k), k).toBe(true);
  });

  it('every stage starts unfinished, even in Rendered', () => {
    for (const st of LAB04_STAGES.stages) {
      expect(st.check(ctx(st, st.scene(), 'RENDERED', new Map())).done, st.id).toBe(false);
    }
  });

  it('1. a light, seen in Rendered', () => {
    const s = put(stage('switchOn').scene(), light('l', 'Point', 'POINT', vec3(0, 0, 3)));
    expect(run('switchOn', stage('switchOn').scene()).feedback?.key).toBe('lab04.s1.add');
    expect(run('switchOn', s, 'SOLID').feedback?.key).toBe('lab04.s1.rendered');
    expect(run('switchOn', s).done).toBe(true);
  });

  it('2. the four types, each while in Rendered', () => {
    const memory = new Map<string, unknown>();
    let s = stage('types').scene();
    s = setLight(s, 'key', { lightType: 'SUN' });
    expect(run('types', s, 'SOLID', memory).done).toBe(false); // not seen: Solid
    for (const t of ['POINT', 'SPOT', 'AREA'] as const) run('types', setLight(s, 'key', { lightType: t }), 'RENDERED', memory);
    const r = run('types', setLight(s, 'key', { lightType: 'AREA' }), 'RENDERED', memory);
    expect(r.feedback?.params).toEqual({ list: 'Sun' });
    expect(run('types', s, 'RENDERED', memory).done).toBe(true);
  });

  it('3. twice as far is a quarter; four times the power brings it back', () => {
    const memory = new Map<string, unknown>();
    let s = stage('distance').scene();
    // Compensating without moving it first does not count.
    expect(run('distance', setLight(s, 'lamp', { energy: 4000 }), 'SOLID', memory).feedback?.key).toBe('lab04.s3.double');
    s = moveTo(s, 'lamp', add(SHAPES.S3_POINT, vec3(0, 0, 4)));
    expect(run('distance', s, 'SOLID', memory).feedback?.key).toBe('lab04.s3.compensate');
    expect(run('distance', s, 'SOLID', memory).feedback?.params).toEqual({ pct: 25 });
    expect(run('distance', setLight(s, 'lamp', { energy: 4000 }), 'SOLID', memory).done).toBe(true);
    expect(run('distance', moveTo(s, 'lamp', vec3(0, 0, 2)), 'SOLID', memory).feedback?.key).toBe('lab04.s3.keepDistance');
  });

  it('4. hard first, then soft; any light type counts', () => {
    const memory = new Map<string, unknown>();
    const s = stage('softness').scene();
    expect(run('softness', setLight(s, 'key', { shadowSoftSize: 1 }), 'RENDERED', memory).feedback?.key).toBe('lab04.s4.hard');
    expect(run('softness', setLight(s, 'key', { shadowSoftSize: 0 }), 'RENDERED', memory).feedback?.key).toBe('lab04.s4.soft');
    expect(run('softness', setLight(s, 'key', { lightType: 'AREA', size: 2 }), 'RENDERED', memory).done).toBe(true);
    expect(run('softness', s, 'SOLID').feedback?.key).toBe('lab04.s4.rendered');
  });

  it('5. one warm and one cool light', () => {
    let s = stage('color').scene();
    s = setLight(s, 'key', { color: vec3(1, 0.6, 0.3) });
    expect(run('color', s).feedback?.key).toBe('lab04.s5.needCool');
    s = setLight(s, 'fill', { color: vec3(0.4, 0.6, 1) });
    expect(run('color', s).done).toBe(true);
    // A switched-off light does not count.
    expect(run('color', setLight(s, 'fill', { energy: 0 })).feedback?.key).toBe('lab04.s5.needCool');
  });

  it('6. the spot lights only the middle box, with Blend', () => {
    const s = stage('spot').scene();
    expect(run('spot', s).feedback?.key).toBe('lab04.s6.othersLit');
    const aside = { ...(s.objects.find((o) => o.id === 'spot') as LightObject), spotSizeDeg: 20 };
    const offCentre = put(s, { ...aside, rotationDeg: aimRotation(aside.location, vec3(1, 0, 0)) });
    expect(run('spot', offCentre).feedback?.key).toBe('lab04.s6.middleDark');
    expect(run('spot', setLight(s, 'spot', { spotSizeDeg: 30 })).feedback?.key).toBe('lab04.s6.blend');
    expect(run('spot', setLight(s, 'spot', { spotSizeDeg: 30, spotBlend: 0.3 })).done).toBe(true);
    expect(run('spot', setLight(s, 'spot', { lightType: 'POINT' })).feedback?.key).toBe('lab04.s6.keepSpot');
  });

  it('7. the sun aimed from the mark through the pole top', () => {
    const s = stage('sun').scene();
    const sun = s.objects.find((o) => o.id === 'sun')!;
    // The sun comes from the far side of the pole: aim it along top -> mark.
    const from = sub(SHAPES.POLE_TOP, scale(sub(SHAPES.S7_MARK, SHAPES.POLE_TOP), 2));
    const aimed = { ...sun, location: from, rotationDeg: aimRotation(from, SHAPES.S7_MARK) } as LightObject;
    expect(run('sun', put(s, aimed)).done).toBe(true);
    // Location does not matter for a sun, only the direction.
    expect(run('sun', put(s, { ...aimed, location: vec3(9, 9, 9) })).done).toBe(true);
    const off = { ...aimed, rotationDeg: aimRotation(from, add(SHAPES.S7_MARK, vec3(1.5, 0, 0))) };
    expect(run('sun', put(s, off)).feedback?.key).toBe('lab04.s7.off');
  });

  /** Key, fill and rim around the head, placed from the camera. */
  function threePoint(s: SceneState, fillPower: number, rimPower = 1000): SceneState {
    const head = SHAPES.HEAD_AT;
    const cam = activeCamera(s)!;
    const toCam = normalize(sub(cam.location, head));
    const flat = normalize(vec3(toCam.x, toCam.y, 0));
    const right = normalize(cross(flat, vec3(0, 0, 1)));
    const at = (f: number, r: number, z: number) => add(head, add(add(scale(flat, f), scale(right, r)), vec3(0, 0, z)));
    s = put(s, light('key', 'Key', 'AREA', at(3, 3, 2), head, { energy: 1000, size: 1 }));
    s = put(s, light('fill', 'Fill', 'AREA', at(3, -3, 1), head, { energy: fillPower, size: 1 }));
    return put(s, light('rim', 'Rim', 'SPOT', at(-3, 0, 3), head, { energy: rimPower }));
  }

  it('8. three-point lighting: ratio between 1 and 3 stops, and a rim', () => {
    const s = stage('threePoint').scene();
    expect(run('threePoint', threePoint(s, 250)).done).toBe(true);
    expect(run('threePoint', threePoint(s, 1000)).feedback?.key).toBe('lab04.s8.flat');
    expect(run('threePoint', threePoint(s, 10)).feedback?.key).toBe('lab04.s8.harsh');
    expect(run('threePoint', threePoint(s, 250, 0)).feedback?.key).toBe('lab04.s8.rim');
    expect(run('threePoint', put(s, light('key', 'Key', 'POINT', vec3(3, -3, 3)))).feedback?.key).toBe('lab04.s8.count');
  });

  it('9. an overcast sky: pale blue, Strength 0.5 to 2', () => {
    const s = stage('world').scene();
    expect(run('world', setWorld(s, { color: vec3(0.8, 0.8, 0.8) })).feedback?.key).toBe('lab04.s9.blue');
    expect(run('world', setWorld(s, { color: vec3(0.02, 0.04, 0.1) })).feedback?.key).toBe('lab04.s9.brightness');
    const sky = setWorld(s, { color: vec3(0.35, 0.5, 0.8) });
    expect(run('world', sky).done).toBe(true);
    expect(run('world', setWorld(sky, { strength: 5 })).feedback?.key).toBe('lab04.s9.strength');
  });

  /** Key high on the front left, a weaker fill on the right and a rim from behind. */
  function studio(s: SceneState, opts: { rim?: boolean } = {}): SceneState {
    const target = vec3(0, 0, 1.8);
    s = put(s, light('key', 'Key', 'AREA', vec3(-1.5, -3, 8), target, { energy: 2000, size: 1 }));
    s = put(s, light('fill', 'Fill', 'AREA', vec3(4, -1, 6), target, { energy: 100, size: 1 }));
    if (opts.rim !== false) s = put(s, light('rim', 'Rim', 'SPOT', vec3(0, 4, 7), target, { energy: 500 }));
    return s;
  }

  it('10. the stool: ratio, a shadow under the seat, the back lit, in Rendered', () => {
    const s = stage('final').scene();
    expect(run('final', studio(s)).done).toBe(true);
    expect(run('final', studio(s), 'SOLID').feedback?.key).toBe('lab04.s10.rendered');
    expect(run('final', studio(s, { rim: false })).feedback?.key).toBe('lab04.s10.back');
    // Without Cast Shadow on the key, the floor under the seat is as lit as the rest.
    expect(run('final', setLight(studio(s), 'key', { useShadow: false })).feedback?.key).toBe('lab04.s10.shadow');
    expect(run('final', put(s, light('key', 'Key', 'POINT', vec3(3, -3, 5)))).feedback?.key).toBe('lab04.s10.lights');
  });
});
