/**
 * Scene data model: the single source of truth. Everything is in Blender units
 * (metres, degrees, Z up). The viewport and the UI only reflect it.
 *
 * Every change goes through an operator (see store.ts), so undo always works.
 */
import { DEG, type Quat, fromEulerXYZ, rotate } from '../math/quat';
import { type Vec3, add, max, min, mul, vec3 } from '../math/vec3';
import type { Bounds, SceneCameraData } from '../viewport/view-state';
import type { MeshData } from '../mesh/mesh-data';
import { primitiveMesh } from '../mesh/primitives';

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

/** Selected components of a mesh (kept when leaving Edit Mode, as in Blender). */
export interface ComponentSelection {
  readonly verts: readonly number[];
  readonly edges: readonly number[];
  readonly faces: readonly number[];
  /** Last clicked element, drawn highlighted (Blender's select history). */
  readonly active: { readonly kind: 'vert' | 'edge' | 'face'; readonly index: number } | null;
}

export interface MeshObject extends ObjectBase {
  readonly type: 'mesh';
  /** The primitive it was created from. */
  readonly primitive: PrimitiveKind;
  /** Mesh data once edited; until then, the primitive's mesh. Use meshOf(). */
  readonly mesh?: MeshData;
  /** Edit Mode selection; undefined means everything selected (new primitives). */
  readonly meshSelection?: ComponentSelection;
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

/** Vertex / Edge / Face select mode (several can be on). */
export interface SelectMode {
  readonly vert: boolean;
  readonly edge: boolean;
  readonly face: boolean;
}

export const DEFAULT_SELECT_MODE: SelectMode = { vert: true, edge: false, face: false };

export interface SceneState {
  readonly objects: readonly SceneObject[];
  readonly selectedIds: readonly string[];
  readonly activeId: string | null;
  readonly activeCameraId: string | null;
  readonly render: { readonly resolutionX: number; readonly resolutionY: number };
  /** Objects in Edit Mode; empty or missing: Object Mode. */
  readonly editObjectIds?: readonly string[];
  /** Edit Mode select mode (tool setting, shared by all meshes). */
  readonly selectMode?: SelectMode;
}

export const isEditMode = (s: SceneState): boolean => (s.editObjectIds?.length ?? 0) > 0;
export const selectModeOf = (s: SceneState): SelectMode => s.selectMode ?? DEFAULT_SELECT_MODE;

const primitiveMeshes = new Map<PrimitiveKind, MeshData>();

/** The object's mesh data: edited mesh, or the primitive's (shared, cached). */
export function meshOf(o: MeshObject): MeshData {
  if (o.mesh) return o.mesh;
  let m = primitiveMeshes.get(o.primitive);
  if (!m) {
    m = primitiveMesh(o.primitive);
    primitiveMeshes.set(o.primitive, m);
  }
  return m;
}

const localBoundsCache = new WeakMap<MeshData, Bounds>();

/** Bounding box of a mesh in its own (object local) space. */
export function meshLocalBounds(m: MeshData): Bounds {
  let b = localBoundsCache.get(m);
  if (!b) {
    let lo = vec3(Infinity, Infinity, Infinity);
    let hi = vec3(-Infinity, -Infinity, -Infinity);
    for (const v of m.verts) {
      lo = min(lo, v);
      hi = max(hi, v);
    }
    b = m.verts.length ? { min: lo, max: hi } : { min: vec3(0, 0, 0), max: vec3(0, 0, 0) };
    localBoundsCache.set(m, b);
  }
  return b;
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
  const local = meshLocalBounds(meshOf(o));
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
