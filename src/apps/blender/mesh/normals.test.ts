import { describe, expect, it } from 'vitest';
import { type Vec3, nearlyEqual, normalize, vec3 } from '../math/vec3';
import { faceNormal } from './geometry';
import { type MeshData, meshFromFaces, withSmooth } from './mesh-data';
import { cornerNormals } from './normals';
import { cubeMesh } from './primitives';
import { MeshTopology } from './topology';

const smooth = (m: MeshData, faces: number[] = m.faces.map((_, f) => f)) =>
  withSmooth(m, m.faces.map((_, f) => faces.includes(f)));
/** Normal of face f at vertex v. */
const at = (n: Vec3[][], m: MeshData, f: number, v: number) => n[f]![m.faces[f]!.indexOf(v)]!;
const expectVec = (a: Vec3, b: Vec3) => expect(nearlyEqual(a, b, 1e-9), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`).toBe(true);

// cubeMesh: vertex 7 is (1, 1, 1); faces 1 = +X, 3 = +Y, 5 = +Z.
describe('cornerNormals', () => {
  it('flat faces use the face normal', () => {
    const cube = cubeMesh();
    const n = cornerNormals(cube);
    cube.faces.forEach((face, f) => face.forEach((_, i) => expectVec(n[f]![i]!, faceNormal(cube, f))));
  });

  it('a fully smooth cube has one normal per vertex, towards the corner', () => {
    const cube = smooth(cubeMesh());
    const n = cornerNormals(cube);
    for (const f of [1, 3, 5]) expectVec(at(n, cube, f, 7), normalize(vec3(1, 1, 1)));
  });

  it('a flat face keeps its normal and splits the smooth faces next to it', () => {
    const cube = smooth(cubeMesh(), [0, 1, 2, 3, 4]); // +Z flat
    const n = cornerNormals(cube);
    expectVec(at(n, cube, 5, 7), vec3(0, 0, 1));
    expectVec(at(n, cube, 1, 7), normalize(vec3(1, 1, 0)));
    expectVec(at(n, cube, 3, 7), normalize(vec3(1, 1, 0)));
  });

  it('sharp edges split the fan only where it is cut in two', () => {
    const cube = smooth(cubeMesh());
    const t = new MeshTopology(cube);
    const one = new Set([t.findEdge(6, 7)!]);
    const n1 = cornerNormals(cube, (e) => one.has(e));
    expectVec(at(n1, cube, 1, 7), normalize(vec3(1, 1, 1))); // still joined through +Z

    const two = new Set([t.findEdge(6, 7)!, t.findEdge(3, 7)!]);
    const n2 = cornerNormals(cube, (e) => two.has(e));
    expectVec(at(n2, cube, 3, 7), vec3(0, 1, 0));
    expectVec(at(n2, cube, 1, 7), normalize(vec3(1, 0, 1)));
    expectVec(at(n2, cube, 5, 7), normalize(vec3(1, 0, 1)));
  });

  it('face normals are weighted by the corner angle', () => {
    // Quad on the XY plane (normal +Z) and a triangle standing on its edge 0-1.
    const m = smooth(
      meshFromFaces(
        [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0), vec3(0, 0, 1)],
        [
          [0, 1, 2, 3],
          [1, 0, 4],
        ],
      ),
    );
    expectVec(faceNormal(m, 1), vec3(0, 1, 0));
    const n = cornerNormals(m);
    // Vertex 1: 90° in the quad, 45° in the triangle. Vertex 0: 90° in both.
    expectVec(at(n, m, 0, 1), normalize(vec3(0, Math.PI / 4, Math.PI / 2)));
    expectVec(at(n, m, 0, 0), normalize(vec3(0, 1, 1)));
  });

  it('faces with opposite winding are not smoothed together', () => {
    const m = smooth(
      meshFromFaces(
        [vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0), vec3(0, 1, 0), vec3(0, -1, 0), vec3(1, -1, 0)],
        [
          [0, 1, 2, 3],
          [0, 1, 5, 4], // goes 0 -> 1 like the first face: flipped
        ],
      ),
    );
    const n = cornerNormals(m);
    expectVec(at(n, m, 0, 0), vec3(0, 0, 1));
    expectVec(at(n, m, 1, 0), vec3(0, 0, -1));
  });
});
