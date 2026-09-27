/**
 * Modifier stack operators: add, remove, move and edit. All go through the
 * history, so Ctrl+Z always works. Modifiers are addressed by name, which is
 * unique within an object (as in Blender).
 */
import { type Modifier, type ModifierType, newModifier, uniqueModifierName } from '../modifiers/types';
import type { MeshObject, SceneState } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

/** Applies `fn` to one mesh object's stack; the same state if nothing changes. */
function withStack(
  s: SceneState,
  objectId: string,
  fn: (mods: readonly Modifier[], o: MeshObject) => readonly Modifier[],
): SceneState {
  let changed = false;
  const objects = s.objects.map((o) => {
    if (o.id !== objectId || o.type !== 'mesh') return o;
    const before = o.modifiers ?? [];
    const after = fn(before, o);
    if (after === before) return o;
    changed = true;
    return { ...o, modifiers: after };
  });
  return changed ? { ...s, objects } : s;
}

/** Adds a modifier at the end of the stack, with Blender's defaults and a unique name. */
export function addModifier(s: SceneState, objectId: string, type: ModifierType): SceneState {
  return withStack(s, objectId, (mods) => {
    const mod = newModifier(type);
    return [...mods, { ...mod, name: uniqueModifierName(mod.name, mods) }];
  });
}

export function removeModifier(s: SceneState, objectId: string, name: string): SceneState {
  return withStack(s, objectId, (mods) => {
    const next = mods.filter((m) => m.name !== name);
    return next.length === mods.length ? mods : next;
  });
}

/** Moves a modifier to a position in the stack (clamped), like Move to Index. */
export function moveModifier(s: SceneState, objectId: string, name: string, index: number): SceneState {
  return withStack(s, objectId, (mods) => {
    const from = mods.findIndex((m) => m.name === name);
    if (from < 0) return mods;
    const to = Math.max(0, Math.min(mods.length - 1, Math.round(index)));
    if (to === from) return mods;
    const next = [...mods];
    const [mod] = next.splice(from, 1);
    next.splice(to, 0, mod!);
    return next;
  });
}

/** Fields of one modifier type that can be edited (not `type`). */
export type ModifierPatch = Modifier extends infer M ? (M extends Modifier ? Partial<Omit<M, 'type'>> : never) : never;

/**
 * Changes fields of a modifier. A new name is made unique; values that do not
 * change anything leave the state as it was (no undo step).
 */
export function setModifier(s: SceneState, objectId: string, name: string, patch: ModifierPatch): SceneState {
  return withStack(s, objectId, (mods) => {
    const i = mods.findIndex((m) => m.name === name);
    if (i < 0) return mods;
    const mod = mods[i]!;
    const fixed: Record<string, unknown> = { ...patch };
    if (patch.name !== undefined) fixed.name = uniqueModifierName(patch.name, mods, mod);
    const current = mod as unknown as Record<string, unknown>;
    const same = Object.keys(fixed).every((k) => sameValue(current[k], fixed[k]));
    if (same) return mods;
    const next = [...mods];
    next[i] = { ...mod, ...fixed } as Modifier;
    return next;
  });
}

/** Equality for modifier field values (numbers, booleans, strings, null, small arrays, vectors). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

/* Undo History names. FIDELITY? Blender names property edits after the property's label. */

export const AddModifierOp = (objectId: string, type: ModifierType): OperatorCall => ({
  name: 'Add Modifier',
  apply: (s) => addModifier(s, objectId, type),
});

export const RemoveModifierOp = (objectId: string, name: string): OperatorCall => ({
  name: 'Remove Modifier',
  apply: (s) => removeModifier(s, objectId, name),
});

export const MoveModifierOp = (objectId: string, name: string, index: number): OperatorCall => ({
  name: 'Move to Index',
  apply: (s) => moveModifier(s, objectId, name, index),
});

/** `label`: the property's label in the panel (Count, Axis...), used as the undo name. */
export const SetModifierOp = (objectId: string, name: string, patch: ModifierPatch, label: string): OperatorCall => ({
  name: label,
  apply: (s) => setModifier(s, objectId, name, patch),
});
