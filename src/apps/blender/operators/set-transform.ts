/**
 * Changing one transform value from the N panel (one undo step per change).
 */
import { type Vec3, vec3 } from '../math/vec3';
import { type SceneObject, type SceneState, meshLocalBounds, meshOf } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

export type TransformField = 'location' | 'rotation' | 'scale' | 'dimensions';
export type Axis = 0 | 1 | 2;

const KEYS = ['x', 'y', 'z'] as const;

const withAxis = (v: Vec3, axis: Axis, value: number): Vec3 =>
  vec3(axis === 0 ? value : v.x, axis === 1 ? value : v.y, axis === 2 ? value : v.z);

/** Size of the object's local bounding box (before scale). Cameras and lights: 0. */
export function localSize(o: SceneObject): Vec3 {
  if (o.type !== 'mesh') return vec3(0, 0, 0);
  const b = meshLocalBounds(meshOf(o));
  return vec3(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
}

/** Dimensions as shown in the N panel: local size times scale. FIDELITY? Cameras and lights. */
export function dimensions(o: SceneObject): Vec3 {
  const s = localSize(o);
  return vec3(Math.abs(s.x * o.scale.x), Math.abs(s.y * o.scale.y), Math.abs(s.z * o.scale.z));
}

export function readField(o: SceneObject, field: TransformField, axis: Axis): number {
  const k = KEYS[axis];
  if (field === 'location') return o.location[k];
  if (field === 'rotation') return o.rotationDeg[k];
  if (field === 'scale') return o.scale[k];
  return dimensions(o)[k];
}

/** Returns the object with one value changed (the same object if nothing changes). */
export function writeField(o: SceneObject, field: TransformField, axis: Axis, value: number): SceneObject {
  if (readField(o, field, axis) === value) return o;
  if (field === 'location') return { ...o, location: withAxis(o.location, axis, value) };
  if (field === 'rotation') return { ...o, rotationDeg: withAxis(o.rotationDeg, axis, value) };
  if (field === 'scale') return { ...o, scale: withAxis(o.scale, axis, value) };
  // Dimensions set the scale; objects without size cannot change. Keeps the sign of the scale.
  const size = localSize(o)[KEYS[axis]];
  if (size === 0) return o;
  const sign = o.scale[KEYS[axis]] < 0 ? -1 : 1;
  return { ...o, scale: withAxis(o.scale, axis, (sign * value) / size) };
}

export function setField(s: SceneState, id: string, field: TransformField, axis: Axis, value: number): SceneState {
  let changed = false;
  const objects = s.objects.map((o) => {
    if (o.id !== id) return o;
    const next = writeField(o, field, axis, value);
    changed ||= next !== o;
    return next;
  });
  return changed ? { ...s, objects } : s;
}

/** FIDELITY? Undo History names for property edits. */
const UNDO_NAMES: Record<TransformField, string> = {
  location: 'Location',
  rotation: 'Rotation',
  scale: 'Scale',
  dimensions: 'Dimensions',
};

export const SetTransformOp = (id: string, field: TransformField, axis: Axis, value: number): OperatorCall => ({
  name: UNDO_NAMES[field],
  apply: (s) => setField(s, id, field, axis, value),
});
