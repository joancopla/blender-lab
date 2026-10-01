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
import type { Modifier } from '../modifiers/types';
import type { NodeTree } from '../shading/tree';

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
  /** Modifier stack, evaluated in order (see modifiers/stack.ts). Missing: none. */
  readonly modifiers?: readonly Modifier[];
  /**
   * Object Data > Normals > Auto Smooth and its angle (degrees). In Blender they
   * belong to the mesh data; kept on the object here, since each object has its
   * own mesh, so mesh operations need not carry them. Missing: off, 30°.
   */
  readonly autoSmooth?: boolean;
  readonly autoSmoothAngleDeg?: number;
  /** Material slots (Properties > Material): material ids, null for an empty slot. Missing: none. */
  readonly materialSlots?: readonly (string | null)[];
}

/** A material (Lab 05): its name and its shader node tree. */
export interface Material {
  readonly id: string;
  /** Unique name: "Material", "Material.001"... */
  readonly name: string;
  readonly tree: NodeTree;
}

/** Default Auto Smooth angle, in degrees. */
export const DEFAULT_AUTO_SMOOTH_ANGLE_DEG = 30;

/** The Auto Smooth angle when Auto Smooth is on, else null. */
export const autoSmoothAngle = (o: MeshObject): number | null =>
  o.autoSmooth ? (o.autoSmoothAngleDeg ?? DEFAULT_AUTO_SMOOTH_ANGLE_DEG) : null;

export interface CameraObject extends ObjectBase {
  readonly type: 'camera';
  readonly lens: number;
  readonly sensorWidth: number;
}

/** Blender's light types (bpy: light.type). */
export type LightType = 'POINT' | 'SUN' | 'SPOT' | 'AREA';
export type AreaShape = 'SQUARE' | 'RECTANGLE' | 'DISK' | 'ELLIPSE';

/**
 * A light. Field names follow Blender's Python API (energy, shadow_soft_size...).
 * Lights shine along their local -Z axis (Sun, Spot and Area); a Point shines
 * all around. Missing fields take Blender's defaults (LIGHT_DEFAULTS).
 */
export interface LightObject extends ObjectBase {
  readonly type: 'light';
  readonly lightType: LightType;
  /** Linear RGB, 0..1. */
  readonly color?: Vec3;
  /** Power in W (Point, Spot, Area); Strength in W/m² (Sun). */
  readonly energy?: number;
  /** Radius, metres (Point, Spot): the size of the source, for soft shadows. */
  readonly shadowSoftSize?: number;
  /** Angle, degrees (Sun): the apparent size of the sun. */
  readonly angleDeg?: number;
  /** Spot Size, degrees: the full angle of the cone. */
  readonly spotSizeDeg?: number;
  /** Spot Blend, 0..1: how soft the edge of the cone is. */
  readonly spotBlend?: number;
  readonly shape?: AreaShape;
  /** Size (X), metres (Area). */
  readonly size?: number;
  /** Size Y, metres (Area, Rectangle and Ellipse). */
  readonly sizeY?: number;
  /** Cast Shadow. */
  readonly useShadow?: boolean;
}

/** Everything about a light, with the defaults filled in. */
export type LightData = Required<Omit<LightObject, keyof ObjectBase | 'type'>>;

/**
 * Blender's values for a new light of each type (Add > Light).
 * FIDELITY? Defaults in Blender 5.2 (Power, Radius, Angle, Spot Size and Blend, Area Size).
 */
export const LIGHT_DEFAULTS: Record<LightType, Omit<LightData, 'lightType'>> = {
  POINT: { color: vec3(1, 1, 1), energy: 1000, shadowSoftSize: 0.1, angleDeg: 0.526, spotSizeDeg: 45, spotBlend: 0.15, shape: 'SQUARE', size: 1, sizeY: 1, useShadow: true },
  SUN: { color: vec3(1, 1, 1), energy: 1, shadowSoftSize: 0.1, angleDeg: 0.526, spotSizeDeg: 45, spotBlend: 0.15, shape: 'SQUARE', size: 1, sizeY: 1, useShadow: true },
  SPOT: { color: vec3(1, 1, 1), energy: 1000, shadowSoftSize: 0.1, angleDeg: 0.526, spotSizeDeg: 45, spotBlend: 0.15, shape: 'SQUARE', size: 1, sizeY: 1, useShadow: true },
  AREA: { color: vec3(1, 1, 1), energy: 1000, shadowSoftSize: 0.1, angleDeg: 0.526, spotSizeDeg: 45, spotBlend: 0.15, shape: 'SQUARE', size: 1, sizeY: 1, useShadow: true },
};

/** The light's settings, with Blender's defaults for what is not set. */
export function lightData(o: LightObject): LightData {
  const d = LIGHT_DEFAULTS[o.lightType];
  return {
    lightType: o.lightType,
    color: o.color ?? d.color,
    energy: o.energy ?? d.energy,
    shadowSoftSize: o.shadowSoftSize ?? d.shadowSoftSize,
    angleDeg: o.angleDeg ?? d.angleDeg,
    spotSizeDeg: o.spotSizeDeg ?? d.spotSizeDeg,
    spotBlend: o.spotBlend ?? d.spotBlend,
    shape: o.shape ?? d.shape,
    size: o.size ?? d.size,
    sizeY: o.sizeY ?? d.sizeY,
    useShadow: o.useShadow ?? d.useShadow,
  };
}

/**
 * World > Surface: a uniform background colour and its Strength (the lab has
 * no HDRI in the World yet). Missing: Blender's default grey.
 * FIDELITY? Default world colour (0.0509 linear) and Strength 1.
 */
export interface WorldSettings {
  /** Linear RGB. */
  readonly color: Vec3;
  readonly strength: number;
}

export const DEFAULT_WORLD: WorldSettings = { color: vec3(0.0509, 0.0509, 0.0509), strength: 1 };

export const worldOf = (s: SceneState): WorldSettings => s.world ?? DEFAULT_WORLD;

/**
 * Render > Color Management: the View Transform and Exposure (stops) used by
 * Material Preview and Rendered. Missing: AgX, 0.
 * FIDELITY? Blender 5.2's View Transform list and Looks; the lab has AgX and Standard.
 */
export interface ColorManagement {
  readonly viewTransform: 'AgX' | 'Standard';
  readonly exposure: number;
}

export const DEFAULT_COLOR_MANAGEMENT: ColorManagement = { viewTransform: 'AgX', exposure: 0 };

export const colorManagementOf = (s: SceneState): ColorManagement => s.colorManagement ?? DEFAULT_COLOR_MANAGEMENT;

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
  /** World settings; missing: DEFAULT_WORLD. */
  readonly world?: WorldSettings;
  /** Render > Color Management; missing: DEFAULT_COLOR_MANAGEMENT. */
  readonly colorManagement?: ColorManagement;
  /** Objects in Edit Mode; empty or missing: Object Mode. */
  readonly editObjectIds?: readonly string[];
  /** Edit Mode select mode (tool setting, shared by all meshes). */
  readonly selectMode?: SelectMode;
  /** Materials of the file (Lab 05); missing: none. */
  readonly materials?: readonly Material[];
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

/** The mesh a mesh object is measured with (e.g. the modifiers' result). */
export type MeshMeasure = (o: MeshObject) => MeshData;

/**
 * World-space axis-aligned bounds. Cameras and lights count as a point at their
 * location. FIDELITY? Blender may use their drawn size for View All.
 * `measure` gives the mesh to use (by default the base mesh).
 */
export function objectWorldBounds(o: SceneObject, measure: MeshMeasure = meshOf): Bounds {
  if (o.type !== 'mesh') return { min: o.location, max: o.location };
  const local = meshLocalBounds(measure(o));
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

export function unionBounds(objects: readonly SceneObject[], measure: MeshMeasure = meshOf): Bounds | null {
  if (objects.length === 0) return null;
  let lo = vec3(Infinity, Infinity, Infinity);
  let hi = vec3(-Infinity, -Infinity, -Infinity);
  for (const o of objects) {
    const b = objectWorldBounds(o, measure);
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
