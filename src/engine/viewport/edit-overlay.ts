/**
 * Edit Mode overlay of one mesh: edges, vertices (vertex select mode), selected
 * face tint and face dots (face mode with X-ray), in the object's local space.
 * FIDELITY? Colours and sizes from Blender's default theme (3D Viewport).
 */
import * as THREE from 'three';
import { faceCenter, triangulateFace } from '../mesh/geometry';
import type { MeshData } from '../mesh/mesh-data';
import type { ComponentSelection, SelectMode } from '../scene/scene';

export const EDIT_THEME = {
  wireEdit: '#000000',
  edgeSelect: '#ffa000',
  vertex: '#000000',
  vertexSelect: '#ff8500',
  active: '#ffffff',
  faceSelect: '#ffa500',
  faceSelectAlpha: 0.2,
  faceDot: '#000000',
  faceDotSelect: '#ff8500',
  /** Vertex Size, px. */
  vertexSize: 6,
  faceDotSize: 5,
} as const;

const pointsVertex = /* glsl */ `
  attribute vec3 color;
  uniform float uSize;
  varying vec3 vColor;
  void main() {
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize;
  }
`;
const pointsFragment = /* glsl */ `
  varying vec3 vColor;
  void main() {
    // Round points, like Blender's vertices.
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    gl_FragColor = vec4(vColor, 1.0);
    #include <colorspace_fragment>
  }
`;

function pointsMaterial(size: number, xray: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size } },
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    depthTest: !xray,
  });
}

const colorOf = (hex: string) => new THREE.Color(hex);

export interface EditOverlayOptions {
  readonly mode: SelectMode;
  readonly xray: boolean;
  /** Device pixel ratio, so point sizes stay in CSS pixels. */
  readonly pixelRatio: number;
  /** Only the active edit object shows its active element. */
  readonly showActive: boolean;
}

/** Builds the overlay group; call again when the mesh, selection or options change. */
export function buildEditOverlay(m: MeshData, sel: ComponentSelection, opts: EditOverlayOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = 'EditOverlay';
  const selVerts = new Set(sel.verts);
  const selEdges = new Set(sel.edges);
  const selFaces = new Set(sel.faces);
  const active = opts.showActive ? sel.active : null;

  // Selected face tint.
  const tint: number[] = [];
  for (const f of selFaces) {
    for (const tri of triangulateFace(m, f)) for (const v of tri) tint.push(m.verts[v]!.x, m.verts[v]!.y, m.verts[v]!.z);
  }
  if (tint.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tint, 3));
    const mat = new THREE.MeshBasicMaterial({
      color: EDIT_THEME.faceSelect,
      transparent: true,
      opacity: EDIT_THEME.faceSelectAlpha,
      depthWrite: false,
      depthTest: !opts.xray,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    group.add(new THREE.Mesh(g, mat));
  }

  // Edges.
  const edgePos: number[] = [];
  const edgeCol: number[] = [];
  m.edges.forEach(([a, b], i) => {
    const isActive = active?.kind === 'edge' && active.index === i;
    const c = colorOf(isActive ? EDIT_THEME.active : selEdges.has(i) ? EDIT_THEME.edgeSelect : EDIT_THEME.wireEdit);
    for (const v of [a, b]) {
      edgePos.push(m.verts[v]!.x, m.verts[v]!.y, m.verts[v]!.z);
      edgeCol.push(c.r, c.g, c.b);
    }
  });
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  eg.setAttribute('color', new THREE.Float32BufferAttribute(edgeCol, 3));
  group.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: !opts.xray })));

  // Vertices (vertex select mode only).
  if (opts.mode.vert) {
    const pos: number[] = [];
    const col: number[] = [];
    m.verts.forEach((p, i) => {
      const isActive = active?.kind === 'vert' && active.index === i;
      const c = colorOf(isActive ? EDIT_THEME.active : selVerts.has(i) ? EDIT_THEME.vertexSelect : EDIT_THEME.vertex);
      pos.push(p.x, p.y, p.z);
      col.push(c.r, c.g, c.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    group.add(new THREE.Points(g, pointsMaterial(EDIT_THEME.vertexSize * opts.pixelRatio, opts.xray)));
  }

  // Face dots: face mode with X-ray. FIDELITY?
  if (opts.mode.face && opts.xray) {
    const pos: number[] = [];
    const col: number[] = [];
    m.faces.forEach((_, f) => {
      const c = faceCenter(m, f);
      const isActive = active?.kind === 'face' && active.index === f;
      const k = colorOf(isActive ? EDIT_THEME.active : selFaces.has(f) ? EDIT_THEME.faceDotSelect : EDIT_THEME.faceDot);
      pos.push(c.x, c.y, c.z);
      col.push(k.r, k.g, k.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    group.add(new THREE.Points(g, pointsMaterial(EDIT_THEME.faceDotSize * opts.pixelRatio, true)));
  }

  // Draw on top of the solid mesh they belong to.
  group.traverse((o) => (o.renderOrder = 2));
  return group;
}

export function disposeGroup(g: THREE.Object3D): void {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
}
