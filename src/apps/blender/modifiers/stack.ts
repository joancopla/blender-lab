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
import { applyMirror } from './mirror';
import type { Modifier } from './types';

/** Where the result is for: the viewport (Realtime toggle) or a render. */
export type EvalPurpose = 'viewport' | 'render';

interface Stage {
  readonly input: MeshData;
  readonly modifier: Modifier;
  /** Everything else the result depends on, as a string. */
  readonly context: string;
  readonly output: MeshData;
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

function runModifier(input: MeshData, mod: Modifier, space: Mat4 | null): MeshData {
  evaluations++;
  if (mod.type === 'MIRROR') return applyMirror(input, mod, space);
  return applyArray(input, mod);
}

/**
 * The object's evaluated mesh: its base mesh through the enabled modifiers.
 * In Edit Mode only modifiers with "Edit Mode" on take part (FIDELITY? cage display is Phase 4).
 */
export function evaluatedMesh(o: MeshObject, scene: SceneState, purpose: EvalPurpose = 'viewport'): MeshData {
  const base = meshOf(o);
  const mods = o.modifiers ?? [];
  if (mods.length === 0) return base;
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
        : { input: mesh, modifier: mod, context, output: runModifier(mesh, mod, space) };
    stages.push(stage);
    mesh = stage.output;
  }
  cache.set(key, stages);
  return mesh;
}

/** Whether the object has any modifier (the evaluated mesh may differ from the base mesh). */
export const hasModifiers = (o: SceneObject): boolean => o.type === 'mesh' && (o.modifiers?.length ?? 0) > 0;
