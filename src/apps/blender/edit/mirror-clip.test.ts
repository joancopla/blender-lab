import { describe, expect, it } from 'vitest';
import { type Vec3, vec3 } from '../math/vec3';
import { type MirrorModifier, newModifier } from '../modifiers/types';
import { mesh } from '../scene/factory';
import type { MeshObject } from '../scene/scene';
import { clipToMirror } from './mirror-clip';

const mirror = (patch: Partial<MirrorModifier> = {}): MirrorModifier => ({
  ...(newModifier('MIRROR') as MirrorModifier),
  useClip: true,
  ...patch,
});
const withMods = (...modifiers: MirrorModifier[]): MeshObject => ({ ...mesh('c', 'Cube', 'cube', vec3(0, 0, 0)), modifiers });
const clip = (o: MeshObject, from: Vec3, to: Vec3) => clipToMirror(o, new Map([[0, from]]), [to])[0]!;

describe('Mirror Clipping in Edit Mode', () => {
  it('a vertex on the plane stays on it', () => {
    expect(clip(withMods(mirror()), vec3(0, 1, 1), vec3(0.4, 2, 1))).toEqual(vec3(0, 2, 1));
    // Closer than the Merge distance counts as on the plane.
    expect(clip(withMods(mirror()), vec3(0.0005, 1, 1), vec3(0.3, 1, 1)).x).toBe(0);
  });

  it('a vertex cannot go through the plane: it stops on it', () => {
    expect(clip(withMods(mirror()), vec3(1, 0, 0), vec3(-0.5, 0, 0))).toEqual(vec3(0, 0, 0));
    expect(clip(withMods(mirror()), vec3(1, 0, 0), vec3(0.5, 0, 0))).toEqual(vec3(0.5, 0, 0));
  });

  it('only on the mirrored axes, and only with Clipping and Realtime on', () => {
    const o = withMods(mirror({ useAxis: [false, true, false] }));
    expect(clip(o, vec3(0, 0, 1), vec3(0.4, 0.4, 1))).toEqual(vec3(0.4, 0, 1));
    expect(clip(withMods(mirror({ useClip: false })), vec3(0, 1, 1), vec3(0.4, 1, 1)).x).toBe(0.4);
    expect(clip(withMods(mirror({ showViewport: false })), vec3(0, 1, 1), vec3(0.4, 1, 1)).x).toBe(0.4);
  });

  it('vertices that did not move are left alone', () => {
    const o = withMods(mirror());
    const out = clipToMirror(o, new Map(), [vec3(0.2, 0, 0)]);
    expect(out).toEqual([vec3(0.2, 0, 0)]);
  });
});
