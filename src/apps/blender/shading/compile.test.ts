import { describe, expect, it } from 'vitest';
import { compileMaterial, convertExpr, uniformValue } from './compile';
import { NODE_TYPES } from './node-types';
import { evaluateRamp, rampTable, RAMP_TABLE_SIZE } from './ramp';
import { EMPTY_TREE, addNode, connect, defaultMaterialTree, nodeById, setProp, setValue, toggleMute } from './tree';
import type { NodeTree } from './tree';

const principled = (t: NodeTree) => t.nodes.find((n) => n.type === 'ShaderNodeBsdfPrincipled')!;

/** Default material plus one node linked into the Principled BSDF's Base Color. */
function withNode(type: string, socket: string, props = {}): { tree: NodeTree; id: string } {
  const base = defaultMaterialTree();
  const added = addNode(base, type, { x: -500, y: 0 }, props);
  const tree = connect(added.tree, { node: added.id, socket }, { node: principled(base).id, socket: 'Base Color' });
  return { tree, id: added.id };
}

describe('compileMaterial', () => {
  it('compiles the default material into uniforms for every Principled value', () => {
    const c = compileMaterial(defaultMaterialTree());
    expect(c.code).toContain('BlClosure bl_eval()');
    expect(c.uniforms.some((u) => u.source.kind === 'input' && u.source.socket === 'Base Color')).toBe(true);
    expect(c.flags).toEqual({ transmission: false, coat: false, alpha: false, window: false });
    expect(c.warnings).toEqual([]);
  });

  it('changing a value keeps the program; a link or an option changes it', () => {
    const t = defaultMaterialTree();
    const a = compileMaterial(t);
    const p = principled(t);
    expect(compileMaterial(setValue(t, p.id, 'Roughness', 0.9)).key).toBe(a.key);
    const noise = withNode('ShaderNodeTexNoise', 'Color');
    const b = compileMaterial(noise.tree);
    expect(b.key).not.toBe(a.key);
    expect(compileMaterial(setProp(noise.tree, noise.id, 'noise_dimensions', '4D')).key).not.toBe(b.key);
    expect(compileMaterial(setValue(noise.tree, noise.id, 'Scale', 12)).key).toBe(b.key);
  });

  it('uniforms read the current values of the tree', () => {
    const t = defaultMaterialTree();
    const p = principled(t);
    const c = compileMaterial(t);
    const rough = c.uniforms.find((u) => u.source.kind === 'input' && u.source.socket === 'Roughness')!;
    expect(uniformValue(t, rough.source)).toBe(0.5);
    expect(uniformValue(setValue(t, p.id, 'Roughness', 0.2), rough.source)).toBe(0.2);
  });

  it('turns on transmission, coat and dithered alpha only when they are used', () => {
    const t = defaultMaterialTree();
    const p = principled(t);
    expect(compileMaterial(setValue(t, p.id, 'Transmission Weight', 1)).flags.transmission).toBe(true);
    expect(compileMaterial(setValue(t, p.id, 'Coat Weight', 0.5)).flags.coat).toBe(true);
    expect(compileMaterial(setValue(t, p.id, 'Alpha', 0.5)).flags.alpha).toBe(true);
  });

  it('compiles every Lab 05 node with its default options', () => {
    for (const def of NODE_TYPES) {
      if (def.id === 'ShaderNodeOutputMaterial' || def.outputs.length === 0) continue;
      const out = def.outputs[0]!;
      const base = defaultMaterialTree();
      const added = addNode(base, def.id, { x: -500, y: 0 });
      const target = out.type === 'shader' ? { node: base.nodes[1]!.id, socket: 'Surface' } : { node: principled(base).id, socket: 'Base Color' };
      const tree = connect(added.tree, { node: added.id, socket: out.id }, target);
      expect(() => compileMaterial(tree), def.id).not.toThrow();
    }
  });

  it('compiles every Noise Texture dimension and type', () => {
    for (const dims of ['1D', '2D', '3D', '4D']) {
      for (const type of ['FBM', 'MULTIFRACTAL', 'HETERO_TERRAIN', 'HYBRID_MULTIFRACTAL', 'RIDGED_MULTIFRACTAL']) {
        const { tree } = withNode('ShaderNodeTexNoise', 'Fac', { noise_dimensions: dims, noise_type: type });
        const c = compileMaterial(tree);
        expect(c.code).toContain(`bl_tex_noise_${type.toLowerCase()}_${dims.toLowerCase()}(`);
      }
    }
  });

  it('a colour into Surface is emission, as Blender interprets it', () => {
    const base = defaultMaterialTree();
    const out = base.nodes.find((n) => n.type === 'ShaderNodeOutputMaterial')!;
    const rgb = addNode(base, 'ShaderNodeRGB', { x: 0, y: 0 });
    const tree = connect(rgb.tree, { node: rgb.id, socket: 'Color' }, { node: out.id, socket: 'Surface' });
    expect(compileMaterial(tree).code).toMatch(/return bl_closure_emission\(max\(\(u_n\d+_color\)\.rgb/);
  });

  it('nothing in Surface is black', () => {
    const t = addNode(EMPTY_TREE, 'ShaderNodeOutputMaterial', { x: 0, y: 0 }).tree;
    expect(compileMaterial(t).code).toContain('return bl_closure_emission(vec3(0.0));');
  });

  it('a muted node passes its main input through (Mix: A)', () => {
    const { tree, id } = withNode('ShaderNodeMix', 'Result_Color', { data_type: 'RGBA' });
    const c = compileMaterial(toggleMute(tree, [id]));
    expect(c.code).not.toContain('bl_mix_blend');
    expect(c.code).toContain(`u_${id}_A_Color`);
  });

  it('only the Color output of Noise asks for the extra colour evaluations', () => {
    const fac = compileMaterial(withNode('ShaderNodeTexNoise', 'Fac').tree).code;
    const color = compileMaterial(withNode('ShaderNodeTexNoise', 'Color').tree).code;
    expect(fac).toContain('bl_tex_noise_fbm_3d(');
    expect(fac).not.toContain('_3d_color');
    expect(color).toContain('bl_tex_noise_fbm_3d_color(');
  });

  it('warns about panels the lab does not replicate', () => {
    const t = defaultMaterialTree();
    expect(compileMaterial(setValue(t, principled(t).id, 'Sheen Weight', 1)).warnings).toEqual(['Principled BSDF: Sheen']);
  });

  it('an Image Texture without an image is magenta', () => {
    expect(compileMaterial(withNode('ShaderNodeTexImage', 'Color').tree).code).toContain('vec4(1.0, 0.0, 1.0, 1.0)');
  });
});

describe('conversions in GLSL', () => {
  it('colour to float is luminance, vector to float the average', () => {
    expect(convertExpr('c', 'color', 'float')).toContain('dot((c).rgb, vec3(0.2126, 0.7152, 0.0722))');
    expect(convertExpr('v', 'vector', 'float')).toBe('(((v).x + (v).y + (v).z) / 3.0)');
    expect(convertExpr('f', 'float', 'color')).toBe('vec4(vec3(f), 1.0)');
    expect(convertExpr('c', 'color', 'vector')).toBe('(c).rgb');
  });
});

describe('Color Ramp (BKE_colorband_evaluate)', () => {
  const ramp = (interpolation: 'LINEAR' | 'EASE' | 'CONSTANT' | 'B_SPLINE' | 'CARDINAL', stops = [
    { position: 0.25, color: [1, 0, 0, 1] as const },
    { position: 0.75, color: [0, 0, 1, 1] as const },
  ]) => ({ interpolation, colorMode: 'RGB' as const, stops });

  it('holds the end colours outside the stops', () => {
    expect(evaluateRamp(ramp('LINEAR'), 0)).toEqual([1, 0, 0, 1]);
    expect(evaluateRamp(ramp('LINEAR'), 1)).toEqual([0, 0, 1, 1]);
  });

  it('linear and ease meet halfway; ease is smoother', () => {
    expect(evaluateRamp(ramp('LINEAR'), 0.5)).toEqual([0.5, 0, 0.5, 1]);
    const lin = evaluateRamp(ramp('LINEAR'), 0.375)[2];
    const ease = evaluateRamp(ramp('EASE'), 0.375)[2];
    expect(lin).toBeCloseTo(0.25);
    expect(ease).toBeCloseTo(0.15625);
  });

  it('constant keeps the colour of the stop on the left', () => {
    expect(evaluateRamp(ramp('CONSTANT'), 0.7)).toEqual([1, 0, 0, 1]);
    expect(evaluateRamp(ramp('CONSTANT'), 0.8)).toEqual([0, 0, 1, 1]);
  });

  it('B-Spline and Cardinal stay inside 0..1', () => {
    for (const t of ['B_SPLINE', 'CARDINAL'] as const) {
      for (let x = 0; x <= 1; x += 0.05) {
        for (const c of evaluateRamp(ramp(t), x)) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('the GPU table has 257 entries from 0 to 1', () => {
    const table = rampTable(ramp('LINEAR'));
    expect(table.length).toBe(RAMP_TABLE_SIZE * 4);
    expect([...table.slice(128 * 4, 128 * 4 + 4)]).toEqual([0.5, 0, 0.5, 1]);
  });

  it('the default ramp is black to white', () => {
    const t = withNode('ShaderNodeValToRGB', 'Color').tree;
    const n = t.nodes.find((x) => x.type === 'ShaderNodeValToRGB')!;
    expect(evaluateRamp(nodeById(t, n.id)!.props.color_ramp as never, 0.5)).toEqual([0.5, 0.5, 0.5, 1]);
  });
});
