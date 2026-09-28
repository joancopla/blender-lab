/**
 * Lab 03 stages (modifiers): data and checks. Checks read the stack and the
 * modifiers' result (the evaluated mesh), and, where it matters, whether the
 * base mesh was left alone (non-destructive work).
 * All texts live in ca.json under "lab03".
 */
import './texts';
import { type Vec3, add, vec3 } from '../../../apps/blender/math/vec3';
import { analyzeMesh } from '../../../apps/blender/mesh/analyze';
import { type MeshData, meshCounts, meshFromFaces } from '../../../apps/blender/mesh/mesh-data';
import { extrudeRegion } from '../../../apps/blender/mesh/ops/extrude';
import { loopCut } from '../../../apps/blender/mesh/ops/loopcut';
import { faceCenter, faceNormal } from '../../../apps/blender/mesh/geometry';
import { MeshTopology } from '../../../apps/blender/mesh/topology';
import { evaluatedMesh, modifierWarnings } from '../../../apps/blender/modifiers/stack';
import { applySubsurf } from '../../../apps/blender/modifiers/subsurf';
import { type Modifier, type ModifierType, type SubsurfModifier, newModifier } from '../../../apps/blender/modifiers/types';
import { mesh as meshObject, sceneWith } from '../../../apps/blender/scene/factory';
import { type MeshObject, type PrimitiveKind, type SceneState, meshLocalBounds, meshOf } from '../../../apps/blender/scene/scene';
import { type ViewComparison, compareSilhouettes, evaluatedTriangles, worldTriangles } from '../../../apps/blender/stages/silhouette';
import type { Feedback, BlenderLabStages as LabStages, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { t } from '../../../core/i18n';

// ---------------------------------------------------------------------------
// Helpers

const CUBE_AT = vec3(0, 0, 1);

function object(id: string, name: string, kind: PrimitiveKind, loc: Vec3, data?: MeshData, modifiers?: Modifier[]): MeshObject {
  return { ...meshObject(id, name, kind, loc), ...(data ? { mesh: data } : {}), ...(modifiers ? { modifiers } : {}) };
}

/** A scene with one mesh object, selected and active. */
const only = (o: MeshObject): SceneState => sceneWith([o], { selected: [o.id], active: o.id });

const byId = (s: SceneState, id: string) => s.objects.find((o) => o.id === id) as MeshObject | undefined;
const mods = (o: MeshObject) => o.modifiers ?? [];
const firstOf = <T extends ModifierType>(o: MeshObject, type: T) =>
  mods(o).find((m) => m.type === type) as Extract<Modifier, { type: T }> | undefined;
const indexOf = (o: MeshObject, type: ModifierType) => mods(o).findIndex((m) => m.type === type);
const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;
const fb = (key: string, tone: Feedback['tone'] = 'progress', params?: Feedback['params']): Feedback => ({
  key: `lab03.${key}`,
  tone,
  ...(params ? { params } : {}),
});

const subsurf = (levels: number): Modifier => ({ ...(newModifier('SUBSURF') as SubsurfModifier), levels, renderLevels: levels });
const mirror = (): Modifier => newModifier('MIRROR');

/**
 * A box whose faces are split by the given coordinates along each axis (sorted,
 * first and last are the sides). Quads facing outwards, shared vertices.
 */
export function gridBox(xs: readonly number[], ys: readonly number[], zs: readonly number[]): MeshData {
  const verts: Vec3[] = [];
  const index = new Map<string, number>();
  const at = (p: Vec3) => {
    const k = `${p.x},${p.y},${p.z}`;
    let i = index.get(k);
    if (i === undefined) {
      i = verts.length;
      verts.push(p);
      index.set(k, i);
    }
    return i;
  };
  const axes = [xs, ys, zs];
  const faces: number[][] = [];
  for (let a = 0; a < 3; a++) {
    // u x v = a (cyclic axes), so this order faces +a.
    const u = (a + 1) % 3;
    const v = (a + 2) % 3;
    for (const side of [0, 1]) {
      const coord = side ? axes[a]!.at(-1)! : axes[a]![0]!;
      const point = (i: number, j: number) => {
        const c = [0, 0, 0];
        c[a] = coord;
        c[u] = axes[u]![i]!;
        c[v] = axes[v]![j]!;
        return at(vec3(c[0]!, c[1]!, c[2]!));
      };
      for (let i = 0; i < axes[u]!.length - 1; i++) {
        for (let j = 0; j < axes[v]!.length - 1; j++) {
          const quad = [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)];
          faces.push(side ? quad : quad.reverse());
        }
      }
    }
  }
  return meshFromFaces(verts, faces);
}

/** A mesh without the faces that pass `drop`. */
function withoutFaces(m: MeshData, drop: (centre: Vec3, normal: Vec3) => boolean): MeshData {
  const keep = m.faces.filter((_, f) => !drop(faceCenter(m, f), faceNormal(m, f)));
  const used = [...new Set(keep.flat())].sort((a, b) => a - b);
  const map = new Map(used.map((v, i) => [v, i]));
  return meshFromFaces(
    used.map((v) => m.verts[v]!),
    keep.map((f) => f.map((v) => map.get(v)!)),
  );
}

/** Half of a box, open on the X = 0 plane (for the Mirror stages). */
const HALF_BOX = withoutFaces(gridBox([0, 1], [-1, 1], [-1, 1]), (c, n) => near(c.x, 0, 1e-9) && n.x < -0.5);

const translated = (m: MeshData, d: Vec3): MeshData => ({ ...m, verts: m.verts.map((p) => add(p, d)) });

/** Whether a mesh is one closed surface (no open borders, no stray faces). */
function closed(m: MeshData): boolean {
  const t = new MeshTopology(m);
  return t.isManifold() && t.eulerCharacteristic() === 2;
}

/** Silhouette check of the object as drawn (its modifiers' result) against a world-space reference. */
function shapeFeedback(o: MeshObject, scene: SceneState, reference: MeshData, min: number): Feedback | null {
  const res: ViewComparison[] = compareSilhouettes(evaluatedTriangles(o, scene), worldTriangles(reference));
  const bad = res.find((r) => r.iou < min);
  if (!bad) return null;
  const view = { front: 'Front', right: 'Right', top: 'Top' }[bad.view];
  return fb(bad.kind === 'missing' ? 'shape.missing' : 'shape.extra', 'fix', {
    view,
    pct: Math.round(bad.iou * 100),
    min: Math.round(min * 100),
    zone: bad.zone ? t(`lab03.zone.${bad.zone}`) : '',
  });
}

/** Silhouette IoUs of the object as drawn against a reference (for tests). */
export function shapeScores(o: MeshObject, scene: SceneState, reference: MeshData): number[] {
  return compareSilhouettes(evaluatedTriangles(o, scene), worldTriangles(reference)).map((r) => r.iou);
}

// ---------------------------------------------------------------------------
// 1. Smooth: a Subdivision Surface with Levels Viewport 2.

const s1: StageDefinition = {
  id: 'subsurf',
  titleKey: 'lab03.s1.title',
  instructionKey: 'lab03.s1.instruction',
  hintKeys: ['lab03.s1.hint1', 'lab03.s1.hint2'],
  successKey: 'lab03.s1.success',
  keys: ['lmb', 'ctrlZ'],
  propertiesTab: 'modifiers',
  scene: () => only(object('cube', 'Cube', 'cube', CUBE_AT)),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const sub = firstOf(o, 'SUBSURF');
    if (!sub) return { done: false, feedback: fb('s1.add') };
    if (sub.subdivisionType !== 'CATMULL_CLARK') return { done: false, feedback: fb('s1.catmull', 'fix') };
    if (sub.levels !== 2) return { done: false, feedback: fb('s1.levels', 'progress', { n: sub.levels }) };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 2. Support loops: the subdivided cube keeps its edges.

/** Loops at ±0.8 on every axis. */
const SUPPORT_AT = [-1, -0.8, 0.8, 1];
export const S2_REF = translated(applySubsurf(gridBox(SUPPORT_AT, SUPPORT_AT, SUPPORT_AT), subsurf(2) as SubsurfModifier, 2), CUBE_AT);

const s2: StageDefinition = {
  id: 'support',
  titleKey: 'lab03.s2.title',
  instructionKey: 'lab03.s2.instruction',
  hintKeys: ['lab03.s2.hint1', 'lab03.s2.hint2'],
  successKey: 'lab03.s2.success',
  keys: ['tab', 'ctrlR', 'wheel', 'rmb', 's', 'x', 'y', 'z', 'digits', 'enter'],
  propertiesTab: 'modifiers',
  referenceMeshes: [S2_REF],
  scene: () => only(object('cube', 'Cube', 'cube', CUBE_AT, undefined, [subsurf(2)])),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    if (!firstOf(o, 'SUBSURF')) return { done: false, feedback: fb('s2.keepSubsurf', 'fix') };
    // 99 %: loops from about 0.6 of the way out pass; cuts left in the middle (0.33) or at 0.5 do not.
    const shape = shapeFeedback(o, ctx.scene, S2_REF, 0.99);
    if (shape) return { done: false, feedback: meshCounts(meshOf(o)).verts === 8 ? fb('s2.start') : shape };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 3. Mirror: half a box completed with Mirror, Clipping on, seam joined.

const s3: StageDefinition = {
  id: 'mirror',
  titleKey: 'lab03.s3.title',
  instructionKey: 'lab03.s3.instruction',
  hintKeys: ['lab03.s3.hint1', 'lab03.s3.hint2'],
  successKey: 'lab03.s3.success',
  keys: ['lmb'],
  propertiesTab: 'modifiers',
  scene: () => only(object('half', 'Cube', 'cube', CUBE_AT, HALF_BOX)),
  check(ctx) {
    const o = byId(ctx.scene, 'half');
    if (!o) return { done: false };
    const m = firstOf(o, 'MIRROR');
    if (!m) return { done: false, feedback: fb('s3.add') };
    if (!m.useAxis[0]) return { done: false, feedback: fb('s3.axis', 'fix') };
    if (!closed(evaluatedMesh(o, ctx.scene))) return { done: false, feedback: fb('s3.seam', 'fix') };
    if (!m.useClip) return { done: false, feedback: fb('s3.clip') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 4. Array: six steps going up (Relative Offset in X and Z).

const STEP = gridBox([0, 0.5], [-1, 1], [0, 0.25]);
const STEPS = 6;

const s4: StageDefinition = {
  id: 'array',
  titleKey: 'lab03.s4.title',
  instructionKey: 'lab03.s4.instruction',
  hintKeys: ['lab03.s4.hint1', 'lab03.s4.hint2'],
  successKey: 'lab03.s4.success',
  keys: ['lmb', 'digits', 'enter'],
  propertiesTab: 'modifiers',
  scene: () => only(object('step', 'Cube', 'cube', vec3(0, 0, 0), STEP)),
  check(ctx) {
    const o = byId(ctx.scene, 'step');
    if (!o) return { done: false };
    const a = firstOf(o, 'ARRAY');
    if (!a) return { done: false, feedback: fb('s4.add') };
    if (a.count !== STEPS) return { done: false, feedback: fb('s4.count', 'progress', { n: a.count, want: STEPS }) };
    const b = meshLocalBounds(evaluatedMesh(o, ctx.scene));
    const height = (b.max.z - b.min.z) * o.scale.z;
    const depth = (b.max.x - b.min.x) * o.scale.x;
    if (!near(height, STEPS * 0.25, 0.01) || !near(depth, STEPS * 0.5, 0.01)) {
      return { done: false, feedback: fb('s4.offset', 'fix') };
    }
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 5. Non-destructive Bevel: Limit Method Angle, 3 segments, base mesh untouched.

const SLAB = gridBox([-1, 1], [-1, 1], [-0.25, 0.25]);
const S5_SEGMENTS = 3;

const s5: StageDefinition = {
  id: 'bevel',
  titleKey: 'lab03.s5.title',
  instructionKey: 'lab03.s5.instruction',
  hintKeys: ['lab03.s5.hint1', 'lab03.s5.hint2'],
  successKey: 'lab03.s5.success',
  keys: ['lmb', 'digits', 'enter'],
  propertiesTab: 'modifiers',
  scene: () => only(object('slab', 'Cube', 'cube', CUBE_AT, SLAB)),
  check(ctx) {
    const o = byId(ctx.scene, 'slab');
    const start = byId(ctx.initialScene, 'slab');
    if (!o || !start) return { done: false };
    if (meshOf(o) !== meshOf(start)) return { done: false, feedback: fb('s5.destructive', 'fix') };
    const b = firstOf(o, 'BEVEL');
    if (!b) return { done: false, feedback: fb('s5.add') };
    if (b.limitMethod !== 'ANGLE') return { done: false, feedback: fb('s5.angle', 'fix') };
    if (b.segments !== S5_SEGMENTS) return { done: false, feedback: fb('s5.segments', 'progress', { n: b.segments, want: S5_SEGMENTS }) };
    if (modifierWarnings(o, ctx.scene).size > 0) return { done: false, feedback: fb('s5.unsupported', 'fix') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 6. Order matters: Subdivision before Mirror leaves a crease; Mirror first.

/** The right stack's result: the half box mirrored (a box cut at X = 0), then subdivided. */
const S6_REF = translated(applySubsurf(gridBox([-1, 0, 1], [-1, 1], [-1, 1]), subsurf(2) as SubsurfModifier, 2), CUBE_AT);

const s6: StageDefinition = {
  id: 'order',
  titleKey: 'lab03.s6.title',
  instructionKey: 'lab03.s6.instruction',
  hintKeys: ['lab03.s6.hint1', 'lab03.s6.hint2'],
  successKey: 'lab03.s6.success',
  keys: ['lmb'],
  propertiesTab: 'modifiers',
  referenceMeshes: [S6_REF],
  scene: () => only(object('half', 'Cube', 'cube', CUBE_AT, HALF_BOX, [subsurf(2), mirror()])),
  check(ctx) {
    const o = byId(ctx.scene, 'half');
    if (!o) return { done: false };
    const mi = indexOf(o, 'MIRROR');
    const si = indexOf(o, 'SUBSURF');
    if (mi < 0 || si < 0) return { done: false, feedback: fb('s6.keep', 'fix') };
    if (si < mi) return { done: false, feedback: fb('s6.order') };
    const shape = shapeFeedback(o, ctx.scene, S6_REF, 0.95);
    return shape ? { done: false, feedback: shape } : { done: true };
  },
};

// ---------------------------------------------------------------------------
// 7. Thickness: the seat, a plane made 0.1 m thick with Solidify.

const SEAT_THICKNESS = 0.1;

const s7: StageDefinition = {
  id: 'solidify',
  titleKey: 'lab03.s7.title',
  instructionKey: 'lab03.s7.instruction',
  hintKeys: ['lab03.s7.hint1', 'lab03.s7.hint2'],
  successKey: 'lab03.s7.success',
  keys: ['lmb', 'digits', 'enter'],
  propertiesTab: 'modifiers',
  scene: () => only(object('seat', 'Plane', 'plane', CUBE_AT)),
  check(ctx) {
    const o = byId(ctx.scene, 'seat');
    if (!o) return { done: false };
    const s = firstOf(o, 'SOLIDIFY');
    if (!s) return { done: false, feedback: fb('s7.add') };
    if (!near(Math.abs(s.thickness), SEAT_THICKNESS, 0.001)) {
      return { done: false, feedback: fb('s7.thickness', 'progress', { n: Math.round(Math.abs(s.thickness) * 1000) / 1000 }) };
    }
    if (!s.useRim) return { done: false, feedback: fb('s7.rim', 'fix') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 8. Smooth or flat: Shade Smooth, Shade Flat, then Shade Auto Smooth.

const allSmooth = (o: MeshObject) => meshOf(o).smoothFaces?.every(Boolean) === true;
const allFlat = (o: MeshObject) => !meshOf(o).smoothFaces?.some(Boolean);

const s8: StageDefinition = {
  id: 'shading',
  titleKey: 'lab03.s8.title',
  instructionKey: 'lab03.s8.instruction',
  hintKeys: ['lab03.s8.hint1', 'lab03.s8.hint2'],
  successKey: 'lab03.s8.success',
  keys: ['rmb', 'lmb'],
  propertiesTab: 'data',
  scene: () => only(object('cyl', 'Cylinder', 'cylinder', CUBE_AT)),
  check(ctx) {
    const o = byId(ctx.scene, 'cyl');
    if (!o) return { done: false };
    let step = (ctx.memory.get('step') as number | undefined) ?? 0;
    // Shade Smooth leaves Auto Smooth as it is, so the first step only looks at the faces.
    if (step === 0 && allSmooth(o)) step = 1;
    if (step === 1 && allFlat(o)) step = 2;
    if (step === 2 && allSmooth(o) && o.autoSmooth) return { done: true };
    ctx.memory.set('step', step);
    return { done: false, feedback: fb(`s8.step${step}`) };
  },
};

// ---------------------------------------------------------------------------
// 9. Apply the Mirror, keep the Subdivision.

const s9: StageDefinition = {
  id: 'apply',
  titleKey: 'lab03.s9.title',
  instructionKey: 'lab03.s9.instruction',
  hintKeys: ['lab03.s9.hint1', 'lab03.s9.hint2'],
  successKey: 'lab03.s9.success',
  keys: ['ctrlA', 'lmb'],
  propertiesTab: 'modifiers',
  scene: () => only(object('half', 'Cube', 'cube', CUBE_AT, HALF_BOX, [mirror(), subsurf(2)])),
  check(ctx) {
    const o = byId(ctx.scene, 'half');
    if (!o) return { done: false };
    if (!firstOf(o, 'SUBSURF')) return { done: false, feedback: fb('s9.keepSubsurf', 'fix') };
    if (firstOf(o, 'MIRROR')) return { done: false, feedback: fb('s9.apply') };
    const base = meshOf(o);
    const b = meshLocalBounds(base);
    if (!closed(base) || !near(b.min.x, -1, 1e-6)) return { done: false, feedback: fb('s9.deleted', 'fix') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 10. Final challenge: the stool again, with a small base mesh and a Mirror.

function facesWhere(m: MeshData, n: Vec3, where: (c: Vec3) => boolean): number[] {
  return m.faces
    .map((_, f) => f)
    .filter((f) => {
      const k = faceNormal(m, f);
      return k.x * n.x + k.y * n.y + k.z * n.z > 0.99 && where(faceCenter(m, f));
    });
}

/** The Lab 02 stool: a 2 x 2 x 0.4 seat on four legs, 1.6 m long. */
function stool(): MeshData {
  const cube = gridBox([-1, 1], [-1, 1], [-1, 1]);
  let m: MeshData = { ...cube, verts: cube.verts.map((p) => vec3(p.x, p.y, p.z * 0.2)) };
  const alongX = m.edges.findIndex(([a, b]) => m.verts[a]!.y === m.verts[b]!.y && m.verts[a]!.z === m.verts[b]!.z);
  m = loopCut(m, alongX, 2).mesh;
  const alongY = m.edges.findIndex(
    ([a, b]) => m.verts[a]!.x === m.verts[b]!.x && m.verts[a]!.z === m.verts[b]!.z && Math.abs(m.verts[a]!.x) === 1,
  );
  m = loopCut(m, alongY, 2).mesh;
  const corners = facesWhere(m, vec3(0, 0, -1), (c) => Math.abs(c.x) > 0.5 && Math.abs(c.y) > 0.5);
  const r = extrudeRegion(m, corners);
  const legVerts = new Set(corners.flatMap((f) => [...r.mesh.faces[f]!]));
  return { ...r.mesh, verts: r.mesh.verts.map((p, i) => (legVerts.has(i) ? add(p, vec3(0, 0, -1.6)) : p)) };
}
const STOOL_AT = vec3(0, 0, 1.8);
export const S10_REF = translated(stool(), STOOL_AT);
/** Base mesh limit: about half the faces of the Lab 02 stool; Mirror does the rest. */
export const S10_MAX_FACES = 24;

const s10: StageDefinition = {
  id: 'final',
  titleKey: 'lab03.s10.title',
  instructionKey: 'lab03.s10.instruction',
  hintKeys: [],
  successKey: 'lab03.s10.success',
  keys: [],
  hints: false,
  stats: true,
  propertiesTab: 'modifiers',
  referenceMeshes: [S10_REF],
  scene: () => only(object('cube', 'Cube', 'cube', STOOL_AT)),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const shape = shapeFeedback(o, ctx.scene, S10_REF, 0.85);
    if (shape) return { done: false, feedback: shape };
    if (!firstOf(o, 'MIRROR')) return { done: false, feedback: fb('s10.mirror', 'fix') };
    const faces = meshCounts(meshOf(o)).faces;
    if (faces > S10_MAX_FACES) return { done: false, feedback: fb('s10.faces', 'fix', { n: faces, max: S10_MAX_FACES }) };
    const r = analyzeMesh(evaluatedMesh(o, ctx.scene));
    if (r.ngons.length || r.duplicates.length || r.nonManifoldEdges.length || r.flippedFaces.length) {
      return { done: false, feedback: fb('s10.clean', 'fix') };
    }
    return { done: true };
  },
};

export const LAB03_STAGES: LabStages = {
  labId: '03-modifiers',
  stages: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10],
  freeScene: () => only(object('cube', 'Cube', 'cube', CUBE_AT)),
};

/** For tests. */
export const SHAPES = { HALF_BOX, STEP, SLAB, S6_REF };
