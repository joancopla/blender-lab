/**
 * Shader Editor operations on a material's node tree, as undoable operators. The
 * tree functions (shading/tree.ts) do the work; this wraps them with Blender's
 * undo names (ot->name in source/blender/editors/space_node/*.cc, Blender 5.2.1).
 */
import type { Material, SceneState } from '../scene/scene';
import type { OperatorCall } from '../scene/store';
import type { PropValue, Props } from '../shading/node-types';
import type { SocketValue } from '../shading/sockets';
import * as T from '../shading/tree';
import type { NodeTree, Point, SocketRef } from '../shading/tree';

export const materialById = (s: SceneState, id: string): Material | undefined => s.materials?.find((m) => m.id === id);

/** Runs `edit` on one material's tree; no undo step if nothing changes. */
export function editTree(name: string, materialId: string, edit: (t: NodeTree) => NodeTree): OperatorCall {
  return {
    name,
    apply(s) {
      const m = materialById(s, materialId);
      if (!m) return s;
      const tree = edit(m.tree);
      if (tree === m.tree) return s;
      return { ...s, materials: s.materials!.map((x) => (x.id === materialId ? { ...x, tree } : x)) };
    },
  };
}

/** Shift+A (NODE_OT_add_node, bl_label "Add Node"). */
export const addNodeOp = (materialId: string, type: string, at: Point, props?: Props) =>
  editTree('Add Node', materialId, (t) => T.addNode(t, type, at, props).tree);

/** Dragging from a socket to another (NODE_OT_link). */
export const linkOp = (materialId: string, from: SocketRef, to: SocketRef) => editTree('Link Nodes', materialId, (t) => T.connect(t, from, to));

/** Dragging a link off an input (also NODE_OT_link). */
export const unlinkOp = (materialId: string, linkId: string) => editTree('Link Nodes', materialId, (t) => T.disconnect(t, linkId));

/** Ctrl + right-drag (NODE_OT_links_cut). */
export const cutLinksOp = (materialId: string, linkIds: readonly string[]) =>
  editTree('Cut Links', materialId, (t) => (linkIds.length ? T.cutLinks(t, linkIds) : t));

/** G (transform, "Move"). */
export const moveNodesOp = (materialId: string, ids: readonly string[], dx: number, dy: number) =>
  editTree('Move', materialId, (t) => (dx === 0 && dy === 0 ? t : T.moveNodes(t, ids, dx, dy)));

/** X (NODE_OT_delete). */
export const deleteNodesOp = (materialId: string, ids: readonly string[]) => editTree('Delete', materialId, (t) => (ids.length ? T.removeNodes(t, ids) : t));

/** Ctrl+X (NODE_OT_delete_reconnect). */
export const dissolveNodesOp = (materialId: string, ids: readonly string[]) =>
  editTree('Delete with Reconnect', materialId, (t) => (ids.length ? T.dissolveNodes(t, ids) : t));

/** Shift+D (NODE_OT_duplicate). */
export const duplicateNodesOp = (materialId: string, ids: readonly string[], offset: Point) =>
  editTree('Duplicate Nodes', materialId, (t) => (ids.length ? T.duplicateNodes(t, ids, offset).tree : t));

/** Dropping a node on a link while moving it (the move confirms with the insert). */
export const insertOnLinkOp = (materialId: string, nodeId: string, linkId: string) => editTree('Move', materialId, (t) => T.insertOnLink(t, nodeId, linkId));

/** M (NODE_OT_mute_toggle). */
export const muteOp = (materialId: string, ids: readonly string[]) => editTree('Toggle Node Mute', materialId, (t) => (ids.length ? T.toggleMute(t, ids) : t));

/** H (NODE_OT_hide_toggle, called "Collapse" in 5.2). */
export const collapseOp = (materialId: string, ids: readonly string[]) => editTree('Collapse', materialId, (t) => (ids.length ? T.toggleCollapse(t, ids) : t));

/** Ctrl+H (NODE_OT_hide_socket_toggle). */
export const hideSocketsOp = (materialId: string, ids: readonly string[]) =>
  editTree('Toggle Hidden Node Sockets', materialId, (t) => (ids.length ? T.toggleHideUnused(t, ids) : t));

/** A value typed or dragged on a node (or in the Surface panel). FIDELITY? Blender names the step after the property. */
export const setValueOp = (materialId: string, nodeId: string, socket: string, value: SocketValue) =>
  editTree(socket, materialId, (t) => T.setValue(t, nodeId, socket, value));

/** An option on a node (Mix data type, Noise dimensions...). */
export const setPropOp = (materialId: string, nodeId: string, prop: string, value: PropValue) =>
  editTree(prop, materialId, (t) => T.setProp(t, nodeId, prop, value));
