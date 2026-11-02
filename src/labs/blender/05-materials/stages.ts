/**
 * Lab 05 stages (materials and nodes): data and checks. Checks read the material
 * node trees through the app contract (the tree is the state; nothing is read from
 * the image). All texts live in ca.json under "lab05".
 */
import './texts';
import { type Vec3, vec3 } from '../../../apps/blender/math/vec3';
import { meshFromFaces } from '../../../apps/blender/mesh/mesh-data';
import { mesh, sceneWith } from '../../../apps/blender/scene/factory';
import { type Material, type MeshObject, type SceneObject, type SceneState, meshOf } from '../../../apps/blender/scene/scene';
import type { ColorRampData } from '../../../apps/blender/shading/node-types';
import {
  type NodeTree,
  type ShaderNode,
  addNode,
  connect,
  defaultMaterialTree,
  inputValue,
  linkInto,
  linkIsValid,
  nodeById,
  outputNode,
  setProp,
  setValue,
} from '../../../apps/blender/shading/tree';
import type { Feedback, BlenderLabStages as LabStages, BlenderStageDefinition as StageDefinition } from '../../../apps/blender/stages/types';
import { gridBox } from '../stool';

// ---------------------------------------------------------------------------
// Helpers

type RGBA = readonly [number, number, number, number];

const fb = (key: string, tone: Feedback['tone'] = 'progress', params?: Feedback['params']): Feedback => ({
  key: `lab05.${key}`,
  tone,
  ...(params ? { params } : {}),
});
const fmt = (v: number, digits = 2) => v.toFixed(digits).replace('.', ',');

/** A UV Sphere with Shade Smooth, so reflections read well. */
function sphere(id: string, name: string, at: Vec3, slots: readonly (string | null)[] = []): MeshObject {
  const base = mesh(id, name, 'uvSphere', at);
  const m = meshOf(base);
  return { ...base, mesh: { ...m, smoothFaces: m.faces.map(() => true) }, ...(slots.length ? { materialSlots: slots } : {}) };
}

/** The scene with the default Camera and Light, the given objects and materials, one active object. */
function scene(objects: readonly SceneObject[], active: string, materials: readonly Material[] = []): SceneState {
  return { ...sceneWith(objects, { selected: [active], active }), materials };
}

/** A material with Blender's default tree and some Principled values changed. */
function material(id: string, name: string, values: Readonly<Record<string, number | RGBA>> = {}): Material {
  let tree = defaultMaterialTree();
  const p = tree.nodes.find((n) => n.type === 'ShaderNodeBsdfPrincipled')!;
  for (const [k, v] of Object.entries(values)) tree = setValue(tree, p.id, k, v);
  return { id, name, tree };
}

const objectById = (s: SceneState, id: string) => s.objects.find((o) => o.id === id);

/** The material the viewport draws on an object (its first slot). */
function drawnMaterial(s: SceneState, id: string): Material | null {
  const o = objectById(s, id);
  if (o?.type !== 'mesh') return null;
  const mid = o.materialSlots?.[0];
  return mid ? (s.materials?.find((m) => m.id === mid) ?? null) : null;
}

/** The node a valid link brings into an input, or null. */
function linkedFrom(t: NodeTree, n: ShaderNode, socket: string): ShaderNode | null {
  const l = linkInto(t, { node: n.id, socket });
  return l && linkIsValid(t, l) ? (nodeById(t, l.from.node) ?? null) : null;
}

/** The node in the Material Output's Surface. */
function surfaceNode(t: NodeTree): ShaderNode | null {
  const out = outputNode(t);
  return out ? linkedFrom(t, out, 'Surface') : null;
}

const principledOf = (t: NodeTree) => {
  const n = surfaceNode(t);
  return n?.type === 'ShaderNodeBsdfPrincipled' && !n.muted ? n : null;
};

/** Every node feeding an input, directly or further up (muted nodes count as links through). */
function upstream(t: NodeTree, n: ShaderNode, socket: string): ShaderNode[] {
  const found = new Map<string, ShaderNode>();
  const visit = (node: ShaderNode, sock: string | null) => {
    const links = t.links.filter((l) => l.to.node === node.id && (sock === null || l.to.socket === sock) && linkIsValid(t, l));
    for (const l of links) {
      const from = nodeById(t, l.from.node);
      if (!from || found.has(from.id)) continue;
      found.set(from.id, from);
      visit(from, null);
    }
  };
  visit(n, socket);
  return [...found.values()];
}

const num = (n: ShaderNode, socket: string) => Number(inputValue(n, socket) ?? 0);
const col = (n: ShaderNode, socket: string) => (inputValue(n, socket) as RGBA | undefined) ?? [0, 0, 0, 1];
const lum = (c: RGBA) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Hue (degrees), saturation and value of a linear colour. */
function hsv(c: RGBA): { h: number; s: number; v: number } {
  const [r, g, b] = c;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max > 0 ? d / max : 0, v: max };
}

/** Linear distance between two colours (RGB). */
const colorDistance = (a: RGBA, b: RGBA) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const MATERIAL_TAB = { propertiesTab: 'material', shading: 'MATERIAL' } as const;

// ---------------------------------------------------------------------------
// 1. First material: New, then change Base Color.

const s1: StageDefinition = {
  id: 'firstMaterial',
  titleKey: 'lab05.s1.title',
  instructionKey: 'lab05.s1.instruction',
  hintKeys: ['lab05.s1.hint1', 'lab05.s1.hint2'],
  successKey: 'lab05.s1.success',
  keys: ['lmb'],
  ...MATERIAL_TAB,
  scene: () => scene([sphere('sphere', 'Sphere', vec3(0, 0, 1))], 'sphere'),
  check(ctx) {
    const m = drawnMaterial(ctx.scene, 'sphere');
    if (!m) return { done: false, feedback: fb('s1.new') };
    const p = principledOf(m.tree);
    if (!p) return { done: false, feedback: fb('s1.principled', 'fix') };
    if (linkedFrom(m.tree, p, 'Base Color')) return { done: true };
    if (colorDistance(col(p, 'Base Color'), [0.8, 0.8, 0.8, 1]) < 0.15) return { done: false, feedback: fb('s1.color') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 2. Metal or plastic: match the two reference spheres.

const REF_GOLD = material('refGold', 'Referència or', { 'Base Color': [1, 0.71, 0.29, 1], Metallic: 1, Roughness: 0.2 });
const REF_PLASTIC = material('refPlastic', 'Referència plàstic', { 'Base Color': [0.6, 0.02, 0.02, 1], Metallic: 0, Roughness: 0.4 });

/** The reference itself, or a copy of it (New on a slot that holds it makes «Referència or.001»). */
const isReference = (m: Material) => m.id === REF_GOLD.id || m.id === REF_PLASTIC.id || m.name.startsWith('Referència');

function goldIssue(m: Material | null): string | null {
  if (!m) return 'new';
  if (isReference(m)) return 'ownMaterial';
  const p = principledOf(m.tree);
  if (!p) return 'principled';
  const c = col(p, 'Base Color');
  if (num(p, 'Metallic') < 0.9) return 'goldMetallic';
  if (!(c[0] >= 0.5 && c[0] > c[1] && c[1] > c[2] && c[2] < 0.6 * c[0])) return 'goldColor';
  if (num(p, 'Roughness') > 0.35) return 'goldRoughness';
  return null;
}

function plasticIssue(m: Material | null): string | null {
  if (!m) return 'new';
  if (isReference(m)) return 'ownMaterial';
  const p = principledOf(m.tree);
  if (!p) return 'principled';
  const c = col(p, 'Base Color');
  if (num(p, 'Metallic') > 0.1) return 'plasticMetallic';
  if (!(c[0] >= 0.2 && c[0] >= 2 * c[1] && c[0] >= 2 * c[2])) return 'plasticColor';
  const r = num(p, 'Roughness');
  if (r < 0.25 || r > 0.6) return 'plasticRoughness';
  return null;
}

const s2: StageDefinition = {
  id: 'metalPlastic',
  titleKey: 'lab05.s2.title',
  instructionKey: 'lab05.s2.instruction',
  hintKeys: ['lab05.s2.hint1', 'lab05.s2.hint2'],
  successKey: 'lab05.s2.success',
  keys: ['lmb'],
  ...MATERIAL_TAB,
  scene: () =>
    scene(
      [
        sphere('gold', 'Or', vec3(-1.5, 0, 1)),
        sphere('plastic', 'Plàstic', vec3(1.5, 0, 1)),
        sphere('refGoldObj', 'Referència or', vec3(-1.5, 3, 1), ['refGold']),
        sphere('refPlasticObj', 'Referència plàstic', vec3(1.5, 3, 1), ['refPlastic']),
      ],
      'gold',
      [REF_GOLD, REF_PLASTIC],
    ),
  check(ctx) {
    const g = goldIssue(drawnMaterial(ctx.scene, 'gold'));
    if (g) return { done: false, feedback: fb(`s2.${g}`, g === 'ownMaterial' ? 'fix' : 'progress', { name: 'Or' }) };
    const p = plasticIssue(drawnMaterial(ctx.scene, 'plastic'));
    if (p) return { done: false, feedback: fb(`s2.${p}`, p === 'ownMaterial' ? 'fix' : 'progress', { name: 'Plàstic' }) };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 3. Roughness: match the reflection of the reference.

const S3_TARGET = 0.25;
const S3_REF = material('ref', 'Referència', { 'Base Color': [0.9, 0.9, 0.9, 1], Metallic: 1, Roughness: S3_TARGET });
const S3_MINE = material('mine', 'Metall', { 'Base Color': [0.9, 0.9, 0.9, 1], Metallic: 1, Roughness: 0.8 });

const s3: StageDefinition = {
  id: 'roughness',
  titleKey: 'lab05.s3.title',
  instructionKey: 'lab05.s3.instruction',
  hintKeys: ['lab05.s3.hint1', 'lab05.s3.hint2'],
  successKey: 'lab05.s3.success',
  keys: ['lmb'],
  ...MATERIAL_TAB,
  scene: () =>
    scene([sphere('mine', 'Metall', vec3(-1.5, 0, 1), ['mine']), sphere('refObj', 'Referència', vec3(1.5, 0, 1), ['ref'])], 'mine', [S3_MINE, S3_REF]),
  check(ctx) {
    const m = drawnMaterial(ctx.scene, 'mine');
    if (!m || m.id === S3_REF.id) return { done: false, feedback: fb('s3.ownMaterial', 'fix') };
    const p = principledOf(m.tree);
    if (!p) return { done: false, feedback: fb('s3.principled', 'fix') };
    const r = num(p, 'Roughness');
    if (Math.abs(r - S3_TARGET) <= 0.07) return { done: true };
    return { done: false, feedback: fb(r > S3_TARGET ? 's3.lower' : 's3.higher') };
  },
};

// ---------------------------------------------------------------------------
// 4. Glass: Transmission and IOR.

const s4: StageDefinition = {
  id: 'glass',
  titleKey: 'lab05.s4.title',
  instructionKey: 'lab05.s4.instruction',
  hintKeys: ['lab05.s4.hint1', 'lab05.s4.hint2'],
  successKey: 'lab05.s4.success',
  keys: ['lmb'],
  ...MATERIAL_TAB,
  scene: () => scene([sphere('glass', 'Vidre', vec3(0, 0, 1), ['glassMat']), mesh('box', 'Cube', 'cube', vec3(-1.8, 1.8, 1))], 'glass', [material('glassMat', 'Vidre')]),
  check(ctx) {
    const m = drawnMaterial(ctx.scene, 'glass');
    const p = m && principledOf(m.tree);
    if (!p) return { done: false, feedback: fb('s4.principled', 'fix') };
    if (num(p, 'Transmission Weight') < 0.9) return { done: false, feedback: fb('s4.transmission') };
    if (num(p, 'Metallic') > 0.1) return { done: false, feedback: fb('s4.metallic', 'fix') };
    if (num(p, 'Roughness') > 0.1) return { done: false, feedback: fb('s4.roughness') };
    const ior = num(p, 'IOR');
    if (ior < 1.4 || ior > 1.6) return { done: false, feedback: fb('s4.ior', 'progress', { ior: fmt(ior) }) };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 5. Emission: make the bulb glow.

/** How much light a material emits (luminance of colour × strength). */
function emitted(m: Material | null): number {
  const n = m && surfaceNode(m.tree);
  if (!n || n.muted) return 0;
  if (n.type === 'ShaderNodeEmission') return lum(col(n, 'Color')) * num(n, 'Strength');
  if (n.type === 'ShaderNodeBsdfPrincipled') return lum(col(n, 'Emission Color')) * num(n, 'Emission Strength');
  return 0;
}

const s5: StageDefinition = {
  id: 'emission',
  titleKey: 'lab05.s5.title',
  instructionKey: 'lab05.s5.instruction',
  hintKeys: ['lab05.s5.hint1', 'lab05.s5.hint2'],
  successKey: 'lab05.s5.success',
  keys: ['lmb'],
  ...MATERIAL_TAB,
  scene: () =>
    scene(
      [
        { ...sphere('bulb', 'Bombeta', vec3(0, 0, 2.2), ['bulbMat']), scale: vec3(0.6, 0.6, 0.6) },
        { ...mesh('base', 'Base', 'cylinder', vec3(0, 0, 0.8), vec3(0, 0, 0), vec3(0.5, 0.5, 0.8)), materialSlots: ['baseMat'] },
      ],
      'bulb',
      [material('bulbMat', 'Bombeta'), material('baseMat', 'Peu', { 'Base Color': [0.05, 0.05, 0.05, 1], Roughness: 0.3 })],
    ),
  check(ctx) {
    const e = emitted(drawnMaterial(ctx.scene, 'bulb'));
    if (e >= 1) return { done: true };
    if (emitted(drawnMaterial(ctx.scene, 'base')) >= 1) return { done: false, feedback: fb('s5.wrongObject', 'fix') };
    return { done: false, feedback: fb(e > 0 ? 's5.stronger' : 's5.emit', 'progress', { e: fmt(e) }) };
  },
};

// ---------------------------------------------------------------------------
// 6. First graph: Noise Texture > Color Ramp > Base Color.

const s6Material = () => material('cubeMat', 'Material');

/** Issues of the Noise → Color Ramp → Base Color chain, in the order the student builds it. */
function chainIssue(t: NodeTree): string | null {
  const p = principledOf(t);
  if (!p) return 'principled';
  const nodes = t.nodes.filter((n) => !n.muted);
  const noise = nodes.find((n) => n.type === 'ShaderNodeTexNoise');
  if (!noise) return 'addNoise';
  const ramp = nodes.find((n) => n.type === 'ShaderNodeValToRGB');
  if (!ramp) return 'addRamp';
  if (linkedFrom(t, ramp, 'Fac')?.type !== 'ShaderNodeTexNoise') return 'noiseToRamp';
  if (linkedFrom(t, p, 'Base Color')?.type !== 'ShaderNodeValToRGB') return 'rampToBase';
  return null;
}

const s6: StageDefinition = {
  id: 'firstGraph',
  titleKey: 'lab05.s6.title',
  instructionKey: 'lab05.s6.instruction',
  hintKeys: ['lab05.s6.hint1', 'lab05.s6.hint2'],
  successKey: 'lab05.s6.success',
  keys: ['shiftA', 'lmb', 'g'],
  ...MATERIAL_TAB,
  scene: () => scene([{ ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 1)), materialSlots: ['cubeMat'] }], 'cube', [s6Material()]),
  check(ctx) {
    const m = drawnMaterial(ctx.scene, 'cube');
    const issue = m ? chainIssue(m.tree) : 'principled';
    return issue ? { done: false, feedback: fb(`s6.${issue}`, issue === 'principled' ? 'fix' : 'progress') } : { done: true };
  },
};

// ---------------------------------------------------------------------------
// 7. Scale and coordinates: Texture Coordinate > Mapping > the noise's Vector.

/** The stage 6 solution: Noise (Fac) > Color Ramp (brown to cream) > Base Color. */
export function spottedTree(): NodeTree {
  let t = defaultMaterialTree();
  const p = t.nodes.find((n) => n.type === 'ShaderNodeBsdfPrincipled')!;
  const noise = addNode(t, 'ShaderNodeTexNoise', { x: -700, y: 200 });
  t = noise.tree;
  const ramp = addNode(t, 'ShaderNodeValToRGB', { x: -480, y: 200 });
  t = ramp.tree;
  const stops: ColorRampData = {
    interpolation: 'LINEAR',
    colorMode: 'RGB',
    stops: [
      { position: 0.4, color: [0.12, 0.05, 0.02, 1] },
      { position: 0.6, color: [0.8, 0.7, 0.5, 1] },
    ],
  };
  t = setProp(t, ramp.id, 'color_ramp', stops);
  t = connect(t, { node: noise.id, socket: 'Fac' }, { node: ramp.id, socket: 'Fac' });
  return connect(t, { node: ramp.id, socket: 'Color' }, { node: p.id, socket: 'Base Color' });
}

const s7: StageDefinition = {
  id: 'scale',
  titleKey: 'lab05.s7.title',
  instructionKey: 'lab05.s7.instruction',
  hintKeys: ['lab05.s7.hint1', 'lab05.s7.hint2'],
  successKey: 'lab05.s7.success',
  keys: ['shiftA', 'lmb'],
  ...MATERIAL_TAB,
  scene: () =>
    scene([{ ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 1)), materialSlots: ['cubeMat'] }], 'cube', [{ id: 'cubeMat', name: 'Material', tree: spottedTree() }]),
  check(ctx) {
    const t = drawnMaterial(ctx.scene, 'cube')?.tree;
    const noise = t?.nodes.find((n) => n.type === 'ShaderNodeTexNoise' && !n.muted);
    if (!t || !noise) return { done: false, feedback: fb('s7.noise', 'fix') };
    const mapping = linkedFrom(t, noise, 'Vector');
    if (mapping?.type !== 'ShaderNodeMapping') return { done: false, feedback: fb('s7.mapping') };
    const coord = linkedFrom(t, mapping, 'Vector');
    if (coord?.type !== 'ShaderNodeTexCoord') return { done: false, feedback: fb('s7.coordinates') };
    const sc = (inputValue(mapping, 'Scale') as readonly number[] | undefined) ?? [1, 1, 1];
    if (sc.every((v) => Math.abs(v - 1) < 0.1)) return { done: false, feedback: fb('s7.scale') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 8. Bump: the noise as height, into the Principled BSDF's Normal.

const s8: StageDefinition = {
  id: 'bump',
  titleKey: 'lab05.s8.title',
  instructionKey: 'lab05.s8.instruction',
  hintKeys: ['lab05.s8.hint1', 'lab05.s8.hint2'],
  successKey: 'lab05.s8.success',
  keys: ['shiftA', 'lmb'],
  ...MATERIAL_TAB,
  scene: () =>
    scene([{ ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 1)), materialSlots: ['cubeMat'] }], 'cube', [{ id: 'cubeMat', name: 'Material', tree: spottedTree() }]),
  check(ctx) {
    const t = drawnMaterial(ctx.scene, 'cube')?.tree;
    const p = t && principledOf(t);
    if (!t || !p) return { done: false, feedback: fb('s8.principled', 'fix') };
    const bump = linkedFrom(t, p, 'Normal');
    if (bump?.type !== 'ShaderNodeBump' || bump.muted) return { done: false, feedback: fb('s8.bumpToNormal') };
    if (!upstream(t, bump, 'Height').some((n) => n.type === 'ShaderNodeTexNoise')) return { done: false, feedback: fb('s8.height') };
    if (num(bump, 'Strength') <= 0) return { done: false, feedback: fb('s8.strength') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 9. Mix: rust over metal, colour and roughness from one noise mask.

const S9_METAL = material('metalMat', 'Metall', { 'Base Color': [0.7, 0.7, 0.72, 1], Metallic: 1, Roughness: 0.25 });

const s9: StageDefinition = {
  id: 'mix',
  titleKey: 'lab05.s9.title',
  instructionKey: 'lab05.s9.instruction',
  hintKeys: ['lab05.s9.hint1', 'lab05.s9.hint2', 'lab05.s9.hint3'],
  successKey: 'lab05.s9.success',
  keys: ['shiftA', 'lmb', 'shiftD'],
  ...MATERIAL_TAB,
  scene: () => scene([{ ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 1)), materialSlots: ['metalMat'] }], 'cube', [S9_METAL]),
  check(ctx) {
    const t = drawnMaterial(ctx.scene, 'cube')?.tree;
    const p = t && principledOf(t);
    if (!t || !p) return { done: false, feedback: fb('s9.principled', 'fix') };
    const mix = linkedFrom(t, p, 'Base Color');
    if (mix?.type !== 'ShaderNodeMix' || mix.props.data_type !== 'RGBA' || mix.muted) return { done: false, feedback: fb('s9.mixColor') };
    const mask = upstream(t, mix, 'Factor_Float').filter((n) => n.type === 'ShaderNodeTexNoise');
    if (!mask.length) return { done: false, feedback: fb('s9.mask') };
    const roughnessNoise = upstream(t, p, 'Roughness').filter((n) => n.type === 'ShaderNodeTexNoise');
    if (!roughnessNoise.length) return { done: false, feedback: fb('s9.roughness') };
    if (!roughnessNoise.some((n) => mask.some((m) => m.id === n.id))) return { done: false, feedback: fb('s9.sameMask', 'fix') };
    return { done: true };
  },
};

// ---------------------------------------------------------------------------
// 10. Final challenge: the stool's materials (procedural wood for the seat, metal for the legs).

/** The stool in two objects so seat and legs can have their own material. */
const SEAT = gridBox([-1, 1], [-1, 1], [1.6, 1.85]);
function legs() {
  const parts = [
    [-0.85, -0.85],
    [0.65, -0.85],
    [-0.85, 0.65],
    [0.65, 0.65],
  ].map(([x, y]) => gridBox([x!, x! + 0.2], [y!, y! + 0.2], [0, 1.6]));
  const verts = parts.flatMap((p) => p.verts);
  let offset = 0;
  const faces: number[][] = [];
  for (const p of parts) {
    for (const f of p.faces) faces.push(f.map((i) => i + offset));
    offset += p.verts.length;
  }
  return meshFromFaces(verts, faces);
}

/** Every colour value a node tree uses upstream of an input (ramp stops, Mix A/B, RGB nodes...). */
function colorsUpstream(t: NodeTree, n: ShaderNode, socket: string): RGBA[] {
  const out: RGBA[] = [];
  for (const u of upstream(t, n, socket)) {
    const ramp = u.props.color_ramp as ColorRampData | undefined;
    if (ramp) out.push(...ramp.stops.map((s) => s.color));
    if (u.type === 'ShaderNodeRGB') out.push(u.props.color as RGBA);
    if (u.type === 'ShaderNodeMix' && u.props.data_type === 'RGBA') {
      if (!linkedFrom(t, u, 'A_Color')) out.push(col(u, 'A_Color'));
      if (!linkedFrom(t, u, 'B_Color')) out.push(col(u, 'B_Color'));
    }
  }
  return out;
}

const isBrown = (c: RGBA) => {
  const { h, s, v } = hsv(c);
  return h >= 10 && h <= 50 && s >= 0.3 && v <= 0.9;
};

const s10: StageDefinition = {
  id: 'final',
  titleKey: 'lab05.s10.title',
  instructionKey: 'lab05.s10.instruction',
  hintKeys: [],
  successKey: 'lab05.s10.success',
  keys: [],
  hints: false,
  ...MATERIAL_TAB,
  scene: () =>
    scene(
      [
        { ...mesh('seat', 'Seient', 'cube', vec3(0, 0, 0)), mesh: SEAT },
        { ...mesh('legs', 'Potes', 'cube', vec3(0, 0, 0)), mesh: legs() },
      ],
      'seat',
    ),
  check(ctx) {
    const seat = drawnMaterial(ctx.scene, 'seat');
    const legMat = drawnMaterial(ctx.scene, 'legs');
    if (!seat || !legMat) return { done: false, feedback: fb('s10.materials') };
    if (seat.id === legMat.id) return { done: false, feedback: fb('s10.different', 'fix') };
    const p = principledOf(seat.tree);
    if (!p) return { done: false, feedback: fb('s10.principled', 'fix', { name: 'Seient' }) };
    const textures = upstream(seat.tree, p, 'Base Color').filter((n) => n.type === 'ShaderNodeTexWave' || n.type === 'ShaderNodeTexNoise');
    if (!textures.length) return { done: false, feedback: fb('s10.woodTexture') };
    if (!colorsUpstream(seat.tree, p, 'Base Color').some(isBrown)) return { done: false, feedback: fb('s10.woodColor') };
    const q = principledOf(legMat.tree);
    if (!q) return { done: false, feedback: fb('s10.principled', 'fix', { name: 'Potes' }) };
    if (num(q, 'Metallic') < 0.9) return { done: false, feedback: fb('s10.metal') };
    const r = num(q, 'Roughness');
    if (r < 0.15 || r > 0.6) return { done: false, feedback: fb('s10.metalRoughness', 'progress', { r: fmt(r) }) };
    return { done: true };
  },
};

/** The default cube with its material "Material", as in Blender's startup file. */
export function materialScene(): SceneState {
  const cube = { ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 0)), materialSlots: ['material'] };
  return {
    ...sceneWith([cube], { selected: ['cube'], active: 'cube' }),
    materials: [{ id: 'material', name: 'Material', tree: defaultMaterialTree() }],
  };
}

export const LAB05_STAGES: LabStages = {
  labId: '05-materials',
  stages: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10],
  freeScene: materialScene,
  // The Shading workspace opens in Material Preview.
  freeShading: 'MATERIAL',
};

/** For tests. */
export const LAB05_TEST = { spottedTree, REF_GOLD, REF_PLASTIC, S3_TARGET, chainIssue, emitted };
