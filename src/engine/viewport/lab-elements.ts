/**
 * Lab elements drawn in the 3D view: ghost silhouettes (where an object must go)
 * and face markers (stage 1). They are not scene objects: not in the Outliner,
 * not selectable, not part of the selection passes. Lab style, not Blender's.
 */
import * as THREE from 'three';
import { setObjectLocation, setObjectRotation } from '../coords';
import { DEG, fromEulerXYZ } from '../math/quat';
import { vec3 } from '../math/vec3';
import type { Ghost } from '../stages/ghost-match';
import type { FaceMarker } from '../stages/types';
import { primitiveGeometry } from './primitives';
import { meshToGeometry } from './mesh-geometry';
import type { MeshData } from '../mesh/mesh-data';
import type { Vec3 } from '../math/vec3';

/** Lab hint shapes in world space (see buildHint). */
export interface ComponentHint {
  readonly points?: readonly Vec3[];
  readonly lines?: readonly (readonly [Vec3, Vec3])[];
  readonly triangles?: readonly (readonly [Vec3, Vec3, Vec3])[];
}

const GHOST_COLOR = '#8fcfb4';
/** Components to select: a colour Blender never uses for selection. */
const HINT_COLOR = '#5ad1ff';
const MARKER_PENDING = '#e8b86a';
const MARKER_SEEN = '#8fcfb4';

function markerTexture(symbol: string, color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = 'rgba(15, 17, 19, 0.85)';
  g.beginPath();
  g.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = size * 0.05;
  g.strokeStyle = color;
  g.stroke();
  g.fillStyle = color;
  g.font = `${size * 0.5}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(symbol, size / 2, size / 2 + size * 0.03);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class LabElements {
  readonly group = new THREE.Group();
  private markers = new Map<string, { mesh: THREE.Mesh; pending: THREE.Texture; seen: THREE.Texture }>();

  constructor() {
    this.group.name = 'LabElements';
  }

  set(
    ghosts: readonly Ghost[],
    markers: readonly FaceMarker[],
    meshGhosts: readonly MeshData[] = [],
    hints: readonly ComponentHint[] = [],
  ): void {
    this.clear();
    for (const g of ghosts) this.group.add(this.buildGhost(g));
    for (const m of markers) this.buildMarker(m);
    for (const m of meshGhosts) this.group.add(this.buildMeshGhost(m));
    for (const h of hints) this.group.add(this.buildHint(h));
  }

  /** Reference silhouette from any mesh (world coordinates). */
  private buildMeshGhost(m: MeshData): THREE.Object3D {
    const root = new THREE.Group();
    const { geometry } = meshToGeometry(m);
    root.add(
      new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: GHOST_COLOR, transparent: true, opacity: 0.1, depthWrite: false })),
    );
    const pos: number[] = [];
    for (const [a, b] of m.edges) for (const v of [a, b]) pos.push(m.verts[v]!.x, m.verts[v]!.y, m.verts[v]!.z);
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    root.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: GHOST_COLOR, transparent: true, opacity: 0.6 })));
    root.renderOrder = 1;
    return root;
  }

  /** Marks the components the student has to select (lab colour, drawn on top). */
  private buildHint(h: ComponentHint): THREE.Object3D {
    const root = new THREE.Group();
    const mat = { color: HINT_COLOR, depthTest: false, transparent: true } as const;
    if (h.points?.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(h.points.flatMap((p) => [p.x, p.y, p.z]), 3));
      root.add(new THREE.Points(g, new THREE.PointsMaterial({ ...mat, size: 14, sizeAttenuation: false, opacity: 0.8 })));
    }
    if (h.lines?.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(h.lines.flatMap(([a, b]) => [a.x, a.y, a.z, b.x, b.y, b.z]), 3));
      root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ ...mat, opacity: 0.9 })));
    }
    if (h.triangles?.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(h.triangles.flatMap((t) => t.flatMap((p) => [p.x, p.y, p.z])), 3));
      root.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ ...mat, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
    }
    root.traverse((o) => (o.renderOrder = 4));
    return root;
  }

  setSeen(ids: readonly string[]): void {
    for (const [id, m] of this.markers) {
      const material = m.mesh.material as THREE.MeshBasicMaterial;
      const tex = ids.includes(id) ? m.seen : m.pending;
      if (material.map !== tex) {
        material.map = tex;
        material.needsUpdate = true;
      }
    }
  }

  private clear(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose();
    });
    for (const m of this.markers.values()) {
      m.pending.dispose();
      m.seen.dispose();
    }
    this.markers.clear();
    this.group.clear();
  }

  private buildGhost(g: Ghost): THREE.Object3D {
    const root = new THREE.Group();
    const geometry = primitiveGeometry(g.primitive);
    const fill = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: GHOST_COLOR, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      new THREE.LineBasicMaterial({ color: GHOST_COLOR, transparent: true, opacity: 0.75 }),
    );
    root.add(fill, edges);
    setObjectLocation(root, g.location);
    setObjectRotation(root, fromEulerXYZ(vec3(g.rotationDeg.x * DEG, g.rotationDeg.y * DEG, g.rotationDeg.z * DEG)));
    root.scale.set(g.scale.x, g.scale.y, g.scale.z);
    root.renderOrder = 1;
    return root;
  }

  private buildMarker(m: FaceMarker): void {
    const pending = markerTexture(m.symbol, MARKER_PENDING);
    const seen = markerTexture(m.symbol, MARKER_SEEN);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(m.size, m.size),
      new THREE.MeshBasicMaterial({ map: pending, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    // Plane +Z along the face normal, symbol upright (up = Z, or Y on horizontal faces).
    const z = new THREE.Vector3(m.normal.x, m.normal.y, m.normal.z).normalize();
    const upHint = Math.abs(z.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const x = new THREE.Vector3().crossVectors(upHint, z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    setObjectLocation(mesh, m.position);
    this.group.add(mesh);
    this.markers.set(m.id, { mesh, pending, seen });
  }
}
