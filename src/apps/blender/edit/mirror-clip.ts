/**
 * Mirror modifier > Clipping, while transforming in Edit Mode: for each axis
 * the modifier mirrors, a vertex that starts on the mirror plane (closer than
 * the Merge distance) stays on it, and no vertex goes through it (it stops on
 * the plane). Only for Mirror modifiers with Realtime on that mirror across
 * the object's own axes.
 * FIDELITY? Clipping with a Mirror Object; whether Realtime / Edit Mode off
 * disable it; the tolerance used.
 */
import type { Vec3 } from '../math/vec3';
import type { MeshObject } from '../scene/scene';

const AXES = ['x', 'y', 'z'] as const;

/**
 * `moved` with clipping applied (local coordinates), given where each moved
 * vertex started. Vertices not in `start` are left as they are.
 */
export function clipToMirror(o: MeshObject, start: ReadonlyMap<number, Vec3>, moved: readonly Vec3[]): Vec3[] {
  const clips = (o.modifiers ?? []).filter(
    (m) => m.type === 'MIRROR' && m.useClip && m.showViewport && m.mirrorObjectId === null,
  );
  if (clips.length === 0) return [...moved];
  const out = [...moved];
  for (const [v, from] of start) {
    const p = { ...out[v]! };
    for (const mod of clips) {
      if (mod.type !== 'MIRROR') continue;
      AXES.forEach((a, i) => {
        if (!mod.useAxis[i]) return;
        const was = from[a];
        if (Math.abs(was) <= mod.mergeThreshold || was * p[a] < 0) p[a] = 0;
      });
    }
    out[v] = p;
  }
  return out;
}
