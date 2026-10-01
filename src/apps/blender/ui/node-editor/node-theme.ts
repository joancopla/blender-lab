/**
 * Shader Editor colours of Blender 5.2's default theme
 * (release/datafiles/userdef/userdef_default_theme.c, space_node) and the socket
 * colours (std_node_socket_colors in source/blender/editors/space_node/drawnode.cc).
 * Header colour per node class: node_get_colorid in node_draw.cc and
 * UI_GetThemeColor in editors/interface/resources.cc.
 */
import type { NodeClass } from '../../shading/node-types';
import type { SocketType } from '../../shading/sockets';

export const NODE_EDITOR_THEME = {
  /** space_node.back */
  background: '#1a1a1a',
  /** space_node.grid (dots) */
  grid: '#303030',
  /** TH_NODE: space_node.syntaxl */
  nodeBody: '#303030',
  /** space_node.node_outline (#ffffff26) */
  nodeOutline: 'rgba(255, 255, 255, 0.15)',
  /** TH_SELECT for nodes: space_node.select */
  selected: '#ed5700',
  /** TH_ACTIVE: space_node.active */
  active: '#ffffff',
  /** space_node.wire: outline under links */
  wire: '#1a1a1a',
  /** space_node.edge_select (#ffffffb3): links of selected nodes */
  wireSelected: 'rgba(255, 255, 255, 0.7)',
  text: '#e6e6e6',
} as const;

/** Header colours: input syntaxn, output nodeclass_output, shader nodeclass_shader, texture nodeclass_texture,
 * color syntaxb, vector nodeclass_vector, converter syntaxv. */
export const NODE_CLASS_COLORS: Readonly<Record<NodeClass, string>> = {
  input: '#82354c',
  output: '#3e232a',
  shader: '#2b652b',
  texture: '#79461d',
  color: '#6e6e23',
  vector: '#3c3c83',
  converter: '#246283',
};

const rgb = (r: number, g: number, b: number) => `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

export const SOCKET_COLORS: Readonly<Record<SocketType, string>> = {
  float: rgb(0.63, 0.63, 0.63),
  vector: rgb(0.39, 0.39, 0.78),
  color: rgb(0.78, 0.78, 0.16),
  shader: rgb(0.39, 0.78, 0.39),
  bool: rgb(0.8, 0.65, 0.84),
};

/** Links that Blender draws red (invalid type, loops). FIDELITY? exact red. */
export const INVALID_LINK = '#e64040';
