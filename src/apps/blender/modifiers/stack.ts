/**
 * Modifier stack evaluation. The base mesh (what Edit Mode edits) goes through
 * every enabled modifier in order and gives the evaluated mesh, which is what
 * the viewport draws. The base mesh is never changed.
 *
 * Results are cached per object and per modifier: since mesh and modifier data
 * are immutable, a stage is reused while its input mesh, its modifier and its
 * context (e.g. the Mirror Object's placement) are the same objects/values.
 * Changing the last modifier does not recompute the ones before it.
 */
import { type Mat4, fromTRS, invert, multiply } from '../math/mat4';
import type { MeshData } from '../mesh/mesh-data';
import { type MeshObject, type SceneObject, type SceneState, findObject, meshOf, objectRotation } from '../scene/scene';
import { applyArray } from './array';
import { applyBevel } from './bevel';
import { applyMirror } from './mirror';
import { applySolidify } from './solidify';
import { applySubsurf } from './subsurf';
import { MAX_VIEWPORT_LEVELS, type Modifier } from './types';

/** Where the result is for: the viewport (Realtime toggle) or a render. */
export type EvalPurpose = 'viewport' | 'render';

/** Why a modifier could not do its work (shown by the UI as a lab warning). */
export type ModifierWarning = 'bevelUnsupported';

interface Stage {
  readonly input: MeshData;
  readonly modifier: Modifier;
  /** Everything else the result depends on, as a string. */
  readonly context: string;
  readonly output: MeshData;
  readonly warning: ModifierWarning | null;
}

const cache = new Map<string, Stage[]>();
let evaluations = 0;

/** Number of modifier evaluations run so far (for tests of the cache). */
export const modifierEvaluations = (): number => evaluations;

export const objectMatrix = (o: SceneObject): Mat4 => fromTRS(o.location, objectRotation(o), o.scale);

/** Whether a modifier takes part in the evaluation. */
export function isModifierEnabled(mod: Modifier, purpose: EvalPurpose, editMode: boolean): boolean {
  if (purpose === 'render') return mod.showRender;
  return mod.showViewport && (!editMode || mod.showInEditMode);
}

/** The Mirror Object's matrix in the object's local space, or null (none, missing or itself). */
function mirrorSpace(o: MeshObject, mod: Modifier, scene: SceneState): Mat4 | null {
  if (mod.type !== 'MIRROR' || mod.mirrorObjectId === null || mod.mirrorObjectId === o.id) return null;
  const target = findObject(scene, mod.mirrorObjectId);
  return target ? multiply(invert(objectMatrix(o)), objectMatrix(target)) : null;
}

interface StageResult {
  readonly output: MeshData;
  readonly warning: ModifierWarning | null;
}

function runModifier(input: MeshData, mod: Modifier, space: Mat4 | null, purpose: EvalPurpose): StageResult {
  evaluations++;
  switch (mod.type) {
    case 'MIRROR':
      return { output: applyMirror(input, mod, space), warning: null };
    case 'ARRAY':
      return { output: applyArray(input, mod), warning: null };
    case 'SUBSURF': {
      const levels = purpose === 'render' ? mod.renderLevels : Math.min(mod.levels, MAX_VIEWPORT_LEVELS);
      return { output: applySubsurf(input, mod, levels), warning: null };
    }
    case 'BEVEL': {
      const r = applyBevel(input, mod);
      return { output: r.mesh, warning: r.unsupported ? 'bevelUnsupported' : null };
    }
    case 'SOLIDIFY':
      return { output: applySolidify(input, mod), warning: null };
  }
}

/**
 * The object's evaluated mesh: its base mesh through the enabled modifiers.
 * In Edit Mode only modifiers with "Edit Mode" on take part (FIDELITY? cage display is Phase 4).
 */
export function evaluatedMesh(o: MeshObject, scene: SceneState, purpose: EvalPurpose = 'viewport'): MeshData {
  return evaluate(o, scene, purpose).mesh;
}

/** Warnings of the last evaluation, by modifier name. */
export function modifierWarnings(
  o: MeshObject,
  scene: SceneState,
  purpose: EvalPurpose = 'viewport',
): ReadonlyMap<string, ModifierWarning> {
  const out = new Map<string, ModifierWarning>();
  for (const st of evaluate(o, scene, purpose).stages) if (st.warning) out.set(st.modifier.name, st.warning);
  return out;
}

function evaluate(o: MeshObject, scene: SceneState, purpose: EvalPurpose): { mesh: MeshData; stages: Stage[] } {
  const base = meshOf(o);
  const mods = o.modifiers ?? [];
  if (mods.length === 0) return { mesh: base, stages: [] };
  const editMode = scene.editObjectIds?.includes(o.id) ?? false;
  const key = `${o.id}|${purpose}`;
  const previous = cache.get(key) ?? [];
  const stages: Stage[] = [];
  let mesh = base;
  for (const mod of mods) {
    if (!isModifierEnabled(mod, purpose, editMode)) continue;
    const space = mirrorSpace(o, mod, scene);
    const context = space ? space.join(',') : '';
    const old = previous[stages.length];
    const stage: Stage =
      old && old.input === mesh && old.modifier === mod && old.context === context
        ? old
        : { input: mesh, modifier: mod, context, ...runModifier(mesh, mod, space, purpose) };
    stages.push(stage);
    mesh = stage.output;
  }
  cache.set(key, stages);
  return { mesh, stages };
}

/** Whether the object has any modifier (the evaluated mesh may differ from the base mesh). */
export const hasModifiers = (o: SceneObject): boolean => o.type === 'mesh' && (o.modifiers?.length ?? 0) > 0;
