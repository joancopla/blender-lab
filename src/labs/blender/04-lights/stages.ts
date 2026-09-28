/**
 * Lab 04 stages (lights): data and checks. Checks read the lights through the
 * app contract and measure them with the same physics as the light meter
 * (render/light-meter.ts), so what the student reads is what is checked.
 * All texts live in ca.json under "lab04".
 */
import './texts';
import { type Vec3, add, cross, dot, length, normalize, scale, sub, vec3 } from '../../../apps/blender/math/vec3';
import { luminance, lightPose } from '../../../apps/blender/render/light-physics';
import { measure, sceneTriangles, shadowedIrradiance } from '../../../apps/blender/render/light-meter';
import { light, mesh, sceneWith } from '../../../apps/blender/scene/factory';
import {
  type LightObject,
  type SceneObject,
  type SceneState,
  activeCamera,
  lightData,
  worldOf,
} from '../../../apps/blender/scene/scene';
import type { Feedback, BlenderLabStages as LabStages, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { stool } from '../stool';

// ---------------------------------------------------------------------------
// Helpers

const FLOOR = mesh('floor', 'Plane', 'plane', vec3(0, 0, 0), vec3(0, 0, 0), vec3(5, 5, 1));
const CUBE = mesh('cube', 'Cube', 'cube', vec3(0, 0, 1));

/** The default Camera, the given objects and lights (no default Light), with one active object. */
function scene(objects: readonly SceneObject[], active: string | null = null): SceneState {
  const s = sceneWith(objects, { selected: active ? [active] : [], active });
  return { ...s, objects: s.objects.filter((o) => o.id !== 'light') };
}

const lightsOf = (s: SceneState) => s.objects.filter((o): o is LightObject => o.type === 'light');
const byId = (s: SceneState, id: string) => s.objects.find((o) => o.id === id);
const fb = (key: string, tone: Feedback['tone'] = 'progress', params?: Feedback['params']): Feedback => ({
  key: `lab04.${key}`,
  tone,
  ...(params ? { params } : {}),
});
const stops = (a: number, b: number) => Math.log2(Math.max(a, 1e-9) / Math.max(b, 1e-9));
const fmt = (v: number, digits = 1) => v.toFixed(digits).replace('.', ',');
const UP = vec3(0, 0, 1);

// ---------------------------------------------------------------------------
// 1. Switch on: add a light and look at it in Rendered.

const s1: StageDefinition = {
  id: 'switchOn',
  titleKey: 'lab04.s1.title',
  instructionKey: 'lab04.s1.instruction',
  hintKeys: ['lab04.s1.hint1', 'lab04.s1.hint2'],
  successKey: 'lab04.s1.success',
  keys: ['shiftA', 'z', 'lmb'],
  scene: () => scene([FLOOR, CUBE], 'cube'),
  check(ctx) {
    if (lightsOf(ctx.scene).length === 0) return { done: false, feedback: fb('s1.add') };
    if (ctx.shading !== 'RENDERED') return { done: false, feedback: fb('s1.rendered') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 2. Four types: Point, Sun, Spot and Area, each seen in Rendered.

const TYPE_NAMES = { POINT: 'Point', SUN: 'Sun', SPOT: 'Spot', AREA: 'Area' } as const;

const s2: StageDefinition = {
  id: 'types',
  titleKey: 'lab04.s2.title',
  instructionKey: 'lab04.s2.instruction',
  hintKeys: ['lab04.s2.hint1', 'lab04.s2.hint2'],
  successKey: 'lab04.s2.success',
  keys: ['z', 'lmb'],
  propertiesTab: 'data',
  scene: () => scene([FLOOR, CUBE, light('key', 'Light', 'POINT', vec3(3, -3, 5), vec3(0, 0, 1))], 'key'),
  check(ctx) {
    const seen = (ctx.memory.get('seen') as Set<string> | undefined) ?? new Set<string>();
    ctx.memory.set('seen', seen);
    if (ctx.shading !== 'RENDERED') return { done: false, feedback: fb('s2.rendered') };
    for (const l of lightsOf(ctx.scene)) seen.add(l.lightType);
    if (seen.size === 4) return { done: true };
    const missing = (Object.keys(TYPE_NAMES) as (keyof typeof TYPE_NAMES)[]).filter((k) => !seen.has(k)).map((k) => TYPE_NAMES[k]);
    return { done: false, feedback: fb('s2.missing', 'progress', { list: missing.join(', ') }) };
  },
};

// ---------------------------------------------------------------------------
// 3. Distance and power: twice as far is a quarter; then compensate with Power.

const S3_POINT = vec3(0, 0, 0);
const S3_LAMP = light('lamp', 'Light', 'POINT', vec3(0, 0, 2), S3_POINT);
const S3_HINTS = [{ points: [S3_POINT] }] as const;
const onFloor = (s: SceneState) => measure(s, S3_POINT, UP).total;

const s3: StageDefinition = {
  id: 'distance',
  titleKey: 'lab04.s3.title',
  instructionKey: 'lab04.s3.instruction',
  hintKeys: ['lab04.s3.hint1', 'lab04.s3.hint2'],
  successKey: 'lab04.s3.success',
  keys: ['g', 'z', 'digits', 'enter'],
  propertiesTab: 'data',
  scene: () => ({ ...scene([FLOOR, S3_LAMP], 'lamp'), world: { color: vec3(0, 0, 0), strength: 0 } }),
  check(ctx) {
    const lamp = byId(ctx.scene, 'lamp');
    if (lamp?.type !== 'light') return { done: false };
    const e0 = onFloor(ctx.initialScene);
    const e = onFloor(ctx.scene);
    const dist = length(sub(lamp.location, S3_POINT));
    let step = (ctx.memory.get('step') as number | undefined) ?? 0;
    const doubled = Math.abs(dist - 4) <= 0.2;
    if (step === 0 && doubled && Math.abs(stops(e, e0 / 4)) <= 0.2) step = 1;
    ctx.memory.set('step', step);
    if (step === 0) return { done: false, hints: S3_HINTS, feedback: fb('s3.double', 'progress', { d: fmt(dist) }) };
    if (!doubled) return { done: false, hints: S3_HINTS, feedback: fb('s3.keepDistance', 'fix', { d: fmt(dist) }) };
    if (Math.abs(stops(e, e0)) <= 0.15) return { done: true };
    return { done: false, hints: S3_HINTS, feedback: fb('s3.compensate', 'progress', { pct: Math.round((e / e0) * 100) }) };
  },
};

// ---------------------------------------------------------------------------
// 4. Hard or soft: first a hard shadow, then a soft one.

/** How big the source is, as the shadow sees it: small (hard), big (soft) or in between. */
function sourceSize(l: LightObject): 'hard' | 'soft' | 'medium' {
  const d = lightData(l);
  if (d.lightType === 'SUN') return d.angleDeg <= 0.5 ? 'hard' : d.angleDeg >= 10 ? 'soft' : 'medium';
  if (d.lightType === 'AREA') return d.size <= 0.05 ? 'hard' : d.size >= 1 ? 'soft' : 'medium';
  return d.shadowSoftSize <= 0.01 ? 'hard' : d.shadowSoftSize >= 0.5 ? 'soft' : 'medium';
}

const s4: StageDefinition = {
  id: 'softness',
  titleKey: 'lab04.s4.title',
  instructionKey: 'lab04.s4.instruction',
  hintKeys: ['lab04.s4.hint1', 'lab04.s4.hint2'],
  successKey: 'lab04.s4.success',
  keys: ['z', 'lmb', 'digits', 'enter'],
  propertiesTab: 'data',
  scene: () => scene([FLOOR, CUBE, light('key', 'Light', 'POINT', vec3(2, -2, 4), vec3(0, 0, 1))], 'key'),
  check(ctx) {
    const key = byId(ctx.scene, 'key');
    if (key?.type !== 'light') return { done: false };
    if (ctx.shading !== 'RENDERED') return { done: false, feedback: fb('s4.rendered') };
    let step = (ctx.memory.get('step') as number | undefined) ?? 0;
    const size = sourceSize(key);
    if (step === 0 && size === 'hard') step = 1;
    ctx.memory.set('step', step);
    if (step === 1 && size === 'soft') return { done: true };
    return { done: false, feedback: fb(step === 0 ? 's4.hard' : 's4.soft') };
  },
};

// ---------------------------------------------------------------------------
// 5. Colour: one warm light and one cool light.

const isWarm = (c: Vec3) => c.x >= 1.4 * c.z && c.x > 0.3;
const isCool = (c: Vec3) => c.z >= 1.4 * c.x && c.z > 0.3;

const s5: StageDefinition = {
  id: 'color',
  titleKey: 'lab04.s5.title',
  instructionKey: 'lab04.s5.instruction',
  hintKeys: ['lab04.s5.hint1', 'lab04.s5.hint2'],
  successKey: 'lab04.s5.success',
  keys: ['lmb', 'z'],
  propertiesTab: 'data',
  scene: () =>
    scene(
      [
        FLOOR,
        CUBE,
        light('key', 'Key', 'POINT', vec3(3, -3, 4), vec3(0, 0, 1)),
        light('fill', 'Fill', 'POINT', vec3(-3, -3, 3), vec3(0, 0, 1), { energy: 500 }),
      ],
      'key',
    ),
  check(ctx) {
    const lit = lightsOf(ctx.scene).filter((l) => lightData(l).energy > 0);
    const colors = lit.map((l) => lightData(l).color);
    const warm = colors.some(isWarm);
    const cool = colors.some(isCool);
    if (warm && cool) return { done: true };
    return { done: false, feedback: fb(warm ? 's5.needCool' : cool ? 's5.needWarm' : 's5.both') };
  },
};

// ---------------------------------------------------------------------------
// 6. Spot: light only the middle one of three boxes, with a soft edge.

const BOX = (id: string, x: number) => mesh(id, id === 'middle' ? 'Middle' : id === 'left' ? 'Left' : 'Right', 'cube', vec3(x, 0, 0.5), vec3(0, 0, 0), vec3(0.5, 0.5, 0.5));
const S6_TOPS = { left: vec3(-2, 0, 1), middle: vec3(0, 0, 1), right: vec3(2, 0, 1) };

const s6: StageDefinition = {
  id: 'spot',
  titleKey: 'lab04.s6.title',
  instructionKey: 'lab04.s6.instruction',
  hintKeys: ['lab04.s6.hint1', 'lab04.s6.hint2'],
  successKey: 'lab04.s6.success',
  keys: ['lmb', 'digits', 'enter', 'z'],
  propertiesTab: 'data',
  scene: () => ({
    ...scene(
      [FLOOR, BOX('left', -2), BOX('middle', 0), BOX('right', 2), light('spot', 'Spot', 'SPOT', vec3(0, 0, 5), vec3(0, 0, 0), { spotSizeDeg: 90, spotBlend: 0 })],
      'spot',
    ),
    world: { color: vec3(0.02, 0.02, 0.02), strength: 1 },
  }),
  check(ctx) {
    const spot = byId(ctx.scene, 'spot');
    if (spot?.type !== 'light') return { done: false };
    if (spot.lightType !== 'SPOT') return { done: false, feedback: fb('s6.keepSpot', 'fix') };
    const tris = sceneTriangles(ctx.scene);
    const on = (p: Vec3) => shadowedIrradiance(spot, p, UP, tris);
    const middle = on(S6_TOPS.middle);
    if (middle <= 0) return { done: false, feedback: fb('s6.middleDark', 'fix') };
    if (on(S6_TOPS.left) > 0 || on(S6_TOPS.right) > 0) return { done: false, feedback: fb('s6.othersLit') };
    if (lightData(spot).spotBlend < 0.1) return { done: false, feedback: fb('s6.blend') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 7. Time of day: the pole's shadow must end at the mark.

const POLE = mesh('pole', 'Pole', 'cube', vec3(0, 0, 1), vec3(0, 0, 0), vec3(0.1, 0.1, 1));
const POLE_TOP = vec3(0, 0, 2);
const S7_MARK = vec3(2, 1.5, 0);
const S7_HINTS = [{ points: [S7_MARK], lines: [[vec3(0, 0, 0.01), vec3(S7_MARK.x, S7_MARK.y, 0.01)] as const] }] as const;

const s7: StageDefinition = {
  id: 'sun',
  titleKey: 'lab04.s7.title',
  instructionKey: 'lab04.s7.instruction',
  hintKeys: ['lab04.s7.hint1', 'lab04.s7.hint2'],
  successKey: 'lab04.s7.success',
  keys: ['r', 'x', 'y', 'z', 'digits', 'enter'],
  propertiesTab: 'data',
  scene: () => scene([FLOOR, POLE, light('sun', 'Sun', 'SUN', vec3(-2, -2, 6), vec3(-2, -2, 0), { energy: 3 })], 'sun'),
  check(ctx) {
    const sun = byId(ctx.scene, 'sun');
    if (sun?.type !== 'light') return { done: false };
    if (sun.lightType !== 'SUN') return { done: false, hints: S7_HINTS, feedback: fb('s7.keepSun', 'fix') };
    const want = normalize(sub(S7_MARK, POLE_TOP));
    const got = lightPose(sun).direction;
    const deg = (Math.acos(Math.max(-1, Math.min(1, dot(want, got)))) * 180) / Math.PI;
    if (deg <= 4) return { done: true };
    // Where the shadow of the top ends now (if the sun is above the horizon).
    return { done: false, hints: S7_HINTS, feedback: fb('s7.off', 'progress', { deg: Math.round(deg) }) };
  },
};

// ---------------------------------------------------------------------------
// 8. Three-point lighting: key, fill and rim, with a key / fill ratio of 1 to 3 stops.

const HEAD_AT = vec3(0, 0, 1);
const HEAD = mesh('head', 'Head', 'uvSphere', HEAD_AT, vec3(0, 0, 0), vec3(0.8, 0.8, 0.8));

/** Probes on the head: the two cheeks the camera sees and the back edge (for the rim). */
function headProbes(s: SceneState): { left: [Vec3, Vec3]; right: [Vec3, Vec3]; back: [Vec3, Vec3] } {
  const cam = activeCamera(s)!;
  const toCam = normalize(sub(cam.location, HEAD_AT));
  const flat = normalize(vec3(toCam.x, toCam.y, 0));
  const right = normalize(cross(flat, UP)); // the camera's right, seen from the camera
  const at = (d: Vec3): [Vec3, Vec3] => {
    const n = normalize(d);
    return [add(HEAD_AT, scale(n, 0.8)), n];
  };
  return {
    left: at(add(scale(flat, 0.8), scale(right, -0.6))),
    right: at(add(scale(flat, 0.8), scale(right, 0.6))),
    back: at(add(scale(flat, -0.7), scale(UP, 0.7))),
  };
}

const s8: StageDefinition = {
  id: 'threePoint',
  titleKey: 'lab04.s8.title',
  instructionKey: 'lab04.s8.instruction',
  hintKeys: ['lab04.s8.hint1', 'lab04.s8.hint2'],
  successKey: 'lab04.s8.success',
  keys: ['shiftA', 'g', 'r', 'digits', 'enter'],
  propertiesTab: 'data',
  scene: () => ({ ...scene([FLOOR, HEAD], 'head'), world: { color: vec3(0.01, 0.01, 0.01), strength: 1 } }),
  check(ctx) {
    const lights = lightsOf(ctx.scene);
    if (lights.length < 3) return { done: false, feedback: fb('s8.count', 'progress', { n: lights.length }) };
    const p = headProbes(ctx.scene);
    const tris = sceneTriangles(ctx.scene);
    const e = (q: [Vec3, Vec3]) => measure(ctx.scene, q[0], q[1], tris).total;
    const l = e(p.left);
    const r = e(p.right);
    const ratio = Math.abs(stops(l, r));
    if (ratio < 1) return { done: false, feedback: fb('s8.flat', 'progress', { stops: fmt(ratio) }) };
    if (ratio > 3) return { done: false, feedback: fb('s8.harsh', 'progress', { stops: fmt(ratio) }) };
    if (e(p.back) < 0.25 * Math.max(l, r)) return { done: false, feedback: fb('s8.rim') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 9. World: an overcast sky, pale blue.

const s9: StageDefinition = {
  id: 'world',
  titleKey: 'lab04.s9.title',
  instructionKey: 'lab04.s9.instruction',
  hintKeys: ['lab04.s9.hint1', 'lab04.s9.hint2'],
  successKey: 'lab04.s9.success',
  keys: ['z', 'lmb'],
  propertiesTab: 'world',
  scene: () => scene([FLOOR, CUBE, light('key', 'Light', 'SUN', vec3(3, -3, 6), vec3(0, 0, 0), { energy: 2 })], 'cube'),
  check(ctx) {
    const w = worldOf(ctx.scene);
    const c = w.color;
    if (!(c.z >= 1.3 * c.x && c.z >= c.y)) return { done: false, feedback: fb('s9.blue') };
    const y = luminance(c);
    if (y < 0.2 || y > 0.8) return { done: false, feedback: fb('s9.brightness', 'progress', { y: fmt(y, 2) }) };
    if (w.strength < 0.5 || w.strength > 2) return { done: false, feedback: fb('s9.strength', 'progress', { s: fmt(w.strength, 2) }) };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 10. Final challenge: light the stool (key and fill, a shadow under the seat, the back lit).

const STOOL_AT = vec3(0, 0, 1.8);
const STOOL = { ...mesh('stool', 'Stool', 'cube', STOOL_AT), mesh: stool() };
/** Probes on the stool (world space) and their normals. */
export const S10_PROBES = {
  front: [vec3(0, -1, 1.8), vec3(0, -1, 0)],
  side: [vec3(1, 0, 1.8), vec3(1, 0, 0)],
  back: [vec3(0, 1, 1.8), vec3(0, 1, 0)],
  under: [vec3(0, 0, 0.001), UP],
  open: [vec3(3.5, -3.5, 0.001), UP],
} as const;

const s10: StageDefinition = {
  id: 'final',
  titleKey: 'lab04.s10.title',
  instructionKey: 'lab04.s10.instruction',
  hintKeys: [],
  successKey: 'lab04.s10.success',
  keys: [],
  hints: false,
  stats: true,
  propertiesTab: 'data',
  scene: () => ({ ...scene([FLOOR, STOOL], 'stool'), world: { color: vec3(0.02, 0.02, 0.02), strength: 1 } }),
  check(ctx) {
    if (lightsOf(ctx.scene).length < 2) return { done: false, feedback: fb('s10.lights') };
    const tris = sceneTriangles(ctx.scene);
    const e = (k: keyof typeof S10_PROBES) => measure(ctx.scene, S10_PROBES[k][0], S10_PROBES[k][1], tris).total;
    const ratio = Math.abs(stops(e('front'), e('side')));
    if (ratio < 1 || ratio > 3) return { done: false, feedback: fb('s10.ratio', 'progress', { stops: fmt(ratio) }) };
    if (stops(e('open'), e('under')) < 2) return { done: false, feedback: fb('s10.shadow') };
    if (e('back') <= 0.05 * Math.max(e('front'), e('side'))) return { done: false, feedback: fb('s10.back') };
    if (ctx.shading !== 'RENDERED') return { done: false, feedback: fb('s10.rendered') };
    return { done: true };
  },
};

export const LAB04_STAGES: LabStages = {
  labId: '04-lights',
  stages: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10],
  freeScene: () => scene([FLOOR, CUBE, light('light', 'Light', 'POINT', vec3(4.0762, 1.0055, 5.9039), vec3(0, 0, 1))], 'cube'),
};

/** For tests. */
export const SHAPES = { S3_POINT, S7_MARK, POLE_TOP, HEAD_AT, headProbes };
