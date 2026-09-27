/**
 * Blender-like infinite grid with axis lines.
 *
 * Perspective / User views: the floor grid on the XY plane, depth-tested.
 * Axis-aligned orthographic views: a grid on the view plane, drawn behind
 * everything (see Renderer for the pass order).
 * FIDELITY? Number of subdivision levels, fade distance and line widths.
 */
import * as THREE from 'three';
import type { AxisView } from './view-state';
import { OVERLAY_AXES, THEME } from './theme';

const vertexShader = /* glsl */ `
  varying vec2 vPlane;
  varying vec3 vViewPos;
  uniform vec2 uOffset;
  void main() {
    vPlane = position.xy + uOffset;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vPlane;
  varying vec3 vViewPos;
  uniform vec3 uGridColor;
  uniform float uGridAlpha;
  uniform vec3 uAxisUColor; // colour of the line along the plane's U axis (where v = 0)
  uniform vec3 uAxisVColor; // colour of the line along the plane's V axis (where u = 0)
  uniform float uShowAxisU;
  uniform float uShowAxisV;
  uniform float uFadeDistance; // 0 disables distance fade (orthographic)

  // Anti-aliased line coverage for a grid of the given spacing.
  float gridLines(vec2 p, float spacing) {
    vec2 coord = p / spacing;
    vec2 w = fwidth(coord);
    vec2 g = abs(fract(coord - 0.5) - 0.5) / max(w, vec2(1e-6));
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  float axisLine(float c, float widthPx) {
    float w = fwidth(c);
    return 1.0 - smoothstep(0.0, widthPx * w, abs(c));
  }

  void main() {
    // Metres per pixel on the plane at this fragment.
    vec2 fw = fwidth(vPlane);
    float footprint = max(max(fw.x, fw.y), 1e-6);
    // Smallest power of ten whose lines are at least ~10 px apart.
    float lod = log(footprint * 10.0) / log(10.0);
    float level = ceil(lod);
    float fade = 1.0 - fract(lod); // how "wide" the finest visible level is
    float s0 = pow(10.0, level);
    float a = gridLines(vPlane, s0) * fade;
    a = max(a, gridLines(vPlane, s0 * 10.0));
    a *= uGridAlpha;

    vec3 color = uGridColor;
    float axisU = axisLine(vPlane.y, 1.5) * uShowAxisU;
    float axisV = axisLine(vPlane.x, 1.5) * uShowAxisV;
    color = mix(color, uAxisUColor, axisU);
    a = max(a, axisU);
    color = mix(color, uAxisVColor, axisV);
    a = max(a, axisV);

    if (uFadeDistance > 0.0) {
      float d = length(vViewPos);
      a *= 1.0 - smoothstep(uFadeDistance * 0.35, uFadeDistance, d);
    }
    if (a <= 0.002) discard;
    gl_FragColor = vec4(color, a);
    #include <colorspace_fragment>
  }
`;

const PLANE_SIZE = 4000;

export class Grid {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly uniforms = {
    uOffset: { value: new THREE.Vector2() },
    uGridColor: { value: new THREE.Color(THEME.gridLine) },
    uGridAlpha: { value: 1 },
    uAxisUColor: { value: new THREE.Color(THEME.axisX) },
    uAxisVColor: { value: new THREE.Color(THEME.axisY) },
    uShowAxisU: { value: 1 },
    uShowAxisV: { value: 1 },
    uFadeDistance: { value: 0 },
  };

  constructor() {
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE), material);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Grid';
  }

  /**
   * Places the grid for the current view. `center` (Blender space) keeps the
   * plane under the view so precision stays good far from the origin.
   */
  update(axisView: AxisView | null, orthographic: boolean, center: THREE.Vector3, viewDistance: number): void {
    const m = this.mesh;
    const u = this.uniforms;
    const axisOrtho = orthographic && axisView !== null;
    m.material.depthTest = !axisOrtho;

    let plane: 'xy' | 'xz' | 'yz' = 'xy';
    if (axisOrtho && (axisView === 'front' || axisView === 'back')) plane = 'xz';
    if (axisOrtho && (axisView === 'right' || axisView === 'left')) plane = 'yz';

    // The plane's local (u, v) maps to two Blender axes.
    const colors = { x: THEME.axisX, y: THEME.axisY, z: THEME.axisZ };
    const show = OVERLAY_AXES;
    const [a, b] = plane === 'xy' ? (['x', 'y'] as const) : plane === 'xz' ? (['x', 'z'] as const) : (['y', 'z'] as const);
    u.uAxisUColor.value.set(colors[a]);
    u.uAxisVColor.value.set(colors[b]);
    u.uShowAxisU.value = show[a] ? 1 : 0;
    u.uShowAxisV.value = show[b] ? 1 : 0;

    const snap = (v: number) => Math.round(v / 100) * 100;
    if (plane === 'xy') {
      m.rotation.set(0, 0, 0, 'XYZ');
      m.position.set(snap(center.x), snap(center.y), 0);
      u.uOffset.value.set(m.position.x, m.position.y);
    } else if (plane === 'xz') {
      m.rotation.set(Math.PI / 2, 0, 0, 'XYZ'); // local Y -> Blender Z
      m.position.set(snap(center.x), 0, snap(center.z));
      u.uOffset.value.set(m.position.x, m.position.z);
    } else {
      // Rx(90) then Rz(90): local X -> Blender Y, local Y -> Blender Z.
      m.rotation.set(Math.PI / 2, 0, Math.PI / 2, 'ZYX');
      m.position.set(0, snap(center.y), snap(center.z));
      u.uOffset.value.set(m.position.y, m.position.z);
    }
    u.uFadeDistance.value = orthographic ? 0 : Math.max(viewDistance * 8, 60);
  }
}
