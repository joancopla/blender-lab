import { describe, expect, it } from 'vitest';
import { add, vec3 } from '../math/vec3';
import { applyArray } from '../modifiers/array';
import { applyBevel } from '../modifiers/bevel';
import { applyMirror } from '../modifiers/mirror';
import { applySubsurf } from '../modifiers/subsurf';
import { type ArrayModifier, type BevelModifier, type MirrorModifier, type SubsurfModifier, newModifier } from '../modifiers/types';
import { type MeshData, isSmooth, smoothFrom, withSmooth } from './mesh-data';
import { bevelEdges, bevelVerts } from './ops/bevel';
import { deleteElements, dissolveFaces } from './ops/delete';
import { extrudeEdges, extrudeRegion } from './ops/extrude';
import { fill } from './ops/fill';
import { inset } from './ops/inset';
import { loopCut } from './ops/loopcut';
import { merge } from './ops/merge';
import { cubeMesh, planeMesh } from './primitives';
import { MeshTopology } from './topology';

const TOP = 5; // +Z face of cubeMesh
const smoothOnly = (m: MeshData, faces: number[]) => withSmooth(m, m.faces.map((_, f) => faces.includes(f)));
const smoothCount = (m: MeshData) => {
  expect(m.smoothFaces?.length).toBe(m.faces.length);
  return m.faces.filter((_, f) => isSmooth(m, f)).length;
};
const edgeOf = (m: MeshData, a: number, b: number) => new MeshTopology(m).findEdge(a, b)!;

describe('smoothFaces attribute', () => {
  it('is absent by default and stays absent through operations', () => {
    const cube = cubeMesh();
    expect(cube.smoothFaces).toBeUndefined();
    expect(extrudeRegion(cube, [TOP]).mesh.smoothFaces).toBeUndefined();
    expect(smoothFrom(cube, [0, 1])).toBeUndefined();
    expect(applySubsurf(cube, newModifier('SUBSURF') as SubsurfModifier, 1).smoothFaces).toBeUndefined();
    expect(Object.keys(deleteElements(cube, { verts: [0], edges: [], faces: [] }, 'verts'))).not.toContain('smoothFaces');
  });

  it('Extrude Region: the region and its side faces keep the region face shading', () => {
    const m = extrudeRegion(smoothOnly(cubeMesh(), [TOP]), [TOP]).mesh;
    expect(smoothCount(m)).toBe(5);
    expect(isSmooth(m, TOP)).toBe(true);
  });

  it('Extrude Edges: the new quad is shaded like the face of the edge', () => {
    const plane = smoothOnly(planeMesh(), [0]);
    expect(smoothCount(extrudeEdges(plane, [0]).mesh)).toBe(2);
  });

  it('Inset, region and individual: the ring is shaded like the inset face', () => {
    const cube = smoothOnly(cubeMesh(), [TOP]);
    expect(smoothCount(inset(cube, [TOP], { thickness: 0.2, depth: 0, individual: false }))).toBe(5);
    expect(smoothCount(inset(cube, [TOP], { thickness: 0.2, depth: 0, individual: true }))).toBe(5);
  });

  it('Loop Cut: both halves of a cut face keep its shading', () => {
    // Edge 1-5 lies on the top face, so the ring goes through it.
    const cube = smoothOnly(cubeMesh(), [TOP]);
    const m = loopCut(cube, edgeOf(cube, 1, 5), 1).mesh;
    expect(m.faces.length).toBe(10);
    expect(smoothCount(m)).toBe(2);
  });

  it('Delete keeps the shading of the faces that stay', () => {
    const m = deleteElements(smoothOnly(cubeMesh(), [TOP]), { verts: [], edges: [], faces: [0] }, 'faces');
    expect(m.faces.length).toBe(5);
    expect(smoothCount(m)).toBe(1);
    expect(isSmooth(m, 4)).toBe(true);
  });

  it('Dissolve Faces: two smooth faces give a smooth face', () => {
    const m = dissolveFaces(smoothOnly(cubeMesh(), [3, TOP]), [3, TOP]);
    expect(m.faces.length).toBe(5);
    expect(smoothCount(m)).toBe(1);
  });

  it('Merge keeps the shading of the faces that survive', () => {
    const m = merge(smoothOnly(cubeMesh(), [TOP]), [1, 5], 'center').mesh;
    expect(smoothCount(m)).toBe(1);
  });

  it('Fill: the new face follows most of the faces around it', () => {
    const top = cubeMesh().faces[TOP]!;
    const open = (smooth: number[]) => deleteElements(smoothOnly(cubeMesh(), smooth), { verts: [], edges: [], faces: [TOP] }, 'onlyFaces');
    const loop = (m: MeshData) => top.map((v, i) => edgeOf(m, v, top[(i + 1) % 4]!));
    const filled = (m: MeshData) => fill(m, { verts: [...top], edges: loop(m) })!.mesh;
    expect(isSmooth(filled(open([0, 1, 2])), 5)).toBe(true);
    expect(isSmooth(filled(open([0, 1])), 5)).toBe(false);
  });

  it('Bevel: the strip between two smooth faces is smooth; vertex caps keep the attribute', () => {
    const cube = smoothOnly(cubeMesh(), [0, 2]); // -X and -Y share the edge 0-1
    const m = bevelEdges(cube, [edgeOf(cube, 0, 1)], 0.2, 2)!;
    expect(smoothCount(m)).toBe(4);
    expect(smoothCount(bevelVerts(smoothOnly(cubeMesh(), [0, 1, 2, 3, 4, 5]), [7], 0.2)!)).toBe(7);
  });
});

describe('smoothFaces through modifiers', () => {
  const shifted = (m: MeshData) => ({ ...m, verts: m.verts.map((v) => add(v, vec3(3, 0, 0))) });

  it('Mirror copies the shading to the mirrored faces', () => {
    const m = applyMirror(smoothOnly(shifted(cubeMesh()), [TOP]), newModifier('MIRROR') as MirrorModifier, null);
    expect(m.faces.length).toBe(12);
    expect(smoothCount(m)).toBe(2);
  });

  it('Array copies it to every copy', () => {
    const m = applyArray(smoothOnly(cubeMesh(), [TOP]), newModifier('ARRAY') as ArrayModifier);
    expect(smoothCount(m)).toBe(2);
  });

  it('Subdivision Surface: child faces are shaded like their parent', () => {
    const m = applySubsurf(smoothOnly(cubeMesh(), [TOP]), newModifier('SUBSURF') as SubsurfModifier, 2);
    expect(m.faces.length).toBe(96);
    expect(smoothCount(m)).toBe(16);
  });

  it('Bevel modifier: a smooth cube stays smooth everywhere', () => {
    const cube = smoothOnly(cubeMesh(), [0, 1, 2, 3, 4, 5]);
    const m = applyBevel(cube, { ...(newModifier('BEVEL') as BevelModifier), segments: 3 }).mesh;
    expect(smoothCount(m)).toBe(m.faces.length);
  });

  it('Mirror Bisect keeps the shading of the cut faces', () => {
    const mod = { ...(newModifier('MIRROR') as MirrorModifier), useBisectAxis: [true, false, false] as const };
    const m = applyMirror(smoothOnly(cubeMesh(), [TOP]), mod, null);
    expect(smoothCount(m)).toBe(2);
  });
});
