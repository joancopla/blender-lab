import { describe, expect, it } from 'vitest';
import { cross, dot } from '../math/vec3';
import { triangulateFace } from '../mesh/geometry';
import { type MeshData, meshCounts, withSmooth } from '../mesh/mesh-data';
import { cubeMesh, planeMesh } from '../mesh/primitives';
import { MeshTopology } from '../mesh/topology';
import { validateMesh } from '../mesh/validate';
import { applySolidify } from './solidify';
import { type SolidifyModifier, newModifier } from './types';

const solidify = (patch: Partial<SolidifyModifier> = {}): SolidifyModifier => ({
  ...(newModifier('SOLIDIFY') as SolidifyModifier),
  ...patch,
});
const counts = (m: MeshData) => {
  const c = meshCounts(m);
  return [c.verts, c.edges, c.faces];
};
/** Signed volume: positive when the faces point outwards. */
function volume(m: MeshData): number {
  let v = 0;
  m.faces.forEach((_, f) => {
    for (const [a, b, c] of triangulateFace(m, f)) v += dot(m.verts[a]!, cross(m.verts[b]!, m.verts[c]!)) / 6;
  });
  return v;
}
const expectClosedShell = (m: MeshData) => {
  expect(validateMesh(m)).toEqual([]);
  const t = new MeshTopology(m);
  expect(t.isManifold()).toBe(true);
  expect(t.eulerCharacteristic()).toBe(2);
  expect(volume(m)).toBeGreaterThan(0);
};
const zRange = (m: MeshData) => [Math.min(...m.verts.map((p) => p.z)), Math.max(...m.verts.map((p) => p.z))];

describe('Solidify (Simple)', () => {
  it('defaults: Thickness 0.01 m, Offset -1, Even Thickness off, Fill Rim on', () => {
    const mod = newModifier('SOLIDIFY') as SolidifyModifier;
    expect(mod.name).toBe('Solidify');
    expect([mod.thickness, mod.offset, mod.useEvenOffset, mod.useRim]).toEqual([0.01, -1, false, true]);
  });

  it('a plane becomes a closed sheet, grown behind the normals with Offset -1', () => {
    const m = applySolidify(planeMesh(), solidify());
    expect(counts(m)).toEqual([8, 12, 6]);
    expectClosedShell(m);
    const [lo, hi] = zRange(m);
    expect(lo).toBeCloseTo(-0.01, 9);
    expect(hi).toBeCloseTo(0, 9);
  });

  it('Offset 1 grows in front of the surface; Offset 0 centres it', () => {
    const front = zRange(applySolidify(planeMesh(), solidify({ offset: 1 })));
    expect(front[0]).toBeCloseTo(0, 9);
    expect(front[1]).toBeCloseTo(0.01, 9);
    const centred = zRange(applySolidify(planeMesh(), solidify({ offset: 0 })));
    expect(centred[0]).toBeCloseTo(-0.005, 9);
    expect(centred[1]).toBeCloseTo(0.005, 9);
  });

  it('negative Thickness: still a closed shell with outward normals', () => {
    const m = applySolidify(planeMesh(), solidify({ thickness: -0.2 }));
    expectClosedShell(m);
    const [lo, hi] = zRange(m);
    expect(lo).toBeCloseTo(0, 9);
    expect(hi).toBeCloseTo(0.2, 9);
  });

  it('without Fill Rim the two surfaces stay open', () => {
    const m = applySolidify(planeMesh(), solidify({ useRim: false }));
    expect(counts(m)).toEqual([8, 8, 2]);
  });

  it('a closed cube gets an inner cube, facing inwards, and no rim', () => {
    const m = applySolidify(cubeMesh(), solidify({ thickness: 0.2 }));
    expect(counts(m)).toEqual([16, 24, 12]);
    const inner: MeshData = { verts: m.verts, edges: m.edges, faces: m.faces.slice(0, 6) };
    const outer: MeshData = { verts: m.verts, edges: m.edges, faces: m.faces.slice(6) };
    expect(volume(outer)).toBeCloseTo(8, 9);
    expect(volume(inner)).toBeLessThan(0);
  });

  it('Even Thickness keeps the walls at the full thickness at corners', () => {
    // Cube corners: the normal is diagonal, so without Even Thickness the walls
    // are thinner (0.2 / √3); with it, exactly 0.2.
    const plain = applySolidify(cubeMesh(), solidify({ thickness: 0.2 }));
    const even = applySolidify(cubeMesh(), solidify({ thickness: 0.2, useEvenOffset: true }));
    expect(plain.verts[7]!.x).toBeCloseTo(1 - 0.2 / Math.sqrt(3), 9);
    expect(even.verts[7]!.x).toBeCloseTo(0.8, 9);
    expect(even.verts[7]!.z).toBeCloseTo(0.8, 9);
  });

  it('Even Thickness on a flat sheet changes nothing', () => {
    const a = applySolidify(planeMesh(), solidify({ useEvenOffset: true }));
    const b = applySolidify(planeMesh(), solidify());
    a.verts.forEach((p, i) => expect(p.z).toBeCloseTo(b.verts[i]!.z, 12));
  });

  it('carries the shading: rim faces follow their border face', () => {
    const plane = withSmooth(planeMesh(), [true]);
    expect(applySolidify(plane, solidify()).smoothFaces).toEqual([true, true, true, true, true, true]);
    expect(applySolidify(planeMesh(), solidify()).smoothFaces).toBeUndefined();
  });
});
