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

const GHOST_COLOR = '#8fcfb4';
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

  set(ghosts: readonly Ghost[], markers: readonly FaceMarker[]): void {
    this.clear();
    for (const g of ghosts) this.group.add(this.buildGhost(g));
    for (const m of markers) this.buildMarker(m);
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
