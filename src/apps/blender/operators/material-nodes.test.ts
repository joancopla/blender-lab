import { describe, expect, it } from 'vitest';
import { SceneStore } from '../scene/store';
import type { SceneState } from '../scene/scene';
import { defaultMaterialTree, linkInto, nodeById } from '../shading/tree';
import { addNodeOp, deleteNodesOp, linkOp, materialById, moveNodesOp, muteOp, setValueOp } from './material-nodes';

const scene = (): SceneState => ({
  objects: [],
  selectedIds: [],
  activeId: null,
  activeCameraId: null,
  render: { resolutionX: 1920, resolutionY: 1080 },
  materials: [{ id: 'm1', name: 'Material', tree: defaultMaterialTree() }],
});
const tree = (s: SceneState) => materialById(s, 'm1')!.tree;

describe('node editing through the history', () => {
  it('records Blender undo names and undoes', () => {
    const store = new SceneStore(scene());
    store.execute(addNodeOp('m1', 'ShaderNodeTexNoise', { x: -500, y: 0 }));
    const noise = tree(store.state).nodes.find((n) => n.type === 'ShaderNodeTexNoise')!;
    const bsdf = tree(store.state).nodes[0]!;
    store.execute(linkOp('m1', { node: noise.id, socket: 'Color' }, { node: bsdf.id, socket: 'Base Color' }));
    store.execute(setValueOp('m1', noise.id, 'Scale', 12));
    store.execute(muteOp('m1', [noise.id]));
    expect(store.log.map((e) => e.name)).toEqual(['Add Node', 'Link Nodes', 'Scale', 'Toggle Node Mute']);
    expect(nodeById(tree(store.state), noise.id)!.muted).toBe(true);
    store.undo();
    store.undo();
    expect(nodeById(tree(store.state), noise.id)!.values.Scale).toBeUndefined();
    expect(linkInto(tree(store.state), { node: bsdf.id, socket: 'Base Color' })?.from.node).toBe(noise.id);
  });

  it('records no step when nothing changes', () => {
    const store = new SceneStore(scene());
    expect(store.execute(moveNodesOp('m1', [], 0, 0))).toBe(false);
    expect(store.execute(deleteNodesOp('m1', []))).toBe(false);
    expect(store.execute(addNodeOp('missing', 'ShaderNodeValue', { x: 0, y: 0 }))).toBe(false);
  });
});
