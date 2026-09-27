/**
 * Lab 02 stages (Edit Mode and basic modelling): data and checks.
 * Reference shapes are built with the engine's own mesh operations.
 * All texts live in ca.json under "lab02".
 */
import { selectionOf } from '../../engine/operators/edit-mode';
import { EMPTY_SELECTION, topologyOf } from '../../engine/edit/selection';
import { type Vec3, add, vec3 } from '../../engine/math/vec3';
import { analyzeMesh } from '../../engine/mesh/analyze';
import { faceCenter, faceNormal } from '../../engine/mesh/geometry';
import { type MeshData, meshCounts, meshFromFaces } from '../../engine/mesh/mesh-data';
import { bevelEdges } from '../../engine/mesh/ops/bevel';
import { extrudeRegion } from '../../engine/mesh/ops/extrude';
import { inset } from '../../engine/mesh/ops/inset';
import { loopCut } from '../../engine/mesh/ops/loopcut';
import { cubeMesh, uvSphereMesh } from '../../engine/mesh/primitives';
import { MeshTopology } from '../../engine/mesh/topology';
import { mesh as meshObject, sceneWith } from '../../engine/scene/factory';
import {
  type MeshObject,
  type SceneState,
  type SelectMode,
  isEditMode,
  meshOf,
  selectModeOf,
} from '../../engine/scene/scene';
import { type ViewComparison, compareSilhouettes, objectTriangles, worldTriangles } from '../../engine/stages/silhouette';
import type { CheckResult, Feedback, LabStages, StageDefinition } from '../../engine/stages/types';
import type { ComponentHint } from '../../engine/viewport/lab-elements';
import { t } from '../../i18n';

// ---------------------------------------------------------------------------
// Helpers

const VERT: SelectMode = { vert: true, edge: false, face: false };
const CUBE_AT = vec3(0, 0, 1);

/** A mesh object named like Blender's, optionally with its own mesh data. */
function object(id: string, name: string, kind: 'cube' | 'uvSphere', loc: Vec3, data?: MeshData): MeshObject {
  return { ...meshObject(id, name, kind, loc), ...(data ? { mesh: data } : {}) };
}

/** Scene already in Edit Mode on `ids`, nothing selected, vertex mode. */
function editing(s: SceneState, ids: readonly string[]): SceneState {
  return {
    ...s,
    editObjectIds: ids,
    selectMode: VERT,
    objects: s.objects.map((o) => (o.type === 'mesh' && ids.includes(o.id) ? { ...o, meshSelection: EMPTY_SELECTION } : o)),
  };
}

const byId = (s: SceneState, id: string) => s.objects.find((o) => o.id === id) as MeshObject | undefined;
const sameSet = (a: readonly number[], b: readonly number[]) => {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
const moveVerts = (m: MeshData, verts: Iterable<number>, d: Vec3): MeshData => {
  const set = new Set(verts);
  return { ...m, verts: m.verts.map((p, i) => (set.has(i) ? add(p, d) : p)) };
};
const scaleVertsXY = (m: MeshData, verts: Iterable<number>, f: number): MeshData => {
  const set = new Set(verts);
  return { ...m, verts: m.verts.map((p, i) => (set.has(i) ? vec3(p.x * f, p.y * f, p.z) : p)) };
};
const translated = (m: MeshData, d: Vec3): MeshData => ({ ...m, verts: m.verts.map((p) => add(p, d)) });
const facesVerts = (m: MeshData, faces: readonly number[]) => faces.flatMap((f) => [...m.faces[f]!]);
/** Faces whose normal is close to `n` and whose centre passes `where`. */
const facesWhere = (m: MeshData, n: Vec3, where: (c: Vec3) => boolean) =>
  m.faces
    .map((_, f) => f)
    .filter((f) => {
      const k = faceNormal(m, f);
      return k.x * n.x + k.y * n.y + k.z * n.z > 0.99 && where(faceCenter(m, f));
    });

const toWorld = (o: Vec3, p: Vec3) => add(o, p);

/** Silhouette check against a world-space reference. */
function shapeFeedback(o: MeshObject, reference: MeshData, min: number): Feedback | null {
  const res: ViewComparison[] = compareSilhouettes(objectTriangles(o), worldTriangles(reference));
  const bad = res.find((r) => r.iou < min);
  if (!bad) return null;
  const view = { front: 'Front', right: 'Right', top: 'Top' }[bad.view];
  return {
    key: bad.kind === 'missing' ? 'lab02.shape.missing' : 'lab02.shape.extra',
    params: { view, pct: Math.round(bad.iou * 100), min: Math.round(min * 100), zone: bad.zone ? t(`lab02.zone.${bad.zone}`) : '' },
    tone: 'fix',
  };
}

// ---------------------------------------------------------------------------
// 1. Tab and select modes: vertices, then edges, then faces.

const CUBE = cubeMesh();
const S1_VERTS = [1, 4, 5];
const S1_EDGES = topologyOf(CUBE).faceEdges[5]!; // the four edges of the top face
const S1_FACES = [1, 2]; // +X and -Y
const worldCube = (p: Vec3) => toWorld(CUBE_AT, p);
const S1_HINTS: readonly (readonly ComponentHint[])[] = [
  [{ points: S1_VERTS.map((v) => worldCube(CUBE.verts[v]!)) }],
  [{ lines: S1_EDGES.map((e) => [worldCube(CUBE.verts[CUBE.edges[e]![0]]!), worldCube(CUBE.verts[CUBE.edges[e]![1]]!)] as const) }],
  [
    {
      triangles: S1_FACES.flatMap((f) => {
        const [a, b, c, d] = CUBE.faces[f]!.map((v) => worldCube(CUBE.verts[v]!)) as [Vec3, Vec3, Vec3, Vec3];
        return [
          [a, b, c],
          [a, c, d],
        ] as const;
      }),
    },
  ],
];
const S1_MODES = [
  { vert: true, edge: false, face: false },
  { vert: false, edge: true, face: false },
  { vert: false, edge: false, face: true },
] as const;
const S1_MODE_KEYS = ['vert', 'edge', 'face'] as const;

const s1: StageDefinition = {
  id: 'modes',
  titleKey: 'lab02.s1.title',
  instructionKey: 'lab02.s1.instruction',
  hintKeys: ['lab02.s1.hint1', 'lab02.s1.hint2'],
  successKey: 'lab02.s1.success',
  keys: ['tab', 'one', 'two', 'three', 'lmb', 'shiftLmb'],
  scene: () => sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }),
  check(ctx) {
    let step = (ctx.memory.get('step') as number | undefined) ?? 0;
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    if (!isEditMode(ctx.scene)) {
      return { done: false, hints: S1_HINTS[step], feedback: { key: 'lab02.s1.enterEdit', tone: 'progress' } };
    }
    const sel = selectionOf(o);
    const mode = selectModeOf(ctx.scene);
    const want = S1_MODES[step]!;
    const rightMode = mode.vert === want.vert && mode.edge === want.edge && mode.face === want.face;
    const ok =
      rightMode &&
      (step === 0 ? sameSet(sel.verts, S1_VERTS) : step === 1 ? sameSet(sel.edges, S1_EDGES) : sameSet(sel.faces, S1_FACES));
    if (ok) {
      step++;
      ctx.memory.set('step', step);
      if (step === 3) return { done: true };
    }
    const k = S1_MODE_KEYS[step]!;
    const modeOk = selectModeOf(ctx.scene)[k] && Object.values(selectModeOf(ctx.scene)).filter(Boolean).length === 1;
    return {
      done: false,
      hints: S1_HINTS[step],
      feedback: modeOk
        ? { key: `lab02.s1.step${step}`, params: { n: step + 1 }, tone: 'progress' }
        : { key: `lab02.s1.mode.${k}`, tone: 'fix' },
    };
  },
};

// ---------------------------------------------------------------------------
// 2. See through: all the vertices on the +X side, including the hidden ones.

const S2_TARGET = [4, 5, 6, 7];

const s2: StageDefinition = {
  id: 'xray',
  titleKey: 'lab02.s2.title',
  instructionKey: 'lab02.s2.instruction',
  hintKeys: ['lab02.s2.hint1', 'lab02.s2.hint2'],
  successKey: 'lab02.s2.success',
  keys: ['altZ', 'b', 'lmb'],
  scene: () => editing(sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }), ['cube']),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o || !isEditMode(ctx.scene)) return { done: false, feedback: { key: 'lab02.common.stayInEdit', tone: 'fix' } };
    const sel = selectionOf(o).verts;
    if (sameSet(sel, S2_TARGET)) return { done: true };
    const extra = sel.filter((v) => !S2_TARGET.includes(v)).length;
    const missing = S2_TARGET.filter((v) => !sel.includes(v)).length;
    if (extra > 0) return { done: false, feedback: { key: 'lab02.s2.extra', params: { n: extra }, tone: 'fix' } };
    return { done: false, feedback: { key: 'lab02.s2.missing', params: { n: missing }, tone: missing < 4 ? 'fix' : 'progress' } };
  },
};

// ---------------------------------------------------------------------------
// 3. Edge loops on a UV sphere: the equator, then two other rings together.

const SPHERE = uvSphereMesh();
const SPHERE_AT = vec3(0, 0, 1);
const ringVert = (i: number, j: number) => 1 + (i - 1) * 32 + (j % 32);
const ringEdges = (i: number) => {
  const tp = topologyOf(SPHERE);
  return Array.from({ length: 32 }, (_, j) => tp.findEdge(ringVert(i, j), ringVert(i, j + 1))!);
};
const S3_STEPS = [ringEdges(8), [...ringEdges(5), ...ringEdges(11)]];
const edgeLines = (m: MeshData, at: Vec3, edges: readonly number[]) =>
  edges.map((e) => [add(at, m.verts[m.edges[e]![0]]!), add(at, m.verts[m.edges[e]![1]]!)] as const);
const S3_HINTS: readonly (readonly ComponentHint[])[] = S3_STEPS.map((edges) => [{ lines: edgeLines(SPHERE, SPHERE_AT, edges) }]);

const s3: StageDefinition = {
  id: 'loops',
  titleKey: 'lab02.s3.title',
  instructionKey: 'lab02.s3.instruction',
  hintKeys: ['lab02.s3.hint1', 'lab02.s3.hint2'],
  successKey: 'lab02.s3.success',
  keys: ['altLmb', 'shiftAltLmb', 'altA'],
  scene: () => editing(sceneWith([object('sphere', 'Sphere', 'uvSphere', SPHERE_AT)], { selected: ['sphere'], active: 'sphere' }), ['sphere']),
  check(ctx) {
    let step = (ctx.memory.get('step') as number | undefined) ?? 0;
    const o = byId(ctx.scene, 'sphere');
    if (!o || !isEditMode(ctx.scene)) return { done: false, hints: S3_HINTS[step], feedback: { key: 'lab02.common.stayInEdit', tone: 'fix' } };
    if (sameSet(selectionOf(o).edges, S3_STEPS[step]!)) {
      step++;
      ctx.memory.set('step', step);
      if (step === S3_STEPS.length) return { done: true };
    }
    return { done: false, hints: S3_HINTS[step], feedback: { key: `lab02.s3.step${step}`, tone: 'progress' } };
  },
};

// ---------------------------------------------------------------------------
// 4. Deform: a cube into a truncated pyramid (top face up 1 m and scaled 0.5).

const S4_REF = translated(scaleVertsXY(moveVerts(CUBE, [1, 3, 5, 7], vec3(0, 0, 1)), [1, 3, 5, 7], 0.5), CUBE_AT);

const s4: StageDefinition = {
  id: 'deform',
  titleKey: 'lab02.s4.title',
  instructionKey: 'lab02.s4.instruction',
  hintKeys: ['lab02.s4.hint1', 'lab02.s4.hint2'],
  successKey: 'lab02.s4.success',
  keys: ['three', 'g', 'z', 's'],
  referenceMeshes: [S4_REF],
  scene: () => editing(sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }), ['cube']),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const c = meshCounts(meshOf(o));
    if (c.verts !== 8 || c.faces !== 6) return { done: false, feedback: { key: 'lab02.s4.onlyMove', tone: 'fix' } };
    const f = shapeFeedback(o, S4_REF, 0.9);
    return f ? { done: false, feedback: f } : { done: true };
  },
};

// ---------------------------------------------------------------------------
// 5. Extrude: an L shape (top face up 2 m, then the upper block's +X face 2 m out).

function lShape(): MeshData {
  const r1 = extrudeRegion(CUBE, [5]);
  const up = moveVerts(r1.mesh, facesVerts(r1.mesh, [5]), vec3(0, 0, 2));
  const side = facesWhere(up, vec3(1, 0, 0), (c) => c.z > 1.5)[0]!;
  const r2 = extrudeRegion(up, [side]);
  return moveVerts(r2.mesh, facesVerts(r2.mesh, [side]), vec3(2, 0, 0));
}
const S5_REF = translated(lShape(), CUBE_AT);
export const S5_FACES = meshCounts(S5_REF).faces;

const s5: StageDefinition = {
  id: 'extrude',
  titleKey: 'lab02.s5.title',
  instructionKey: 'lab02.s5.instruction',
  hintKeys: ['lab02.s5.hint1', 'lab02.s5.hint2'],
  successKey: 'lab02.s5.success',
  keys: ['three', 'e', 'digits', 'enter'],
  referenceMeshes: [S5_REF],
  scene: () => editing(sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }), ['cube']),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const shape = shapeFeedback(o, S5_REF, 0.9);
    if (shape) return { done: false, feedback: shape };
    const n = meshCounts(meshOf(o)).faces;
    if (n !== S5_FACES) return { done: false, feedback: { key: 'lab02.common.faces', params: { n, want: S5_FACES }, tone: 'fix' } };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 6. Inset and extrude inwards: an open container.

function container(): MeshData {
  const ins = inset(CUBE, [5], { thickness: 0.25, depth: 0, individual: false });
  const r = extrudeRegion(ins, [5]);
  return moveVerts(r.mesh, facesVerts(r.mesh, [5]), vec3(0, 0, -1.5));
}
const S6_REF = translated(container(), CUBE_AT);
export const S6_FACES = meshCounts(S6_REF).faces;

/** Is there an inner floor: a face looking up, well below the rim and inside it? */
function hasInnerFloor(m: MeshData): boolean {
  return facesWhere(m, vec3(0, 0, 1), (c) => c.z < 0.5 && Math.abs(c.x) < 0.9 && Math.abs(c.y) < 0.9).length > 0;
}

const s6: StageDefinition = {
  id: 'container',
  titleKey: 'lab02.s6.title',
  instructionKey: 'lab02.s6.instruction',
  hintKeys: ['lab02.s6.hint1', 'lab02.s6.hint2'],
  successKey: 'lab02.s6.success',
  keys: ['three', 'i', 'e', 'digits'],
  referenceMeshes: [S6_REF],
  scene: () => editing(sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }), ['cube']),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const m = meshOf(o);
    const shape = shapeFeedback(o, S6_REF, 0.9);
    if (shape) return { done: false, feedback: shape };
    if (!hasInnerFloor(m)) return { done: false, feedback: { key: 'lab02.s6.notHollow', tone: 'fix' } };
    if (!new MeshTopology(m).isManifold()) return { done: false, feedback: { key: 'lab02.common.notManifold', tone: 'fix' } };
    const n = meshCounts(m).faces;
    if (n !== S6_FACES) return { done: false, feedback: { key: 'lab02.common.faces', params: { n, want: S6_FACES }, tone: 'fix' } };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 7. Loop cuts: a tall box, two horizontal cuts, then the middle part wider.

const TALL = { ...CUBE, verts: CUBE.verts.map((p) => vec3(p.x, p.y, p.z * 2)) };
const TALL_AT = vec3(0, 0, 2);
function barrel(): MeshData {
  const vertical = TALL.edges.findIndex(([a, b]) => TALL.verts[a]!.x === TALL.verts[b]!.x && TALL.verts[a]!.y === TALL.verts[b]!.y);
  const r = loopCut(TALL, vertical, 2);
  const loopVerts = [...new Set(r.newEdges.flatMap((e) => [...r.mesh.edges[e]!]))];
  return scaleVertsXY(r.mesh, loopVerts, 1.4);
}
const S7_REF = translated(barrel(), TALL_AT);

const s7: StageDefinition = {
  id: 'loopcuts',
  titleKey: 'lab02.s7.title',
  instructionKey: 'lab02.s7.instruction',
  hintKeys: ['lab02.s7.hint1', 'lab02.s7.hint2'],
  successKey: 'lab02.s7.success',
  keys: ['ctrlR', 'wheel', 'rmb', 's', 'shiftZ'],
  referenceMeshes: [S7_REF],
  scene: () => editing(sceneWith([object('box', 'Cube', 'cube', TALL_AT, TALL)], { selected: ['box'], active: 'box' }), ['box']),
  check(ctx) {
    const o = byId(ctx.scene, 'box');
    if (!o) return { done: false };
    const c = meshCounts(meshOf(o));
    if (c.verts !== 16 || c.faces !== 14) {
      return { done: false, feedback: { key: 'lab02.s7.cuts', params: { n: Math.max(0, (c.verts - 8) / 4) }, tone: 'fix' } };
    }
    const shape = shapeFeedback(o, S7_REF, 0.88);
    return shape ? { done: false, feedback: shape } : { done: true };
  },
};

// ---------------------------------------------------------------------------
// 8. Bevel the four vertical edges with 4 segments.

const S8_SEGMENTS = 4;
const verticalEdges = (m: MeshData) =>
  m.edges.map((_, i) => i).filter((i) => {
    const [a, b] = m.edges[i]!;
    return m.verts[a]!.x === m.verts[b]!.x && m.verts[a]!.y === m.verts[b]!.y;
  });
const S8_REF = translated(bevelEdges(CUBE, verticalEdges(CUBE), 0.5, S8_SEGMENTS)!, CUBE_AT);

const s8: StageDefinition = {
  id: 'bevel',
  titleKey: 'lab02.s8.title',
  instructionKey: 'lab02.s8.instruction',
  hintKeys: ['lab02.s8.hint1', 'lab02.s8.hint2'],
  successKey: 'lab02.s8.success',
  keys: ['two', 'altLmb', 'ctrlB', 'wheel'],
  referenceMeshes: [S8_REF],
  scene: () => editing(sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }), ['cube']),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const v = meshCounts(meshOf(o)).verts;
    if (v !== 8 * (S8_SEGMENTS + 1)) {
      const seg = v > 8 && v % 8 === 0 ? v / 8 - 1 : null;
      return {
        done: false,
        feedback: seg
          ? { key: 'lab02.s8.segments', params: { n: seg, want: S8_SEGMENTS }, tone: 'fix' }
          : { key: 'lab02.s8.notYet', tone: 'progress' },
      };
    }
    const shape = shapeFeedback(o, S8_REF, 0.9);
    return shape ? { done: false, feedback: shape } : { done: true };
  },
};

// ---------------------------------------------------------------------------
// 9. Clean up a mesh: duplicated vertices, a face too many, n-gons.

/** A cube with its top split off (duplicates), an inner triangle and a vertex in the middle of an edge. */
export function dirtyCube(): MeshData {
  const verts = [...CUBE.verts, ...[1, 3, 5, 7].map((v) => CUBE.verts[v]!), vec3(0, -1, -1)];
  const copy = new Map([
    [1, 8],
    [3, 9],
    [5, 10],
    [7, 11],
  ]);
  const extra = 12; // on the bottom front edge 0-4
  const faces = CUBE.faces.map((f, i) => {
    let face = i === 5 ? f.map((v) => copy.get(v)!) : [...f];
    // Put the extra vertex between 0 and 4 in both faces that use that edge.
    const out: number[] = [];
    face.forEach((v, k) => {
      out.push(v);
      const next = face[(k + 1) % face.length]!;
      if ((v === 0 && next === 4) || (v === 4 && next === 0)) out.push(extra);
    });
    face = out;
    return face;
  });
  faces.push([0, 6, 5]); // a face that should not be there
  return meshFromFaces(verts, faces);
}

const s9: StageDefinition = {
  id: 'cleanup',
  titleKey: 'lab02.s9.title',
  instructionKey: 'lab02.s9.instruction',
  hintKeys: ['lab02.s9.hint1', 'lab02.s9.hint2'],
  successKey: 'lab02.s9.success',
  keys: ['m', 'x', 'a', 'lmb'],
  analyzer: true,
  scene: () => editing(sceneWith([object('cube', 'Cube', 'cube', CUBE_AT, dirtyCube())], { selected: ['cube'], active: 'cube' }), ['cube']),
  check(ctx) {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const m = meshOf(o);
    const r = analyzeMesh(m);
    const dup = r.duplicates.reduce((n, g) => n + g.length - 1, 0);
    const clean = dup === 0 && r.nonManifoldEdges.length === 0 && r.ngons.length === 0 && r.flippedFaces.length === 0;
    const c = meshCounts(m);
    if (clean && c.verts === 8 && c.faces === 6) return { done: true };
    return {
      done: false,
      feedback: {
        key: 'lab02.s9.remaining',
        params: { dup, nm: r.nonManifoldEdges.length, ngons: r.ngons.length },
        tone: 'progress',
      },
    };
  },
};

// ---------------------------------------------------------------------------
// 10. Final challenge: a stool from a cube.

function stool(): MeshData {
  // Seat: a slab 2 x 2 x 0.4.
  let m: MeshData = { ...CUBE, verts: CUBE.verts.map((p) => vec3(p.x, p.y, p.z * 0.2)) };
  // Two cuts across X and two across Y make a 3 x 3 grid on the bottom.
  const alongX = m.edges.findIndex(([a, b]) => m.verts[a]!.y === m.verts[b]!.y && m.verts[a]!.z === m.verts[b]!.z);
  m = loopCut(m, alongX, 2).mesh;
  const alongY = m.edges.findIndex(
    ([a, b]) => m.verts[a]!.x === m.verts[b]!.x && m.verts[a]!.z === m.verts[b]!.z && Math.abs(m.verts[a]!.x) === 1,
  );
  m = loopCut(m, alongY, 2).mesh;
  // Legs: the four bottom corner faces extruded down.
  const corners = facesWhere(m, vec3(0, 0, -1), (c) => Math.abs(c.x) > 0.5 && Math.abs(c.y) > 0.5);
  const r = extrudeRegion(m, corners);
  return moveVerts(r.mesh, facesVerts(r.mesh, corners), vec3(0, 0, -1.6));
}
const STOOL_AT = vec3(0, 0, 1.8);
const S10_REF = translated(stool(), STOOL_AT);

const s10: StageDefinition = {
  id: 'final',
  titleKey: 'lab02.s10.title',
  instructionKey: 'lab02.s10.instruction',
  hintKeys: [],
  successKey: 'lab02.s10.success',
  keys: [],
  hints: false,
  stats: true,
  referenceMeshes: [S10_REF],
  scene: () => sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }),
  check(ctx): CheckResult {
    const o = byId(ctx.scene, 'cube');
    if (!o) return { done: false };
    const shape = shapeFeedback(o, S10_REF, 0.85);
    if (shape) return { done: false, feedback: shape };
    const m = meshOf(o);
    const r = analyzeMesh(m);
    if (r.ngons.length || r.duplicates.length || r.nonManifoldEdges.length || r.flippedFaces.length) {
      return { done: false, feedback: { key: 'lab02.s10.clean', tone: 'fix' } };
    }
    return { done: true };
  },
};

export const LAB02_STAGES: LabStages = {
  labId: '02-edit-mode',
  stages: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10],
  freeScene: () => sceneWith([object('cube', 'Cube', 'cube', CUBE_AT)], { selected: ['cube'], active: 'cube' }),
};

/** For tests: world-space reference of a stage by id. */
export const REFERENCES = { deform: S4_REF, extrude: S5_REF, container: S6_REF, loopcuts: S7_REF, bevel: S8_REF, final: S10_REF };
