import { describe, expect, it } from 'vitest';
import { MIX, NODE_TYPES, NOISE_TEXTURE, nodeType } from './node-types';
import { LUMA, canLink, convertValue } from './sockets';
import {
  EMPTY_TREE,
  addNode,
  availableInputs,
  availableOutputs,
  connect,
  createsCycle,
  cutLinks,
  defaultMaterialTree,
  disconnect,
  dissolveNodes,
  duplicateNodes,
  inputValue,
  insertOnLink,
  linkInto,
  linkIsValid,
  moveNodes,
  nodeById,
  outputNode,
  passThrough,
  removeNodes,
  setProp,
  setValue,
  toggleCollapse,
  toggleHideUnused,
  toggleMute,
} from './tree';

describe('sockets', () => {
  it('a shader only goes into a shader; anything goes into a shader', () => {
    expect(canLink('shader', 'color')).toBe(false);
    expect(canLink('shader', 'shader')).toBe(true);
    expect(canLink('color', 'shader')).toBe(true);
    expect(canLink('float', 'vector')).toBe(true);
  });

  it('converts like Blender: colour to grey, vector to average, float to grey colour', () => {
    expect(convertValue([1, 0, 0, 1], 'color', 'float')).toBeCloseTo(LUMA[0]);
    expect(convertValue([1, 2, 3], 'vector', 'float')).toBe(2);
    expect(convertValue(0.25, 'float', 'color')).toEqual([0.25, 0.25, 0.25, 1]);
    expect(convertValue(0.5, 'float', 'vector')).toEqual([0.5, 0.5, 0.5]);
    expect(convertValue([1, 2, 3], 'vector', 'color')).toEqual([1, 2, 3, 1]);
  });
});

describe('node types', () => {
  it('socket identifiers are unique and defaults are in range', () => {
    for (const t of NODE_TYPES) {
      const ins = t.inputs.map((s) => s.id);
      expect(new Set(ins).size, t.id).toBe(ins.length);
      const outs = t.outputs.map((s) => s.id);
      expect(new Set(outs).size, t.id).toBe(outs.length);
      for (const s of t.inputs) {
        if (typeof s.default === 'number' && s.min !== undefined) expect(s.default, `${t.id} ${s.id}`).toBeGreaterThanOrEqual(s.min);
        if (typeof s.default === 'number' && s.max !== undefined) expect(s.default, `${t.id} ${s.id}`).toBeLessThanOrEqual(s.max);
      }
      for (const p of t.props) if (p.options && typeof p.default === 'string') expect(p.options, `${t.id} ${p.id}`).toContain(p.default);
    }
  });

  it('keeps Blender 5.2 names and defaults', () => {
    expect(nodeType('ShaderNodeRGB').label).toBe('Color');
    const p = nodeType('ShaderNodeBsdfPrincipled');
    expect(p.inputs.find((s) => s.id === 'IOR')?.default).toBe(1.5);
    expect(p.inputs.find((s) => s.id === 'Coat Roughness')?.default).toBe(0.03);
    expect(p.inputs.find((s) => s.id === 'Base Color')?.default).toEqual([0.8, 0.8, 0.8, 1]);
    expect(MIX.inputs.find((s) => s.id === 'Factor_Float')?.default).toBe(1);
    expect(nodeType('ShaderNodeMixShader').inputs.map((s) => s.id)).toEqual(['Fac', 'Shader', 'Shader_001']);
  });
});

describe('node tree', () => {
  it('a new material is a Principled BSDF into a Material Output', () => {
    const t = defaultMaterialTree();
    expect(t.nodes.map((n) => [n.name, n.location])).toEqual([
      ['Principled BSDF', { x: -200, y: 100 }],
      ['Material Output', { x: 200, y: 100 }],
    ]);
    const out = outputNode(t)!;
    expect(linkInto(t, { node: out.id, socket: 'Surface' })?.from.socket).toBe('BSDF');
  });

  it('names nodes like Blender', () => {
    let t = addNode(EMPTY_TREE, NOISE_TEXTURE.id, { x: 0, y: 0 }).tree;
    t = addNode(t, NOISE_TEXTURE.id, { x: 0, y: 0 }).tree;
    t = addNode(t, NOISE_TEXTURE.id, { x: 0, y: 0 }).tree;
    expect(t.nodes.map((n) => n.name)).toEqual(['Noise Texture', 'Noise Texture.001', 'Noise Texture.002']);
  });

  it('shows the sockets of the chosen options', () => {
    const mix = addNode(EMPTY_TREE, MIX.id, { x: 0, y: 0 }, { data_type: 'RGBA' });
    const n = nodeById(mix.tree, mix.id)!;
    expect(availableInputs(n).map((s) => s.id)).toEqual(['Factor_Float', 'A_Color', 'B_Color']);
    expect(availableOutputs(n).map((s) => s.id)).toEqual(['Result_Color']);
    const noise = addNode(EMPTY_TREE, NOISE_TEXTURE.id, { x: 0, y: 0 });
    const t4 = setProp(noise.tree, noise.id, 'noise_dimensions', '4D');
    expect(availableInputs(nodeById(t4, noise.id)!).map((s) => s.id)).toContain('W');
    expect(availableInputs(nodeById(noise.tree, noise.id)!).map((s) => s.id)).not.toContain('W');
  });

  it('an input takes one link; invalid links are kept but flagged', () => {
    const base = defaultMaterialTree();
    const [bsdf, outNode] = base.nodes;
    const e = addNode(base, 'ShaderNodeEmission', { x: 0, y: 0 });
    let t = connect(e.tree, { node: e.id, socket: 'Emission' }, { node: outNode!.id, socket: 'Surface' });
    expect(t.links.filter((l) => l.to.socket === 'Surface')).toHaveLength(1);
    expect(linkInto(t, { node: outNode!.id, socket: 'Surface' })?.from.node).toBe(e.id);
    // A shader into a colour input is drawn red.
    t = connect(t, { node: e.id, socket: 'Emission' }, { node: bsdf!.id, socket: 'Base Color' });
    const red = linkInto(t, { node: bsdf!.id, socket: 'Base Color' })!;
    expect(linkIsValid(t, red)).toBe(false);
    expect(linkIsValid(t, disconnect(t, red.id).links[0]!)).toBe(true);
  });

  it('detects loops', () => {
    let t = addNode(EMPTY_TREE, MIX.id, { x: 0, y: 0 }).tree;
    t = addNode(t, MIX.id, { x: 0, y: 0 }).tree;
    t = connect(t, { node: 'n1', socket: 'Result_Float' }, { node: 'n2', socket: 'A_Float' });
    expect(createsCycle(t, 'n2', 'n1')).toBe(true);
    t = connect(t, { node: 'n2', socket: 'Result_Float' }, { node: 'n1', socket: 'A_Float' });
    expect(t.links.filter((l) => !linkIsValid(t, l))).toHaveLength(2);
    expect(connect(t, { node: 'n1', socket: 'Result_Float' }, { node: 'n1', socket: 'B_Float' })).toBe(t);
  });

  it('Ctrl+X reconnects through the node; X does not', () => {
    // Noise → Mix (A) → Principled Base Color
    let t = defaultMaterialTree();
    const bsdf = t.nodes[0]!.id;
    const noise = addNode(t, NOISE_TEXTURE.id, { x: -600, y: 0 });
    const mix = addNode(noise.tree, MIX.id, { x: -400, y: 0 }, { data_type: 'RGBA' });
    t = connect(mix.tree, { node: noise.id, socket: 'Color' }, { node: mix.id, socket: 'A_Color' });
    t = connect(t, { node: mix.id, socket: 'Result_Color' }, { node: bsdf, socket: 'Base Color' });
    expect(passThrough(nodeById(t, mix.id)!)).toEqual({ Result_Color: 'A_Color' });
    const dissolved = dissolveNodes(t, [mix.id]);
    expect(linkInto(dissolved, { node: bsdf, socket: 'Base Color' })?.from).toEqual({ node: noise.id, socket: 'Color' });
    expect(linkInto(removeNodes(t, [mix.id]), { node: bsdf, socket: 'Base Color' })).toBeUndefined();
  });

  it('dropping a node on a link inserts it', () => {
    let t = defaultMaterialTree();
    const [bsdf] = t.nodes;
    const noise = addNode(t, NOISE_TEXTURE.id, { x: -600, y: 0 });
    t = connect(noise.tree, { node: noise.id, socket: 'Fac' }, { node: bsdf!.id, socket: 'Roughness' });
    const ramp = addNode(t, 'ShaderNodeValToRGB', { x: -400, y: 0 });
    const linkId = linkInto(ramp.tree, { node: bsdf!.id, socket: 'Roughness' })!.id;
    t = insertOnLink(ramp.tree, ramp.id, linkId);
    expect(linkInto(t, { node: ramp.id, socket: 'Fac' })?.from.node).toBe(noise.id);
    // The main output is the colour one (colour ranks above float), converted to grey.
    expect(linkInto(t, { node: bsdf!.id, socket: 'Roughness' })?.from).toEqual({ node: ramp.id, socket: 'Color' });
  });

  it('Shift+D copies nodes and the links between them only', () => {
    let t = defaultMaterialTree();
    const [bsdf, out] = t.nodes;
    const tc = addNode(t, 'ShaderNodeTexCoord', { x: -800, y: 0 });
    const noise = addNode(tc.tree, NOISE_TEXTURE.id, { x: -600, y: 0 });
    t = connect(noise.tree, { node: tc.id, socket: 'Object' }, { node: noise.id, socket: 'Vector' });
    t = connect(t, { node: noise.id, socket: 'Fac' }, { node: bsdf!.id, socket: 'Roughness' });
    const dup = duplicateNodes(t, [noise.id, bsdf!.id], { x: 0, y: -300 });
    expect(dup.ids).toHaveLength(2);
    const [noise2, bsdf2] = dup.ids;
    expect(linkInto(dup.tree, { node: bsdf2!, socket: 'Roughness' })?.from.node).toBe(noise2);
    expect(linkInto(dup.tree, { node: noise2!, socket: 'Vector' })).toBeUndefined();
    expect(dup.tree.links.some((l) => l.from.node === bsdf2 && l.to.node === out!.id)).toBe(false);
    expect(nodeById(dup.tree, noise2!)!.name).toBe('Noise Texture.001');
  });

  it('moves, mutes, collapses, hides sockets and cuts links', () => {
    let t = defaultMaterialTree();
    const ids = t.nodes.map((n) => n.id);
    t = moveNodes(t, ids, 10, -20);
    expect(t.nodes[0]!.location).toEqual({ x: -190, y: 80 });
    t = toggleMute(t, [ids[0]!]);
    expect(t.nodes[0]!.muted).toBe(true);
    t = toggleCollapse(toggleHideUnused(t, ids), ids);
    expect(t.nodes.every((n) => n.collapsed && n.hideUnused)).toBe(true);
    expect(cutLinks(t, [t.links[0]!.id]).links).toHaveLength(0);
  });

  it('clamps values to the socket range', () => {
    const t = defaultMaterialTree();
    const bsdf = t.nodes[0]!;
    const t2 = setValue(t, bsdf.id, 'Roughness', 2);
    expect(inputValue(nodeById(t2, bsdf.id)!, 'Roughness')).toBe(1);
    expect(inputValue(bsdf, 'Metallic')).toBe(0);
  });
});
