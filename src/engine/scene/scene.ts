/**
 * Scene data model: the single source of truth. Everything is in Blender units
 * (metres, degrees, Z up). The viewport and the UI only reflect it.
 *
 * Phase 1 only reads it; editing goes through operators from phase 2/3 on.
 */
import { DEG, type Quat, fromEulerXYZ, rotate } from '../math/quat';
import { type Vec3, add, max, min, mul, vec3 } from '../math/vec3';
import type { Bounds, SceneCameraData } from '../viewport/view-state';

export type PrimitiveKind = 'cube' | 'uvSphere' | 'cylinder' | 'cone' | 'torus' | 'plane';

interface ObjectBase {
  readonly id: string;
  /** Name as shown in Blender (Cube, Cube.001...). */
  readonly name: string;
  readonly location: Vec3;
  /** XYZ Euler, in degrees (as shown in the N panel). */
  readonly rotationDeg: Vec3;
  readonly scale: Vec3;
}

export interface MeshObject extends ObjectBase {
  readonly type: 'mesh';
  readonly primitive: PrimitiveKind;
}

export interface CameraObject extends ObjectBase {
  readonly type: 'camera';
  readonly lens: number;
  readonly sensorWidth: number;
}

export interface LightObject extends ObjectBase {
  readonly type: 'light';
  readonly lightType: 'point';
}

export type SceneObject = MeshObject | CameraObject | LightObject;

export interface SceneState {
  readonly objects: readonly SceneObject[];
  readonly selectedIds: readonly string[];
  readonly activeId: string | null;
  readonly activeCameraId: string | null;
  readonly render: { readonly resolutionX: number; readonly resolutionY: number };
}

/** Local-space bounding boxes of Blender's primitives with default Add settings. */
export const PRIMITIVE_LOCAL_BOUNDS: Record<PrimitiveKind, Bounds> = {
  cube: { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) },
  uvSphere: { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) },
  cylinder: { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) },
  cone: { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) },
  torus: { min: vec3(-1.25, -1.25, -0.25), max: vec3(1.25, 1.25, 0.25) },
  plane: { min: vec3(-1, -1, 0), max: vec3(1, 1, 0) },
};

export function objectRotation(o: ObjectBase): Quat {
  return fromEulerXYZ(vec3(o.rotationDeg.x * DEG, o.rotationDeg.y * DEG, o.rotationDeg.z * DEG));
}

/**
 * World-space axis-aligned bounds. Cameras and lights count as a point at their
 * location. FIDELITY? Blender may use their drawn size for View All.
 */
export function objectWorldBounds(o: SceneObject): Bounds {
  if (o.type !== 'mesh') return { min: o.location, max: o.location };
  const local = PRIMITIVE_LOCAL_BOUNDS[o.primitive];
  const q = objectRotation(o);
  let lo = vec3(Infinity, Infinity, Infinity);
  let hi = vec3(-Infinity, -Infinity, -Infinity);
  for (const cx of [local.min.x, local.max.x]) {
    for (const cy of [local.min.y, local.max.y]) {
      for (const cz of [local.min.z, local.max.z]) {
        const p = add(o.location, rotate(q, mul(vec3(cx, cy, cz), o.scale)));
        lo = min(lo, p);
        hi = max(hi, p);
      }
    }
  }
  return { min: lo, max: hi };
}

export function unionBounds(objects: readonly SceneObject[]): Bounds | null {
  if (objects.length === 0) return null;
  let lo = vec3(Infinity, Infinity, Infinity);
  let hi = vec3(-Infinity, -Infinity, -Infinity);
  for (const o of objects) {
    const b = objectWorldBounds(o);
    lo = min(lo, b.min);
    hi = max(hi, b.max);
  }
  return { min: lo, max: hi };
}

export const findObject = (s: SceneState, id: string | null): SceneObject | undefined =>
  id === null ? undefined : s.objects.find((o) => o.id === id);

export const activeObject = (s: SceneState): SceneObject | undefined => findObject(s, s.activeId);

export const selectedObjects = (s: SceneState): SceneObject[] =>
  s.objects.filter((o) => s.selectedIds.includes(o.id));

export function activeCamera(s: SceneState): CameraObject | undefined {
  const o = findObject(s, s.activeCameraId);
  return o?.type === 'camera' ? o : undefined;
}

export function cameraData(s: SceneState, cam: CameraObject): SceneCameraData {
  return {
    lens: cam.lens,
    sensorWidth: cam.sensorWidth,
    resolutionX: s.render.resolutionX,
    resolutionY: s.render.resolutionY,
  };
}
