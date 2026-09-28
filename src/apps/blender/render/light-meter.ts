/**
 * The light meter (a lab tool, not part of Blender): the irradiance on a
 * surface point, light by light, with shadows (a ray towards each light), plus
 * the World's. Pure and in Blender coordinates, so stage checks can use it.
 *
 * Adaptat de cifog-lab (xavikai), labs/lighting/light.js (measure, probes).
 * FIDELITY? The World's light is counted without occlusion (as an open sky).
 */
import { rotate } from '../math/quat';
import { type Vec3, add, cross, dot, length, normalize, scale, sub, vec3 } from '../math/vec3';
import { triangulateFace } from '../mesh/geometry';
import { evaluatedMesh } from '../modifiers/stack';
import { type LightObject, type SceneState, lightData, objectRotation, worldOf } from '../scene/scene';
import { areaSamples, irradiance, lightPose, worldIrradiance } from './light-physics';

/** A world-space triangle of a mesh object, with its unit normal. */
export interface SceneTriangle {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly c: Vec3;
  readonly n: Vec3;
  readonly objectId: string;
}

/** Every triangle of every mesh as drawn (modifiers included), in world space. */
export function sceneTriangles(scene: SceneState): SceneTriangle[] {
  const out: SceneTriangle[] = [];
  for (const o of scene.objects) {
    if (o.type !== 'mesh') continue;
    const m = evaluatedMesh(o, scene);
    const q = objectRotation(o);
    const w = (p: Vec3) => add(o.location, rotate(q, vec3(p.x * o.scale.x, p.y * o.scale.y, p.z * o.scale.z)));
    m.faces.forEach((_, f) => {
      for (const [i, j, k] of triangulateFace(m, f)) {
        const a = w(m.verts[i]!);
        const b = w(m.verts[j]!);
        const c = w(m.verts[k]!);
        const n = cross(sub(b, a), sub(c, a));
        if (length(n) < 1e-12) continue;
        out.push({ a, b, c, n: normalize(n), objectId: o.id });
      }
    });
  }
  return out;
}

/** Ray–triangle distance (Möller–Trumbore), or null. */
function hit(o: Vec3, d: Vec3, t: SceneTriangle): number | null {
  const e1 = sub(t.b, t.a);
  const e2 = sub(t.c, t.a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const s = sub(o, t.a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return null;
  const q = cross(s, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return null;
  const dist = dot(e2, q) * inv;
  return dist > 1e-6 ? dist : null;
}

/** The first surface along a ray: its point and the normal facing the ray. */
export function surfaceAlong(tris: readonly SceneTriangle[], origin: Vec3, dir: Vec3): { point: Vec3; normal: Vec3; objectId: string } | null {
  let best = Infinity;
  let found: SceneTriangle | null = null;
  for (const t of tris) {
    const d = hit(origin, dir, t);
    if (d !== null && d < best) {
      best = d;
      found = t;
    }
  }
  if (!found) return null;
  const normal = dot(found.n, dir) > 0 ? scale(found.n, -1) : found.n;
  return { point: add(origin, scale(dir, best)), normal, objectId: found.objectId };
}

/** Whether something blocks the way from p (on a surface with normal n) to `to`, or along `dir` forever. */
function blocked(tris: readonly SceneTriangle[], p: Vec3, n: Vec3, target: Vec3 | null, dir: Vec3): boolean {
  const from = add(p, scale(n, 1e-4));
  const maxDist = target ? length(sub(target, from)) - 1e-4 : Infinity;
  for (const t of tris) {
    const d = hit(from, dir, t);
    if (d !== null && d < maxDist) return true;
  }
  return false;
}

/** Irradiance (W/m²) of one light on (p, n), with its shadows. */
export function shadowedIrradiance(o: LightObject, p: Vec3, n: Vec3, tris: readonly SceneTriangle[]): number {
  const d = lightData(o);
  const pose = lightPose(o);
  if (d.lightType === 'SUN') {
    const towards = scale(pose.direction, -1);
    if (d.useShadow && blocked(tris, p, n, null, towards)) return 0;
    return irradiance(o, p, n);
  }
  if (d.lightType === 'AREA') {
    const samples = areaSamples(d, pose);
    const i0 = d.energy / Math.PI / samples.length;
    let e = 0;
    for (const s of samples) {
      const toLight = sub(s, p);
      const dist = length(toLight);
      if (dist < 1e-9) continue;
      const dir = scale(toLight, 1 / dist);
      const cosSurface = dot(n, dir);
      const cosLight = -dot(pose.direction, dir);
      if (cosSurface <= 0 || cosLight <= 0) continue;
      if (d.useShadow && blocked(tris, p, n, s, dir)) continue;
      e += (i0 * cosLight * cosSurface) / (dist * dist);
    }
    return e;
  }
  const e = irradiance(o, p, n);
  if (e === 0 || !d.useShadow) return e;
  const dir = normalize(sub(pose.position, p));
  return blocked(tris, p, n, pose.position, dir) ? 0 : e;
}

export interface MeterReading {
  /** W/m², all lights and the World. */
  readonly total: number;
  readonly lights: readonly { readonly id: string; readonly name: string; readonly irradiance: number }[];
  readonly world: number;
}

/** What the light meter reads at a surface point. */
export function measure(scene: SceneState, p: Vec3, n: Vec3, tris: readonly SceneTriangle[] = sceneTriangles(scene)): MeterReading {
  const lights = scene.objects
    .filter((o): o is LightObject => o.type === 'light')
    .map((o) => ({ id: o.id, name: o.name, irradiance: shadowedIrradiance(o, p, n, tris) }));
  const world = worldIrradiance(worldOf(scene));
  return { total: lights.reduce((s, l) => s + l.irradiance, 0) + world, lights, world };
}

/** Ratio a : b in stops (log2), for comparing two readings. */
export const stopsBetween = (a: number, b: number): number => Math.log2(Math.max(a, 1e-9) / Math.max(b, 1e-9));
