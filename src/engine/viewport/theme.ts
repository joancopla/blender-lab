/**
 * Colours of Blender's default theme used by the viewport.
 * FIDELITY? Hex values remembered from the 2.8–4.x default theme; to be checked in
 * Preferences > Themes > 3D Viewport / User Interface on 5.2.
 */
export const THEME = {
  viewportBackground: '#3d3d3d',
  gridLine: '#545454',
  axisX: '#ff3352',
  axisY: '#8bdc00',
  axisZ: '#2890ff',
  /** Unselected wire (cameras and lights) in Object Mode. */
  wire: '#000000',
  /** Solid shading object colour (0.8 linear grey). */
  solidObjectLinear: 0.8,
  viewportText: '#ffffff',
} as const;

/** Overlays > Guides defaults: X and Y axis lines visible, Z hidden. FIDELITY? */
export const OVERLAY_AXES = { x: true, y: true, z: false } as const;
