/**
 * Mirror modifier, after Blender's BKE_mesh_mirror_apply_mirror_on_axis:
 * for each enabled axis in order X, Y, Z, the result so far is (optionally
 * bisected and) duplicated, reflected and joined, merging each vertex with its
 * own reflection when they are closer than the merge distance.
 */
import { type Mat4, axisColumn, invert, multiply, scaling, transformPoint, translationOf } from '../math/mat4';
import { type Vec3, lerp, length, normalize, scale, sub, vec3 } from '../math/vec3';
import type { Face, MeshData } from '../mesh/mesh-data';
import { remapVerts, rebuild, wireEdges } from '../mesh/ops/common';
import { bisectMesh } from './bisect';
import type { MirrorModifier } from './types';

const AXES = [0, 1, 2] as const;
const UNIT: readonly Vec3[] = [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)];

/** Reverses a face keeping its first vertex, like BKE_mesh_polygon_flip. */
const flipFace = (f: Face): Face => [f[0]!, ...f.slice(1).reverse()];

/**
 * `mirrorSpace`: the Mirror Object's matrix in this object's local space
 * (inverse(object) * mirrorObject), or null to mirror around the object's own origin.
 */
export function applyMirror(m: MeshData, mod: MirrorModifier, mirrorSpace: Mat4 | null): MeshData {
  let out = m;
  for (const axis of AXES) if (mod.useAxis[axis]) out = mirrorOnAxis(out, mod, axis, mirrorSpace);
  return out;
}

function mirrorOnAxis(m: MeshData, mod: MirrorModifier, axis: 0 | 1 | 2, mirrorSpace: Mat4 | null): MeshData {
  const flip = scaling(vec3(axis === 0 ? -1 : 1, axis === 1 ? -1 : 1, axis === 2 ? -1 : 1));
  const reflect = mirrorSpace ? multiply(mirrorSpace, multiply(flip, invert(mirrorSpace))) : flip;

  let src = m;
  if (mod.useBisectAxis[axis]) {
    const point = mirrorSpace ? translationOf(mirrorSpace) : vec3(0, 0, 0);
    const normal = mirrorSpace ? normalize(axisColumn(mirrorSpace, axis)) : UNIT[axis]!;
    // Without Flip, Blender keeps the positive side of the axis. FIDELITY?
    const kill = mod.useBisectFlipAxis[axis] ? normal : scale(normal, -1);
    src = bisectMesh(src, point, kill, mod.bisectThreshold);
  }

  const n = src.verts.length;
  const verts = [...src.verts, ...src.verts.map((v) => transformPoint(reflect, v))];
  const target = verts.map((_, i) => i);
  if (mod.useMirrorMerge) {
    // Each vertex merges only with its own reflection; both move to the midpoint.
    for (let i = 0; i < n; i++) {
      if (length(sub(verts[i]!, verts[n + i]!)) < mod.mergeThreshold) {
        verts[i] = lerp(verts[i]!, verts[n + i]!, 0.5);
        verts[n + i] = verts[i]!;
        target[n + i] = i;
      }
    }
  }
  const faces: Face[] = [...src.faces, ...src.faces.map((f) => flipFace(f.map((v) => v + n)))];
  const wires = wireEdges(src);
  const joined = rebuild(verts, faces, [...wires, ...wires.map(([a, b]) => [a + n, b + n] as const)]);
  if (!mod.useMirrorMerge) return joined;
  return remapVerts(joined, target).mesh;
}
