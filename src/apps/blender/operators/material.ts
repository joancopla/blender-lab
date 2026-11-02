/**
 * Material slots and material data-blocks (Properties > Material), as undoable
 * operators with Blender's names (ot->name in source/blender/editors/render/
 * render_shading.cc, Blender 5.2.1).
 */
import { type Material, type MeshObject, type SceneState, activeSlotIndex } from '../scene/scene';
import type { OperatorCall } from '../scene/store';
import { defaultMaterialTree } from '../shading/tree';

const meshById = (s: SceneState, id: string): MeshObject | undefined => {
  const o = s.objects.find((x) => x.id === id);
  return o?.type === 'mesh' ? o : undefined;
};

const withObject = (s: SceneState, o: MeshObject): SceneState => ({ ...s, objects: s.objects.map((x) => (x.id === o.id ? o : x)) });

/** Blender's unique data-block names: "Material", "Material.001"... */
export function uniqueMaterialName(s: SceneState, base: string, except?: string): string {
  const taken = new Set((s.materials ?? []).filter((m) => m.id !== except).map((m) => m.name));
  if (!taken.has(base)) return base;
  // A copy of "Material.001" is "Material.002", not "Material.001.001".
  const stem = base.replace(/\.\d{3}$/, '');
  for (let i = 1; ; i++) {
    const name = `${stem}.${String(i).padStart(3, '0')}`;
    if (!taken.has(name)) return name;
  }
}

/** A new material id, never reused. */
function newMaterialId(s: SceneState): string {
  const ids = new Set((s.materials ?? []).map((m) => m.id));
  for (let i = 1; ; i++) if (!ids.has(`mat${i}`)) return `mat${i}`;
}

/** The material in the active slot of an object (null: empty slot or none). */
export function activeSlotMaterial(s: SceneState, o: MeshObject): Material | null {
  const id = o.materialSlots?.[activeSlotIndex(o)];
  return id ? (s.materials?.find((m) => m.id === id) ?? null) : null;
}

/** Puts a material in the active slot, adding a slot when the object has none. */
function setActiveSlot(o: MeshObject, materialId: string | null): MeshObject {
  const slots = o.materialSlots?.length ? [...o.materialSlots] : [null];
  slots[activeSlotIndex(o)] = materialId;
  return { ...o, materialSlots: slots };
}

/**
 * New (MATERIAL_OT_new): with a material in the active slot, a copy of it
 * ("Material.001"); otherwise a new "Material" with Blender's default tree.
 */
export const NewMaterialOp = (objectId: string): OperatorCall => ({
  name: 'New Material',
  apply(s) {
    const o = meshById(s, objectId);
    if (!o) return s;
    const current = activeSlotMaterial(s, o);
    const id = newMaterialId(s);
    const material: Material = current
      ? { id, name: uniqueMaterialName(s, current.name), tree: current.tree }
      : { id, name: uniqueMaterialName(s, 'Material'), tree: defaultMaterialTree() };
    return withObject({ ...s, materials: [...(s.materials ?? []), material] }, setActiveSlot(o, id));
  },
});

/** Picking a material in the browse menu (setting active_material). FIDELITY? Undo name. */
export const AssignMaterialOp = (objectId: string, materialId: string): OperatorCall => ({
  name: 'Material',
  apply(s) {
    const o = meshById(s, objectId);
    if (!o || !s.materials?.some((m) => m.id === materialId)) return s;
    if (o.materialSlots?.[activeSlotIndex(o)] === materialId) return s;
    return withObject(s, setActiveSlot(o, materialId));
  },
});

/** × next to the name: empties the slot (the material stays in the file). FIDELITY? Undo name. */
export const UnlinkMaterialOp = (objectId: string): OperatorCall => ({
  name: 'Unlink',
  apply(s) {
    const o = meshById(s, objectId);
    if (!o?.materialSlots?.[activeSlotIndex(o)]) return s;
    return withObject(s, setActiveSlot(o, null));
  },
});

/** Typing a new name (Blender makes it unique). */
export const RenameMaterialOp = (materialId: string, name: string): OperatorCall => ({
  name: 'Name',
  apply(s) {
    const m = s.materials?.find((x) => x.id === materialId);
    const wanted = name.trim();
    if (!m || !wanted || wanted === m.name) return s;
    const unique = uniqueMaterialName(s, wanted, m.id);
    return { ...s, materials: s.materials!.map((x) => (x.id === m.id ? { ...x, name: unique } : x)) };
  },
});

/** + (OBJECT_OT_material_slot_add): an empty slot after the last, made active. */
export const AddMaterialSlotOp = (objectId: string): OperatorCall => ({
  name: 'Add Material Slot',
  apply(s) {
    const o = meshById(s, objectId);
    if (!o) return s;
    const slots = [...(o.materialSlots ?? []), null];
    return withObject(s, { ...o, materialSlots: slots, activeMaterialIndex: slots.length - 1 });
  },
});

/** − (OBJECT_OT_material_slot_remove): removes the active slot. */
export const RemoveMaterialSlotOp = (objectId: string): OperatorCall => ({
  name: 'Remove Material Slot',
  apply(s) {
    const o = meshById(s, objectId);
    if (!o?.materialSlots?.length) return s;
    const i = activeSlotIndex(o);
    const slots = o.materialSlots.filter((_, k) => k !== i);
    return withObject(s, { ...o, materialSlots: slots, activeMaterialIndex: Math.max(0, i - 1) });
  },
});

/** Clicking a slot in the list. FIDELITY? Undo name (a property change: active_material_index). */
export const SetActiveSlotOp = (objectId: string, index: number): OperatorCall => ({
  name: 'Active Material Index',
  apply(s) {
    const o = meshById(s, objectId);
    if (!o || index < 0 || index >= (o.materialSlots?.length ?? 0) || activeSlotIndex(o) === index) return s;
    return withObject(s, { ...o, activeMaterialIndex: index });
  },
});
