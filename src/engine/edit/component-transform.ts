/**
 * G / R / S on Edit Mode components, reusing the object TransformModal.
 *
 * Each selected vertex is handed to TransformModal as a "point object" at its
 * world position, oriented like its object. The modal moves, rotates and scales
 * those points around their Median Point exactly as it does with objects, so
 * constraints, numeric input, Ctrl, Shift and cancel behave the same. "Local"
 * means the object's orientation, as in Blender's Edit Mode.
 * The resulting world positions are written back into the meshes.
 */
import { quatToEulerXYZ } from '../math/euler';
import { DEG, type Quat, conjugate, fromAxisAngle, rotate } from '../math/quat';
import { type Vec3, AXIS_Z, add, cross, dot, length, mul, normalize, sub, vec3 } from '../math/vec3';
import type { MeshData } from '../mesh/mesh-data';
import { selectionOf } from '../operators/edit-mode';
import {
  type ModalResult,
  type TransformKind,
  TransformModal,
  type TransformOptions,
} from '../operators/transform';
import { type MeshObject, type SceneState, meshOf, objectRotation } from '../scene/scene';
import type { ModalOperator } from '../transform-session';
import type { ViewportSize } from '../viewport/projection';
import type { ViewProjection } from '../viewport/screen';

interface PointRef {
  readonly objectId: string;
  readonly vert: number;
}

const toWorld = (o: MeshObject, q: Quat, p: Vec3) => add(o.location, rotate(q, mul(p, o.scale)));

function toLocal(o: MeshObject, q: Quat, p: Vec3): Vec3 {
  const r = rotate(conjugate(q), sub(p, o.location));
  return vec3(r.x / (o.scale.x || 1), r.y / (o.scale.y || 1), r.z / (o.scale.z || 1));
}

/** Rotation (as XYZ Euler degrees) whose local Z points along the unit vector `n`. */
function eulerFacing(n: Vec3): Vec3 {
  const axis = cross(AXIS_Z, n);
  const s = length(axis);
  const c = dot(AXIS_Z, n);
  // Parallel: identity, or half a turn around X when pointing down.
  const q: Quat = s > 1e-9 ? fromAxisAngle(normalize(axis), Math.atan2(s, c)) : fromAxisAngle(vec3(1, 0, 0), c < 0 ? Math.PI : 0);
  const e = quatToEulerXYZ(q);
  return vec3(e.x / DEG, e.y / DEG, e.z / DEG);
}

export interface ComponentTransformOptions extends TransformOptions {
  /**
   * Orientation for "local" constraints: Z along this world direction
   * (Extrude moves along the region's normal). Default: each object's orientation.
   */
  readonly normal?: Vec3;
  /** Recorded if the operator is cancelled (Extrude keeps the new geometry). */
  readonly cancelState?: SceneState;
}

export class ComponentTransform implements ModalOperator {
  private readonly modal: TransformModal;
  private readonly points: PointRef[] = [];
  readonly cancelState?: SceneState;

  constructor(
    kind: TransformKind,
    private readonly scene: SceneState,
    vp: ViewProjection,
    size: ViewportSize,
    mouse: { x: number; y: number },
    options: ComponentTransformOptions = {},
  ) {
    this.cancelState = options.cancelState;
    const ids = new Set(scene.editObjectIds ?? []);
    const pointObjects: MeshObject[] = [];
    for (const o of scene.objects) {
      if (o.type !== 'mesh' || !ids.has(o.id)) continue;
      const q = objectRotation(o);
      const m = meshOf(o);
      const rotationDeg = options.normal ? eulerFacing(normalize(options.normal)) : o.rotationDeg;
      for (const v of selectionOf(o).verts) {
        this.points.push({ objectId: o.id, vert: v });
        pointObjects.push({
          id: `${o.id}#${v}`,
          name: `${o.name}#${v}`,
          type: 'mesh',
          primitive: 'cube',
          location: toWorld(o, q, m.verts[v]!),
          rotationDeg,
          scale: vec3(1, 1, 1),
        });
      }
    }
    const pointScene: SceneState = {
      ...scene,
      objects: pointObjects,
      selectedIds: pointObjects.map((p) => p.id),
      activeId: null,
    };
    this.modal = new TransformModal(kind, pointScene, vp, size, mouse, options);
  }

  /** G / R / S need at least one selected vertex in Edit Mode. */
  static canStart(scene: SceneState): boolean {
    const ids = new Set(scene.editObjectIds ?? []);
    return scene.objects.some((o) => o.type === 'mesh' && ids.has(o.id) && selectionOf(o).verts.length > 0);
  }

  get operatorName(): string {
    return this.modal.operatorName;
  }

  get header(): string {
    return this.modal.header;
  }

  get guides() {
    return this.modal.guides;
  }

  /** The real scene with the moved vertices. */
  get preview(): SceneState {
    const moved = new Map<string, Vec3>();
    for (const p of this.modal.preview.objects) moved.set(p.id, p.location);
    return {
      ...this.scene,
      objects: this.scene.objects.map((o) => {
        if (o.type !== 'mesh') return o;
        const mine = this.points.filter((p) => p.objectId === o.id);
        if (mine.length === 0) return o;
        const q = objectRotation(o);
        const m: MeshData = meshOf(o);
        const verts = [...m.verts];
        for (const p of mine) {
          const w = moved.get(`${o.id}#${p.vert}`);
          if (w) verts[p.vert] = toLocal(o, q, w);
        }
        return { ...o, mesh: { ...m, verts } };
      }),
    };
  }

  mouseMove(x: number, y: number): void {
    this.modal.mouseMove(x, y);
  }

  setModifiers(ctrl: boolean, shift: boolean): void {
    this.modal.setModifiers(ctrl, shift);
  }

  key(code: string, shift: boolean): ModalResult {
    return this.modal.key(code, shift);
  }

  button(button: number): ModalResult {
    return this.modal.button(button);
  }
}
