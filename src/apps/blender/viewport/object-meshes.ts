/**
 * three.js representations of scene objects, built in Blender local space
 * (they live under the Blender-space root, see coords.ts).
 */
import * as THREE from 'three';
import type { CameraObject, LightObject, SceneObject } from '../scene/scene';
import { LIGHT_ICON_RADII_PX, cameraDisplay } from '../scene/object-display';
import { THEME } from './theme';

export type SelectionDisplay = 'none' | 'selected' | 'active';

let solidMaterial: THREE.Material | null = null;

/**
 * Solid shading, Material colour: grey, light specular. FIDELITY?
 * The normals come from the geometry (mesh/normals.ts: flat or smooth per face),
 * so no flatShading here: it would ignore them and hide Shade Smooth.
 */
function getSolidMaterial(): THREE.Material {
  if (!solidMaterial) {
    const c = THEME.solidObjectLinear;
    solidMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setRGB(c, c, c, THREE.LinearSRGBColorSpace),
      specular: new THREE.Color(0x1a1a1a),
      shininess: 20,
      // Pushed back a little so Edit Mode edges and vertices on the surface stay visible.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: THREE.DoubleSide,
    });
  }
  return solidMaterial;
}

const toThree = (v: { x: number; y: number; z: number }) => new THREE.Vector3(v.x, v.y, v.z);

function buildCamera(cam: CameraObject, isSceneCamera: boolean, aspect: number): THREE.Object3D {
  const group = new THREE.Group();
  const d = cameraDisplay(cam, aspect);
  const wire = new THREE.LineBasicMaterial({ color: THEME.wire });
  const pts = d.segments.flatMap(([a, b]) => [toThree(a), toThree(b)]);
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wire));
  if (isSceneCamera) {
    const fill = new THREE.MeshBasicMaterial({ color: THEME.wire, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(d.triangle.map(toThree)), fill));
  }
  return group;
}

/**
 * Point light display. Its circles keep a constant size on screen, so the renderer
 * calls `updateLightDisplay` every frame. FIDELITY? Exact look of the light icon.
 */
function buildLight(_light: LightObject): THREE.Object3D {
  const group = new THREE.Group();
  const billboard = new THREE.Group();
  billboard.name = 'billboard';
  const wire = new THREE.LineBasicMaterial({ color: THEME.wire });
  for (const r of LIGHT_ICON_RADII_PX) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    billboard.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire));
  }
  group.add(billboard);

  // Dashed line down to the ground (Z = 0), in world space.
  const ground = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineDashedMaterial({ color: THEME.wire, dashSize: 0.1, gapSize: 0.1 }),
  );
  ground.name = 'groundLine';
  group.add(ground);
  return group;
}

/** X-ray (Alt+Z): solid objects become see-through. FIDELITY? Blender's default X-ray alpha is 0.5. */
export function setSolidXray(on: boolean): void {
  const m = getSolidMaterial() as THREE.MeshPhongMaterial;
  if (m.transparent === on) return;
  m.transparent = on;
  m.opacity = on ? 0.5 : 1;
  m.depthWrite = !on;
  m.needsUpdate = true;
}

/** Meshes start with an empty geometry: the renderer fills it with the mesh to draw. */
export function buildObject(o: SceneObject, isSceneCamera: boolean, renderAspect: number): THREE.Object3D {
  let obj: THREE.Object3D;
  if (o.type === 'mesh') {
    obj = new THREE.Mesh(new THREE.BufferGeometry(), getSolidMaterial());
  } else if (o.type === 'camera') {
    obj = buildCamera(o, isSceneCamera, renderAspect);
  } else {
    obj = buildLight(o);
  }
  obj.name = o.name;
  obj.userData.objectId = o.id;
  return obj;
}

const WIRE_COLORS: Record<SelectionDisplay, string> = {
  none: THEME.wire,
  selected: THEME.objectSelected,
  active: THEME.activeObject,
};

/**
 * Cameras and lights show selection by changing their wire colour. Meshes use
 * the outline pass instead (see selection-passes.ts).
 */
export function setWireSelection(obj: THREE.Object3D, state: SelectionDisplay): void {
  const color = WIRE_COLORS[state];
  obj.traverse((child) => {
    const m = (child as THREE.Mesh | THREE.Line).material as THREE.Material | undefined;
    if (m && !(child instanceof THREE.Mesh && child.material === solidMaterial) && 'color' in m) {
      (m as THREE.LineBasicMaterial).color.set(color);
    }
  });
}

/**
 * Keeps the light circles facing the view at a constant pixel size, and the
 * ground line reaching Z = 0.
 */
export function updateLightDisplay(
  obj: THREE.Object3D,
  worldLocationZ: number,
  viewRotation: THREE.Quaternion,
  metresPerPixel: number,
): void {
  const billboard = obj.getObjectByName('billboard');
  if (billboard) {
    // Cancel the light's own rotation so the icon faces the view.
    billboard.quaternion.copy(obj.quaternion).invert().multiply(viewRotation);
    billboard.scale.setScalar(metresPerPixel / Math.max(1e-9, obj.scale.x));
  }
  const ground = obj.getObjectByName('groundLine') as THREE.Line | undefined;
  if (ground) {
    // Ground line in world Z, independent of the light's rotation.
    ground.quaternion.copy(obj.quaternion).invert();
    const pos = ground.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(1, 0, 0, -Math.max(0, worldLocationZ) / Math.max(1e-9, obj.scale.z));
    pos.needsUpdate = true;
    ground.computeLineDistances();
  }
}
