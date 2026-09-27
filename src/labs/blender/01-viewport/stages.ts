/**
 * Lab 01 stages: data and checks. All texts live in ca.json under "lab01".
 */
import { rotate } from '../../../apps/blender/math/quat';
import { type Vec3, dot, vec3 } from '../../../apps/blender/math/vec3';
import { mesh, sceneWith } from '../../../apps/blender/scene/factory';
import { type SceneObject, type SceneState, objectWorldBounds } from '../../../apps/blender/scene/scene';
import { type Ghost, matchesGhost } from '../../../apps/blender/stages/ghost-match';
import type { CheckResult, FaceMarker, LabStages, StageContext, StageDefinition } from '../../../core/stages/types';
import { worldToScreen } from '../../../apps/blender/viewport/screen';
import type { AxisView } from '../../../apps/blender/viewport/view-state';

/** Exactness required in stage 7. */
export const EXACT = 1e-4;

const byId = (s: SceneState, id: string): SceneObject | undefined => s.objects.find((o) => o.id === id);
const names = (s: SceneState, ids: readonly string[]) =>
  ids
    .map((id) => byId(s, id)?.name ?? id)
    .sort()
    .join(', ');
const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;
const nearVec = (a: Vec3, b: Vec3, eps: number) => near(a.x, b.x, eps) && near(a.y, b.y, eps) && near(a.z, b.z, eps);
const ghost = (g: Omit<Ghost, 'rotationDeg' | 'scale'> & Partial<Pick<Ghost, 'rotationDeg' | 'scale'>>): Ghost => ({
  rotationDeg: vec3(0, 0, 0),
  scale: vec3(1, 1, 1),
  ...g,
});

// ---------------------------------------------------------------------------
// 1. Orbit: find three marked faces that can only be seen by orbiting.

const S1_MARKERS: FaceMarker[] = [
  { id: 'back', position: vec3(0, 2.001, 2), normal: vec3(0, 1, 0), symbol: '★', size: 1.6 },
  { id: 'left', position: vec3(-2.001, 0, 2), normal: vec3(-1, 0, 0), symbol: '●', size: 1.6 },
  { id: 'bottom', position: vec3(0, 0, -0.001), normal: vec3(0, 0, -1), symbol: '▲', size: 1.6 },
];

/** Looking at a face: the view direction is within this angle of the face normal. */
export const FACE_CONE_DEG = 35;

const s1: StageDefinition = {
  id: 'orbit',
  titleKey: 'lab01.s1.title',
  instructionKey: 'lab01.s1.instruction',
  hintKeys: ['lab01.s1.hint1', 'lab01.s1.hint2'],
  successKey: 'lab01.s1.success',
  keys: ['mmb', 'numpad4', 'numpad6', 'numpad8', 'numpad2'],
  markers: S1_MARKERS,
  scene: () => sceneWith([mesh('cube', 'Cube', 'cube', vec3(0, 0, 2), vec3(0, 0, 0), vec3(2, 2, 2))]),
  check(ctx) {
    const seen = new Set((ctx.memory.get('seen') as Set<string> | undefined) ?? []);
    if (!ctx.view.camera) {
      const towardViewer = rotate(ctx.view.rotation, vec3(0, 0, 1));
      const cos = Math.cos((FACE_CONE_DEG * Math.PI) / 180);
      for (const m of S1_MARKERS) if (dot(towardViewer, m.normal) >= cos) seen.add(m.id);
    }
    ctx.memory.set('seen', seen);
    return {
      done: seen.size === S1_MARKERS.length,
      seenMarkers: [...seen],
      feedback: { key: 'lab01.s1.progress', params: { n: seen.size, total: S1_MARKERS.length }, tone: 'progress' },
    };
  },
};

// ---------------------------------------------------------------------------
// 2. Pan and zoom: frame a small, far object.

/** The object must be this close to the centre (fraction of the smaller viewport side)... */
export const S2_CENTRE_FRACTION = 0.12;
/** ...and at least this big on screen (fraction of the smaller viewport side). */
export const S2_SIZE_FRACTION = 0.25;

function screenRect(ctx: StageContext, o: SceneObject) {
  const b = objectWorldBounds(o);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const x of [b.min.x, b.max.x])
    for (const y of [b.min.y, b.max.y])
      for (const z of [b.min.z, b.max.z]) {
        const p = worldToScreen(ctx.projection, ctx.size, vec3(x, y, z));
        if (!p) return null;
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
      }
  // Centre: projection of the object's centre (the rectangle's centre drifts in perspective).
  const c = worldToScreen(
    ctx.projection,
    ctx.size,
    vec3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2),
  );
  if (!c) return null;
  return { cx: c.x, cy: c.y, size: Math.max(x1 - x0, y1 - y0) };
}

const s2: StageDefinition = {
  id: 'pan-zoom',
  titleKey: 'lab01.s2.title',
  instructionKey: 'lab01.s2.instruction',
  hintKeys: ['lab01.s2.hint1', 'lab01.s2.hint2'],
  successKey: 'lab01.s2.success',
  keys: ['shiftMmb', 'wheel', 'ctrlMmb'],
  scene: () =>
    sceneWith([
      mesh('cube', 'Cube', 'cube', vec3(0, 0, 1)),
      mesh('sphere', 'Sphere', 'uvSphere', vec3(-14, 16, 0.3), vec3(0, 0, 0), vec3(0.3, 0.3, 0.3)),
    ]),
  check(ctx) {
    const o = byId(ctx.scene, 'sphere');
    const r = o && !ctx.view.camera ? screenRect(ctx, o) : null;
    const minSide = Math.min(ctx.size.width, ctx.size.height);
    if (!r) return { done: false, feedback: { key: 'lab01.s2.notVisible', tone: 'fix' } };
    const centred = Math.hypot(r.cx - ctx.size.width / 2, r.cy - ctx.size.height / 2) <= S2_CENTRE_FRACTION * minSide;
    const bigEnough = r.size >= S2_SIZE_FRACTION * minSide;
    if (centred && bigEnough) return { done: true };
    return { done: false, feedback: { key: centred ? 'lab01.s2.tooSmall' : 'lab01.s2.notCentred', tone: 'fix' } };
  },
};

// ---------------------------------------------------------------------------
// 3. Frame Selected (Numpad .)

const s3: StageDefinition = {
  id: 'frame-selected',
  titleKey: 'lab01.s3.title',
  instructionKey: 'lab01.s3.instruction',
  hintKeys: ['lab01.s3.hint1', 'lab01.s3.hint2'],
  successKey: 'lab01.s3.success',
  keys: ['lmb', 'numpadPeriod', 'home'],
  scene: () =>
    sceneWith(
      [
        mesh('cube', 'Cube', 'cube', vec3(0, 0, 1)),
        mesh('cone', 'Cone', 'cone', vec3(9, -7, 1), vec3(0, 0, 0), vec3(0.5, 0.5, 0.5)),
        mesh('cylinder', 'Cylinder', 'cylinder', vec3(-6, 5, 1)),
      ],
      { selected: ['cube'], active: 'cube' },
    ),
  check(ctx) {
    const cone = byId(ctx.scene, 'cone');
    if (!cone) return { done: false };
    const onlyCone = ctx.scene.selectedIds.length === 1 && ctx.scene.selectedIds[0] === 'cone';
    if (!onlyCone) return { done: false, feedback: { key: 'lab01.s3.selectCone', tone: 'fix' } };
    const b = objectWorldBounds(cone);
    const centre = vec3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
    if (ctx.view.camera || !nearVec(ctx.view.target, centre, 0.01)) {
      return { done: false, feedback: { key: 'lab01.s3.frameIt', tone: 'fix' } };
    }
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 4. Views, in order: Front, Right, Top, Back.

export const S4_ORDER: readonly AxisView[] = ['front', 'right', 'top', 'back'];
const VIEW_LABEL: Record<AxisView, string> = { front: 'Front', back: 'Back', right: 'Right', left: 'Left', top: 'Top', bottom: 'Bottom' };

const s4: StageDefinition = {
  id: 'views',
  titleKey: 'lab01.s4.title',
  instructionKey: 'lab01.s4.instruction',
  hintKeys: ['lab01.s4.hint1', 'lab01.s4.hint2'],
  successKey: 'lab01.s4.success',
  keys: ['numpad1', 'numpad3', 'numpad7', 'ctrlNumpad1'],
  scene: () => sceneWith([mesh('cube', 'Cube', 'cube', vec3(0, 0, 1))], { selected: ['cube'], active: 'cube' }),
  check(ctx) {
    let next = (ctx.memory.get('next') as number | undefined) ?? 0;
    if (next < S4_ORDER.length && !ctx.view.camera && ctx.view.axisView === S4_ORDER[next]) next++;
    ctx.memory.set('next', next);
    if (next >= S4_ORDER.length) return { done: true };
    return {
      done: false,
      feedback: {
        key: 'lab01.s4.progress',
        params: { n: next, total: S4_ORDER.length, view: VIEW_LABEL[S4_ORDER[next]!] },
        tone: 'progress',
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 5. Selection: exactly the spheres, with Sphere.001 active.

const S5_TARGET = ['sphere', 'sphere1', 'sphere2'];
const S5_ACTIVE = 'sphere1';

const s5: StageDefinition = {
  id: 'selection',
  titleKey: 'lab01.s5.title',
  instructionKey: 'lab01.s5.instruction',
  hintKeys: ['lab01.s5.hint1', 'lab01.s5.hint2'],
  successKey: 'lab01.s5.success',
  keys: ['lmb', 'shiftLmb', 'b', 'a', 'altA'],
  scene: () =>
    sceneWith(
      [
        mesh('cube', 'Cube', 'cube', vec3(-4, 0, 1)),
        mesh('sphere', 'Sphere', 'uvSphere', vec3(-1, -3, 1)),
        mesh('cylinder', 'Cylinder', 'cylinder', vec3(2, -3, 1)),
        mesh('sphere1', 'Sphere.001', 'uvSphere', vec3(0, 1, 1)),
        mesh('cube1', 'Cube.001', 'cube', vec3(3, 2, 1)),
        mesh('sphere2', 'Sphere.002', 'uvSphere', vec3(-3, 4, 1)),
        mesh('cone', 'Cone', 'cone', vec3(4, -1, 1)),
      ],
      { selected: ['cube'], active: 'cube' },
    ),
  check(ctx): CheckResult {
    const sel = ctx.scene.selectedIds;
    const extra = sel.filter((id) => !S5_TARGET.includes(id));
    const missing = S5_TARGET.filter((id) => !sel.includes(id));
    if (extra.length > 0) {
      return {
        done: false,
        feedback: {
          key: extra.length === 1 ? 'lab01.s5.extraOne' : 'lab01.s5.extraMany',
          params: { names: names(ctx.scene, extra) },
          tone: 'fix',
        },
      };
    }
    if (missing.length > 0) {
      return {
        done: false,
        feedback: {
          key: missing.length === 1 ? 'lab01.s5.missingOne' : 'lab01.s5.missingMany',
          params: { names: names(ctx.scene, missing) },
          tone: 'fix',
        },
      };
    }
    if (ctx.scene.activeId !== S5_ACTIVE) {
      const active = ctx.scene.activeId ? byId(ctx.scene, ctx.scene.activeId)?.name ?? '' : '';
      return { done: false, feedback: { key: 'lab01.s5.wrongActive', params: { name: active }, tone: 'fix' } };
    }
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 6. Move: one cube freely (0.1 m tolerance), another one only along Z.

export const S6_GHOST_A = ghost({ id: 'ghostA', objectId: 'cube', primitive: 'cube', location: vec3(2.5, -1.5, 1) });
export const S6_START_B = vec3(-2, 3, 1);
export const S6_GHOST_B = ghost({ id: 'ghostB', objectId: 'cube1', primitive: 'cube', location: vec3(-2, 3, 3.5) });

const s6: StageDefinition = {
  id: 'move',
  titleKey: 'lab01.s6.title',
  instructionKey: 'lab01.s6.instruction',
  hintKeys: ['lab01.s6.hint1', 'lab01.s6.hint2'],
  successKey: 'lab01.s6.success',
  keys: ['g', 'x', 'y', 'z', 'lmb', 'rmb'],
  ghosts: [S6_GHOST_A, S6_GHOST_B],
  scene: () =>
    sceneWith([mesh('cube', 'Cube', 'cube', vec3(-3, -2, 1)), mesh('cube1', 'Cube.001', 'cube', S6_START_B)], {
      selected: ['cube'],
      active: 'cube',
    }),
  check(ctx) {
    const a = byId(ctx.scene, 'cube');
    const b = byId(ctx.scene, 'cube1');
    if (!a || !b || a.type !== 'mesh' || b.type !== 'mesh') return { done: false };
    const aOk = matchesGhost(a, S6_GHOST_A);
    const bOffAxis = !near(b.location.x, S6_START_B.x, EXACT) || !near(b.location.y, S6_START_B.y, EXACT);
    const bOk =
      !bOffAxis &&
      near(b.location.z, S6_GHOST_B.location.z, 0.1) &&
      nearVec(b.rotationDeg, vec3(0, 0, 0), EXACT) &&
      nearVec(b.scale, vec3(1, 1, 1), EXACT);
    if (aOk && bOk) return { done: true };
    if (bOffAxis) return { done: false, feedback: { key: 'lab01.s6.bOffAxis', tone: 'fix' } };
    return { done: false, feedback: { key: aOk ? 'lab01.s6.aDone' : 'lab01.s6.progress', tone: 'progress' } };
  },
};

// ---------------------------------------------------------------------------
// 7. Exact values: up 2 m in Z, 45° around Z, scale 1.5.

export const S7_START = vec3(0, 0, 1);
const S7_GOAL = { location: vec3(0, 0, 3), rotationDeg: vec3(0, 0, 45), scale: vec3(1.5, 1.5, 1.5) };
/** "Almost right" margins: close, but not typed. */
const S7_ALMOST = { location: 0.1, rotationDeg: 3, scale: 0.1 };

const s7: StageDefinition = {
  id: 'exact-values',
  titleKey: 'lab01.s7.title',
  instructionKey: 'lab01.s7.instruction',
  hintKeys: ['lab01.s7.hint1', 'lab01.s7.hint2'],
  successKey: 'lab01.s7.success',
  keys: ['g', 'r', 's', 'z', 'digits', 'enter'],
  scene: () => sceneWith([mesh('cube', 'Cube', 'cube', S7_START)], { selected: ['cube'], active: 'cube' }),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const props = ['location', 'rotationDeg', 'scale'] as const;
    const exact = props.filter((p) => nearVec(o[p], S7_GOAL[p], EXACT));
    if (exact.length === props.length) return { done: true };
    const almost = props.find((p) => !exact.includes(p) && nearVec(o[p], S7_GOAL[p], S7_ALMOST[p]));
    if (almost) {
      return { done: false, feedback: { key: `lab01.s7.almost.${almost}`, tone: 'fix' } };
    }
    return {
      done: false,
      feedback: { key: 'lab01.s7.progress', params: { n: exact.length, total: props.length }, tone: 'progress' },
    };
  },
};

// ---------------------------------------------------------------------------
// 8. Cancel (right click) and undo (Ctrl+Z); the scene ends as it started.

function sameTransforms(a: SceneState, b: SceneState): boolean {
  return (
    a.objects.length === b.objects.length &&
    a.objects.every((o) => {
      const p = byId(b, o.id);
      return !!p && nearVec(o.location, p.location, 1e-6) && nearVec(o.rotationDeg, p.rotationDeg, 1e-6) && nearVec(o.scale, p.scale, 1e-6);
    })
  );
}

const s8: StageDefinition = {
  id: 'cancel-undo',
  titleKey: 'lab01.s8.title',
  instructionKey: 'lab01.s8.instruction',
  hintKeys: ['lab01.s8.hint1', 'lab01.s8.hint2'],
  successKey: 'lab01.s8.success',
  keys: ['g', 'rmb', 'esc', 'ctrlZ', 'ctrlShiftZ'],
  scene: () => sceneWith([mesh('cube', 'Cube', 'cube', vec3(0, 0, 1))], { selected: ['cube'], active: 'cube' }),
  check(ctx) {
    const cancelledRmb = ctx.log.some((e) => e.kind === 'cancel' && e.via === 'rightClick');
    const cancelledEsc = ctx.log.some((e) => e.kind === 'cancel' && e.via === 'escape');
    const firstExecute = ctx.log.findIndex((e) => e.kind === 'execute');
    const undone = firstExecute >= 0 && ctx.log.slice(firstExecute).some((e) => e.kind === 'undo');
    const back = sameTransforms(ctx.scene, ctx.initialScene);
    if (cancelledRmb && undone && back) return { done: true };
    let key = 'lab01.s8.needCancel';
    if (!cancelledRmb && cancelledEsc) key = 'lab01.s8.useRightClick';
    else if (cancelledRmb && !undone) key = 'lab01.s8.needUndo';
    else if (cancelledRmb && undone && !back) key = 'lab01.s8.notBack';
    return { done: false, feedback: { key, tone: cancelledRmb ? 'progress' : 'fix' } };
  },
};

// ---------------------------------------------------------------------------
// 9. Final challenge: tidy up the scene until everything sits on its ghost.

export const S9_GHOSTS: readonly Ghost[] = [
  ghost({ id: 'g-cube', objectId: 'cube', primitive: 'cube', location: vec3(0, 0, 1) }),
  ghost({ id: 'g-cyl', objectId: 'cylinder', primitive: 'cylinder', location: vec3(-4, 2, 1) }),
  ghost({ id: 'g-cone', objectId: 'cone', primitive: 'cone', location: vec3(3, 3, 1) }),
  ghost({ id: 'g-sphere', objectId: 'sphere', primitive: 'uvSphere', location: vec3(3, -3, 1) }),
];

const s9Scene = () =>
  sceneWith([
    mesh('cube', 'Cube', 'cube', vec3(2, -1, 1), vec3(0, 0, 30)),
    mesh('cylinder', 'Cylinder', 'cylinder', vec3(-4, 2, 1), vec3(90, 0, 0)),
    mesh('cone', 'Cone', 'cone', vec3(3, 3, 2), vec3(0, 0, 0), vec3(2, 2, 2)),
    mesh('sphere', 'Sphere', 'uvSphere', vec3(6, -5, 0.5), vec3(0, 0, 0), vec3(0.5, 0.5, 0.5)),
  ]);

const s9: StageDefinition = {
  id: 'final',
  titleKey: 'lab01.s9.title',
  instructionKey: 'lab01.s9.instruction',
  hintKeys: [],
  successKey: 'lab01.s9.success',
  keys: [],
  hints: false,
  stats: true,
  ghosts: S9_GHOSTS,
  scene: s9Scene,
  check(ctx) {
    const placed = S9_GHOSTS.filter((g) => {
      const o = byId(ctx.scene, g.objectId);
      return o?.type === 'mesh' && matchesGhost(o, g);
    }).length;
    const result: CheckResult = {
      done: placed === S9_GHOSTS.length,
      feedback: { key: 'lab01.s9.progress', params: { n: placed, total: S9_GHOSTS.length }, tone: 'progress' },
    };
    return result;
  },
};

export const LAB01_STAGES: LabStages = {
  labId: '01-viewport',
  stages: [s1, s2, s3, s4, s5, s6, s7, s8, s9],
  freeScene: s9Scene,
};
