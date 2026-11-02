import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { mesh, sceneWith } from '../scene/factory';
import type { MeshObject, SceneState } from '../scene/scene';
import { defaultMaterialTree } from '../shading/tree';
import {
  AddMaterialSlotOp,
  AssignMaterialOp,
  NewMaterialOp,
  RemoveMaterialSlotOp,
  RenameMaterialOp,
  SetActiveSlotOp,
  UnlinkMaterialOp,
  activeSlotMaterial,
  uniqueMaterialName,
} from './material';

const cubeOf = (s: SceneState) => s.objects.find((o) => o.id === 'cube') as MeshObject;

function scene(withMaterial: boolean): SceneState {
  const cube = { ...mesh('cube', 'Cube', 'cube', vec3(0, 0, 0)), ...(withMaterial ? { materialSlots: ['m'] } : {}) };
  return {
    ...sceneWith([cube, mesh('plane', 'Plane', 'plane', vec3(0, 0, 0))], { selected: ['cube'], active: 'cube' }),
    materials: withMaterial ? [{ id: 'm', name: 'Material', tree: defaultMaterialTree() }] : [],
  };
}

describe('material operators', () => {
  it('New on an object without slots adds a slot with "Material" and the default tree', () => {
    const s = NewMaterialOp('cube').apply(scene(false));
    const cube = cubeOf(s);
    expect(cube.materialSlots?.length).toBe(1);
    const m = activeSlotMaterial(s, cube)!;
    expect(m.name).toBe('Material');
    expect(m.tree.nodes.map((n) => n.type)).toEqual(['ShaderNodeBsdfPrincipled', 'ShaderNodeOutputMaterial']);
  });

  it('New with a material in the slot makes a copy, "Material.001"', () => {
    const s = NewMaterialOp('cube').apply(scene(true));
    const m = activeSlotMaterial(s, cubeOf(s))!;
    expect(m.name).toBe('Material.001');
    expect(m.id).not.toBe('m');
    expect(s.materials?.length).toBe(2);
  });

  it('unique names count on from the stem: a copy of "Material.001" is "Material.002"', () => {
    const s = NewMaterialOp('cube').apply(scene(true));
    expect(uniqueMaterialName(s, 'Material.001')).toBe('Material.002');
  });

  it('browse assigns an existing material to the active slot, sharing it', () => {
    let s = scene(true);
    s = { ...s, activeId: 'plane' };
    s = AssignMaterialOp('plane', 'm').apply(s);
    expect((s.objects.find((o) => o.id === 'plane') as MeshObject).materialSlots).toEqual(['m']);
    expect(cubeOf(s).materialSlots).toEqual(['m']);
  });

  it('unlink empties the slot but keeps the material in the file', () => {
    const s = UnlinkMaterialOp('cube').apply(scene(true));
    expect(cubeOf(s).materialSlots).toEqual([null]);
    expect(s.materials?.length).toBe(1);
  });

  it('rename keeps names unique', () => {
    let s = NewMaterialOp('cube').apply(scene(true));
    const copy = activeSlotMaterial(s, cubeOf(s))!;
    s = RenameMaterialOp(copy.id, 'Material').apply(s);
    expect(activeSlotMaterial(s, cubeOf(s))!.name).toBe('Material.001');
    s = RenameMaterialOp(copy.id, 'Neó cian').apply(s);
    expect(activeSlotMaterial(s, cubeOf(s))!.name).toBe('Neó cian');
  });

  it('slots: + adds an empty active slot, − removes the active one, a click selects', () => {
    let s = AddMaterialSlotOp('cube').apply(scene(true));
    expect(cubeOf(s).materialSlots).toEqual(['m', null]);
    expect(cubeOf(s).activeMaterialIndex).toBe(1);
    expect(activeSlotMaterial(s, cubeOf(s))).toBeNull();
    s = SetActiveSlotOp('cube', 0).apply(s);
    expect(activeSlotMaterial(s, cubeOf(s))?.id).toBe('m');
    s = RemoveMaterialSlotOp('cube').apply(s);
    expect(cubeOf(s).materialSlots).toEqual([null]);
  });

  it('operators that change nothing return the same state (no undo step)', () => {
    const s = scene(true);
    expect(AssignMaterialOp('cube', 'm').apply(s)).toBe(s);
    expect(SetActiveSlotOp('cube', 0).apply(s)).toBe(s);
    expect(RenameMaterialOp('m', 'Material').apply(s)).toBe(s);
  });
});
