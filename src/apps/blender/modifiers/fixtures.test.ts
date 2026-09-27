/**
 * Compares the lab's modifiers with meshes exported from Blender 5.2 (see
 * tests/fixtures/blender/README.md). A missing fixture skips its test.
 *
 * Vertex order is not compared (OpenSubdiv and bmesh number vertices their own
 * way): every vertex must have a counterpart within the tolerance, both ways,
 * and the number of faces of each size must be the same.
 */
import { describe, expect, it } from 'vitest';
import { type Vec3, length, sub, vec3 } from '../math/vec3';
import type { MeshData } from '../mesh/mesh-data';
import { cylinderMesh, primitiveMesh } from '../mesh/primitives';
import { applyBevel } from './bevel';
import { applySubsurf } from './subsurf';
import { type BevelModifier, type SubsurfModifier, newModifier } from './types';

const files = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../../tests/fixtures/blender/*.obj', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >,
  ).map(([k, v]) => [k.split('/').pop()!, v]),
);

/** Vertices and face sizes of an OBJ file (Forward Y, Up Z: Blender coordinates). */
function parseObj(text: string): { verts: Vec3[]; faceSizes: number[] } {
  const verts: Vec3[] = [];
  const faceSizes: number[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v') verts.push(vec3(Number(parts[1]), Number(parts[2]), Number(parts[3])));
    else if (parts[0] === 'f') faceSizes.push(parts.length - 1);
  }
  return { verts, faceSizes };
}

const TOLERANCE = 1e-4;

function histogram(sizes: readonly number[]): Record<number, number> {
  const h: Record<number, number> = {};
  for (const s of sizes) h[s] = (h[s] ?? 0) + 1;
  return h;
}

/** Vertices of `a` with no vertex of `b` within the tolerance (at most 5, for the message). */
function unmatched(a: readonly Vec3[], b: readonly Vec3[]): Vec3[] {
  return a.filter((p) => !b.some((q) => length(sub(p, q)) <= TOLERANCE)).slice(0, 5);
}

const subsurf = (patch: Partial<SubsurfModifier>): SubsurfModifier => ({
  ...(newModifier('SUBSURF') as SubsurfModifier),
  ...patch,
});
const bevel = (patch: Partial<BevelModifier>): BevelModifier => ({ ...(newModifier('BEVEL') as BevelModifier), ...patch });

const CASES: Record<string, () => MeshData> = {
  'cube_subsurf_cc_1.obj': () => applySubsurf(primitiveMesh('cube'), subsurf({}), 1),
  'cube_subsurf_cc_2.obj': () => applySubsurf(primitiveMesh('cube'), subsurf({}), 2),
  'cube_subsurf_cc_3.obj': () => applySubsurf(primitiveMesh('cube'), subsurf({}), 3),
  'cube_subsurf_simple_2.obj': () => applySubsurf(primitiveMesh('cube'), subsurf({ subdivisionType: 'SIMPLE' }), 2),
  'plane_subsurf_cc_2.obj': () => applySubsurf(primitiveMesh('plane'), subsurf({}), 2),
  'cylinder6_subsurf_cc_1.obj': () => applySubsurf(cylinderMesh(6), subsurf({}), 1),
  'cube_bevel_default.obj': () => applyBevel(primitiveMesh('cube'), bevel({})).mesh,
  'cube_bevel_2seg.obj': () => applyBevel(primitiveMesh('cube'), bevel({ segments: 2 })).mesh,
  'cube_bevel_3seg.obj': () => applyBevel(primitiveMesh('cube'), bevel({ segments: 3 })).mesh,
};

describe('modifiers against Blender 5.2 exports', () => {
  for (const [name, build] of Object.entries(CASES)) {
    const source = files[name];
    it.skipIf(source === undefined)(name, () => {
      const ref = parseObj(source!);
      const ours = build();
      expect(ours.verts.length).toBe(ref.verts.length);
      expect(histogram(ours.faces.map((f) => f.length))).toEqual(histogram(ref.faceSizes));
      expect(unmatched(ours.verts, ref.verts)).toEqual([]);
      expect(unmatched(ref.verts, ours.verts)).toEqual([]);
    });
  }

  it('every fixture in the folder has a case', () => {
    expect(Object.keys(files).filter((f) => !(f in CASES))).toEqual([]);
  });
});
