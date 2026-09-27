/**
 * Modelling tools at scene level: each one runs on every object in Edit Mode,
 * with that object's selection, and leaves a new selection like Blender does.
 * FIDELITY? Selection after Delete/Dissolve (cleared here).
 */
import { convertSelection, EMPTY_SELECTION, fromBase, topologyOf } from '../edit/selection';
import { rotate } from '../math/quat';
import { type Vec3, normalize, vec3 } from '../math/vec3';
import type { MeshData } from '../mesh/mesh-data';
import { type DeleteType, deleteElements, dissolveEdges, dissolveFaces, dissolveVerts } from '../mesh/ops/delete';
import { extrudeEdges, extrudeRegion, extrudeVerts } from '../mesh/ops/extrude';
import { fill } from '../mesh/ops/fill';
import { type InsetParams, inset } from '../mesh/ops/inset';
import { type MergeType, merge } from '../mesh/ops/merge';
import { loopCut } from '../mesh/ops/loopcut';
import { bevelEdges, bevelVerts, lastFaces } from '../mesh/ops/bevel';
import {
  type ComponentSelection,
  type MeshObject,
  type SceneState,
  meshOf,
  objectRotation,
  selectModeOf,
} from '../scene/scene';
import type { OperatorCall } from '../scene/store';
import { selectionOf } from './edit-mode';

type ToolResult = { mesh: MeshData; selection: ComponentSelection } | null;

/** Runs `fn` on each object in Edit Mode; null results leave the object as it is. */
function onEditObjects(s: SceneState, fn: (o: MeshObject, m: MeshData, sel: ComponentSelection) => ToolResult): SceneState {
  const ids = new Set(s.editObjectIds ?? []);
  let changed = false;
  const objects = s.objects.map((o) => {
    if (o.type !== 'mesh' || !ids.has(o.id)) return o;
    const r = fn(o, meshOf(o), selectionOf(o));
    if (!r) return o;
    changed = true;
    return { ...o, mesh: r.mesh, meshSelection: r.selection };
  });
  return changed ? { ...s, objects } : s;
}

/** A selection of one kind, expressed in the current select mode. */
function selectionFor(s: SceneState, m: MeshData, kind: 'vert' | 'edge' | 'face', elements: readonly number[]): ComponentSelection {
  return convertSelection(m, fromBase(m, kind, elements), selectModeOf(s));
}

/** Object-space normal -> world space (rotation and inverse scale). */
function worldNormal(o: MeshObject, n: Vec3): Vec3 {
  const sn = vec3(n.x / (o.scale.x || 1), n.y / (o.scale.y || 1), n.z / (o.scale.z || 1));
  return normalize(rotate(objectRotation(o), sn));
}

export interface ExtrudeSceneResult {
  readonly scene: SceneState;
  /** World normal of the extruded faces (active object first), when faces were extruded. */
  readonly normal: Vec3 | null;
}

/**
 * Extrude: faces if any are selected (region), otherwise edges, otherwise vertices.
 * The new part stays selected, ready to be moved.
 */
export function extrudeScene(s: SceneState): ExtrudeSceneResult {
  let normal: Vec3 | null = null;
  const scene = onEditObjects(s, (o, m, sel) => {
    const r =
      sel.faces.length > 0
        ? extrudeRegion(m, sel.faces)
        : sel.edges.length > 0
          ? extrudeEdges(m, sel.edges)
          : sel.verts.length > 0
            ? extrudeVerts(m, sel.verts)
            : null;
    if (!r) return null;
    if (r.normal && (!normal || o.id === s.activeId)) normal = worldNormal(o, r.normal);
    return { mesh: r.mesh, selection: selectionFor(s, r.mesh, r.select.kind, r.select.elements) };
  });
  return { scene, normal };
}

/** Inset Faces on the selected faces; the inner faces stay selected. */
export function insetScene(s: SceneState, p: InsetParams): SceneState {
  return onEditObjects(s, (_, m, sel) => {
    if (sel.faces.length === 0) return null;
    const mesh = inset(m, sel.faces, p);
    return { mesh, selection: selectionFor(s, mesh, 'face', sel.faces) };
  });
}

export type DissolveKind = 'verts' | 'edges' | 'faces';

export function deleteScene(s: SceneState, type: DeleteType): SceneState {
  return onEditObjects(s, (_, m, sel) => {
    const any = type === 'verts' ? sel.verts : type === 'edges' ? sel.edges : sel.faces;
    if (any.length === 0) return null;
    return { mesh: deleteElements(m, sel, type), selection: EMPTY_SELECTION };
  });
}

export function dissolveScene(s: SceneState, kind: DissolveKind): SceneState {
  return onEditObjects(s, (_, m, sel) => {
    const list = kind === 'verts' ? sel.verts : kind === 'edges' ? sel.edges : sel.faces;
    if (list.length === 0) return null;
    const mesh = kind === 'verts' ? dissolveVerts(m, list) : kind === 'edges' ? dissolveEdges(m, list) : dissolveFaces(m, list);
    return mesh === m ? null : { mesh, selection: EMPTY_SELECTION };
  });
}

export interface MergeSceneResult {
  readonly scene: SceneState;
  readonly removed: number;
}

export function mergeScene(s: SceneState, type: MergeType, distance?: number): MergeSceneResult {
  let removed = 0;
  const scene = onEditObjects(s, (_, m, sel) => {
    if (sel.verts.length === 0) return null;
    const r = merge(m, sel.verts, type, distance);
    removed += r.removed;
    if (r.removed === 0 && type === 'distance') return null;
    return { mesh: r.mesh, selection: selectionFor(s, r.mesh, 'vert', r.selectVerts) };
  });
  return { scene, removed };
}

/** Make Edge/Face (F) on the active edit object. */
export function fillScene(s: SceneState): SceneState {
  return onEditObjects(s, (o, m, sel) => {
    if (o.id !== s.activeId && (s.editObjectIds?.length ?? 0) > 1) return null;
    const r = fill(m, sel);
    if (!r) return null;
    if (r.created === 'face') return { mesh: r.mesh, selection: selectionFor(s, r.mesh, 'face', [r.mesh.faces.length - 1]) };
    const e = topologyOf(r.mesh).findEdge(sel.verts[0]!, sel.verts[1]!);
    return { mesh: r.mesh, selection: selectionFor(s, r.mesh, 'edge', e === undefined ? [] : [e]) };
  });
}


// ---------------------------------------------------------------------------
// Operator calls. FIDELITY? Undo History names.

export const DeleteOp = (type: DeleteType): OperatorCall => ({ name: 'Delete', apply: (s) => deleteScene(s, type) });

const DISSOLVE_NAMES: Record<DissolveKind, string> = {
  verts: 'Dissolve Vertices',
  edges: 'Dissolve Edges',
  faces: 'Dissolve Faces',
};
export const DissolveOp = (kind: DissolveKind): OperatorCall => ({
  name: DISSOLVE_NAMES[kind],
  apply: (s) => dissolveScene(s, kind),
});

export const MergeOp = (type: MergeType, distance?: number): OperatorCall => ({
  name: type === 'distance' ? 'Merge by Distance' : 'Merge',
  apply: (s) => mergeScene(s, type, distance).scene,
});

export const FillOp: OperatorCall = { name: 'Make Edge/Face', apply: fillScene };

/** Moves the selected vertices of every edit object by a world-space vector. */
export function translateSelection(s: SceneState, v: Vec3): SceneState {
  return onEditObjects(s, (o, m, sel) => {
    if (sel.verts.length === 0) return null;
    const q = objectRotation(o);
    // World vector -> mesh space: inverse rotation, then inverse scale.
    const r = rotate({ w: q.w, x: -q.x, y: -q.y, z: -q.z }, v);
    const local = vec3(r.x / (o.scale.x || 1), r.y / (o.scale.y || 1), r.z / (o.scale.z || 1));
    const verts = [...m.verts];
    for (const i of sel.verts) {
      const p = verts[i]!;
      verts[i] = vec3(p.x + local.x, p.y + local.y, p.z + local.z);
    }
    return { mesh: { ...m, verts }, selection: sel };
  });
}

// ---------------------------------------------------------------------------
// Loop Cut and Bevel

/** Loop Cut on one object through one edge; the new loops end up selected. */
export function loopCutScene(s: SceneState, objectId: string, edge: number, cuts: number, factor: number): SceneState {
  return onEditObjects(s, (o, m) => {
    if (o.id !== objectId) return null;
    const r = loopCut(m, edge, cuts, factor);
    return { mesh: r.mesh, selection: selectionFor(s, r.mesh, 'edge', r.newEdges) };
  });
}

export interface BevelSceneResult {
  readonly scene: SceneState;
  /** Some object had a selection this lab's bevel does not support. */
  readonly unsupported: boolean;
}

/** Bevel the selected edges (or vertices) of every edit object; the new faces end up selected. */
export function bevelScene(s: SceneState, width: number, segments: number, vertices: boolean): BevelSceneResult {
  let unsupported = false;
  const scene = onEditObjects(s, (_, m, sel) => {
    const list = vertices ? sel.verts : sel.edges;
    if (list.length === 0) return null;
    const mesh = vertices ? bevelVerts(m, list, width) : bevelEdges(m, list, width, segments);
    if (!mesh) {
      unsupported = true;
      return null;
    }
    const created = vertices ? list.length : list.length * segments;
    return { mesh, selection: selectionFor(s, mesh, 'face', lastFaces(mesh, created)) };
  });
  return { scene, unsupported };
}
