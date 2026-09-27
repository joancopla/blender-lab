import { describe, expect, it } from 'vitest';
import { vec3 } from '../../../apps/blender/math/vec3';
import type { SceneObject, SceneState } from '../../../apps/blender/scene/scene';
import type { LogEntry } from '../../../apps/blender/scene/store';
import type { BlenderStageContext as StageContext, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { viewProjection } from '../../../apps/blender/viewport/screen';
import {
  AXIS_VIEW_ROTATIONS,
  type AxisView,
  type ViewState,
  defaultViewState,
  frameBounds,
  orbit,
  setAxisView,
} from '../../../apps/blender/viewport/view-state';
import { objectWorldBounds } from '../../../apps/blender/scene/scene';
import { LAB01_STAGES, S9_GHOSTS } from './stages';
import { has } from '../../../core/i18n';

const SIZE = { width: 1200, height: 800 };
const stage = (id: string): StageDefinition => LAB01_STAGES.stages.find((s) => s.id === id)!;

function ctx(
  st: StageDefinition,
  scene: SceneState = st.scene(),
  view: ViewState = defaultViewState(),
  log: LogEntry[] = [],
  memory = new Map<string, unknown>(),
): StageContext {
  return {
    scene,
    initialScene: st.scene(),
    view,
    projection: viewProjection({ ...view, camera: null }, SIZE, null),
    size: SIZE,
    log,
    memory,
  };
}

const edit = (s: SceneState, id: string, over: Partial<SceneObject>): SceneState => ({
  ...s,
  objects: s.objects.map((o) => (o.id === id ? ({ ...o, ...over } as SceneObject) : o)),
});

describe('lab 01 stages', () => {
  it('every text key exists in ca.json', () => {
    for (const s of LAB01_STAGES.stages) {
      for (const k of [s.titleKey, s.instructionKey, s.successKey, ...s.hintKeys]) expect(has(k), k).toBe(true);
      for (const k of s.keys) expect(has(`keys.${k}`), `keys.${k}`).toBe(true);
    }
  });

  it('1. orbit: counts faces looked at, one by one', () => {
    const st = stage('orbit');
    const memory = new Map<string, unknown>();
    const look = (axis: AxisView) => st.check(ctx(st, undefined, setAxisView(defaultViewState(), axis), [], memory));
    expect(st.check(ctx(st, undefined, defaultViewState(), [], memory)).seenMarkers).toEqual([]);
    expect(look('back').seenMarkers).toEqual(['back']);
    expect(look('left').done).toBe(false);
    const r = look('bottom');
    expect(r.done).toBe(true);
    expect(r.feedback?.params).toEqual({ n: 3, total: 3 });
  });

  it('2. pan and zoom: the sphere must be centred and big', () => {
    const st = stage('pan-zoom');
    const s = st.scene();
    expect(st.check(ctx(st, s)).done).toBe(false);
    const sphere = s.objects.find((o) => o.id === 'sphere')!;
    const framed = frameBounds(defaultViewState(), objectWorldBounds(sphere), SIZE, null);
    expect(st.check(ctx(st, s, framed)).done).toBe(true);
    const farAway = { ...framed, distance: framed.distance * 10 };
    expect(st.check(ctx(st, s, farAway)).feedback?.key).toBe('lab01.s2.tooSmall');
  });

  it('3. frame selected: only the Cone selected and framed', () => {
    const st = stage('frame-selected');
    const s = { ...st.scene(), selectedIds: ['cone'], activeId: 'cone' };
    expect(st.check(ctx(st, s)).feedback?.key).toBe('lab01.s3.frameIt');
    const cone = s.objects.find((o) => o.id === 'cone')!;
    const framed = frameBounds(defaultViewState(), objectWorldBounds(cone), SIZE, null);
    expect(st.check(ctx(st, s, framed)).done).toBe(true);
    const both = { ...s, selectedIds: ['cone', 'cube'] };
    expect(st.check(ctx(st, both, framed)).feedback?.key).toBe('lab01.s3.selectCone');
  });

  it('4. views: only counts them in order', () => {
    const st = stage('views');
    const memory = new Map<string, unknown>();
    const go = (axis: AxisView) => st.check(ctx(st, undefined, setAxisView(defaultViewState(), axis), [], memory));
    go('right'); // out of order: ignored
    expect(go('front').feedback?.params).toMatchObject({ n: 1, view: 'Right' });
    go('right');
    go('top');
    expect(go('back').done).toBe(true);
  });

  it('5. selection: says what is wrong', () => {
    const st = stage('selection');
    const s0 = st.scene();
    expect(st.check(ctx(st, s0)).feedback).toMatchObject({ key: 'lab01.s5.extraOne', params: { names: 'Cube' } });
    const missing = { ...s0, selectedIds: ['sphere', 'sphere1'], activeId: 'sphere1' };
    expect(st.check(ctx(st, missing)).feedback).toMatchObject({ key: 'lab01.s5.missingOne', params: { names: 'Sphere.002' } });
    const wrongActive = { ...s0, selectedIds: ['sphere', 'sphere1', 'sphere2'], activeId: 'sphere2' };
    expect(st.check(ctx(st, wrongActive)).feedback).toMatchObject({ key: 'lab01.s5.wrongActive', params: { name: 'Sphere.002' } });
    expect(st.check(ctx(st, { ...wrongActive, activeId: 'sphere1' })).done).toBe(true);
  });

  it('6. move: A with tolerance, B only along Z', () => {
    const st = stage('move');
    let s = edit(st.scene(), 'cube', { location: vec3(2.55, -1.45, 1.02) });
    expect(st.check(ctx(st, s)).feedback?.key).toBe('lab01.s6.aDone');
    const sloppy = edit(s, 'cube1', { location: vec3(-2.01, 3, 3.5) });
    expect(st.check(ctx(st, sloppy)).feedback?.key).toBe('lab01.s6.bOffAxis');
    s = edit(s, 'cube1', { location: vec3(-2, 3, 3.45) });
    expect(st.check(ctx(st, s)).done).toBe(true);
  });

  it('7. exact values: exact within 1e-4, hint when almost', () => {
    const st = stage('exact-values');
    const almost = edit(st.scene(), 'cube', { location: vec3(0, 0, 2.97) });
    expect(st.check(ctx(st, almost)).feedback?.key).toBe('lab01.s7.almost.location');
    const done = edit(st.scene(), 'cube', {
      location: vec3(0, 0, 3),
      rotationDeg: vec3(0, 0, 45.00000001),
      scale: vec3(1.5, 1.5, 1.5),
    });
    expect(st.check(ctx(st, done)).done).toBe(true);
    const twoOfThree = edit(done, 'cube', { scale: vec3(1, 1, 1) });
    expect(st.check(ctx(st, twoOfThree)).feedback).toMatchObject({ key: 'lab01.s7.progress', params: { n: 2 } });
  });

  it('8. cancel with right click, undo, back to the start', () => {
    const st = stage('cancel-undo');
    const s = st.scene();
    const cancel: LogEntry = { kind: 'cancel', name: 'Move', via: 'rightClick' };
    expect(st.check(ctx(st, s, undefined, [{ kind: 'cancel', name: 'Move', via: 'escape' }])).feedback?.key).toBe(
      'lab01.s8.useRightClick',
    );
    expect(st.check(ctx(st, s, undefined, [cancel])).feedback?.key).toBe('lab01.s8.needUndo');
    const moved = edit(s, 'cube', { location: vec3(1, 0, 1) });
    const log: LogEntry[] = [cancel, { kind: 'execute', name: 'Move' }, { kind: 'undo', name: 'Move' }];
    expect(st.check(ctx(st, moved, undefined, log)).feedback?.key).toBe('lab01.s8.notBack');
    expect(st.check(ctx(st, s, undefined, log)).done).toBe(true);
  });

  it('9. final: done when every object sits on its ghost', () => {
    const st = stage('final');
    expect(st.check(ctx(st)).done).toBe(false);
    let s = st.scene();
    for (const g of S9_GHOSTS) s = edit(s, g.objectId, { location: g.location, rotationDeg: g.rotationDeg, scale: g.scale });
    expect(st.check(ctx(st, s)).done).toBe(true);
    expect(st.hints).toBe(false);
  });

  it('views and camera: orbiting away is not a face view', () => {
    const st = stage('orbit');
    const r = st.check(ctx(st, undefined, orbit({ ...defaultViewState(), rotation: AXIS_VIEW_ROTATIONS.top }, 0, 0, null)));
    expect(r.seenMarkers).toEqual([]);
  });
});
