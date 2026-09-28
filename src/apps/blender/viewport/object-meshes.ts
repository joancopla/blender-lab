/**
 * three.js representations of scene objects, built in Blender local space
 * (they live under the Blender-space root, see coords.ts).
 */
import * as THREE from 'three';
import { type CameraObject, type LightObject, type SceneObject, lightData } from '../scene/scene';
import { LIGHT_ICON_RADII_PX, cameraDisplay } from '../scene/object-display';
import { THEME } from './theme';

export type SelectionDisplay = 'none' | 'selected' | 'active';

let solidMaterial: THREE.Material | null = null;

/**
 * Solid shading, Material colour: grey, light specular. FIDELITY?
 * The normals come from the geometry (mesh/normals.ts: flat or smooth per face),
 * so no flatShading here: it would ignore them and hide Shade Smooth.
 */
export function getSolidMaterial(): THREE.Material {
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

/** Lengths of the direction line and the spot cone, metres. FIDELITY? Blender's lengths. */
const DIRECTION_LENGTH = 1.5;
const SPOT_CONE_LENGTH = 1.5;

/**
 * The shape of each light type, in the light's own space (it shines along -Z):
 * the Sun's direction, the Spot's cone (Spot Size), the Area's outline at its
 * real size with its direction.
 */
function lightShape(light: LightObject, wire: THREE.LineBasicMaterial): THREE.Object3D | null {
  const d = lightData(light);
  const segments: THREE.Vector3[] = [];
  const line = (a: THREE.Vector3, b: THREE.Vector3) => segments.push(a, b);
  const ring = (rx: number, ry: number, z: number, n = 32) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      line(new THREE.Vector3(Math.cos(a0) * rx, Math.sin(a0) * ry, z), new THREE.Vector3(Math.cos(a1) * rx, Math.sin(a1) * ry, z));
    }
  };
  const origin = new THREE.Vector3(0, 0, 0);
  if (d.lightType === 'SUN') {
    line(origin, new THREE.Vector3(0, 0, -DIRECTION_LENGTH));
  } else if (d.lightType === 'SPOT') {
    const half = ((Math.min(d.spotSizeDeg, 179) / 2) * Math.PI) / 180;
    const r = Math.tan(half) * SPOT_CONE_LENGTH;
    ring(r, r, -SPOT_CONE_LENGTH);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(origin, new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -SPOT_CONE_LENGTH));
    }
  } else if (d.lightType === 'AREA') {
    const w = d.size / 2;
    const h = (d.shape === 'RECTANGLE' || d.shape === 'ELLIPSE' ? d.sizeY : d.size) / 2;
    if (d.shape === 'DISK' || d.shape === 'ELLIPSE') {
      ring(w, h, 0);
    } else {
      const c = [new THREE.Vector3(-w, -h, 0), new THREE.Vector3(w, -h, 0), new THREE.Vector3(w, h, 0), new THREE.Vector3(-w, h, 0)];
      for (let i = 0; i < 4; i++) line(c[i]!, c[(i + 1) % 4]!);
    }
    line(origin, new THREE.Vector3(0, 0, -DIRECTION_LENGTH));
  } else {
    return null;
  }
  const shape = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segments), wire);
  shape.name = 'lightShape';
  return shape;
}

/** What the light's drawing depends on (the renderer rebuilds it when this changes). */
export function lightDisplayKey(light: LightObject): string {
  const d = lightData(light);
  return `${d.lightType}|${d.spotSizeDeg}|${d.shape}|${d.size}|${d.sizeY}`;
}

/**
 * Light display: the circles of the icon keep a constant size on screen (the
 * renderer calls `updateLightDisplay` every frame), plus the shape of its type.
 * FIDELITY? Exact look of each light type's icon and gizmo.
 */
function buildLight(light: LightObject): THREE.Object3D {
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
  const shape = lightShape(light, wire);
  if (shape) group.add(shape);
  return group;
}

let litMaterial: THREE.MeshStandardMaterial | null = null;

/**
 * Material Preview and Rendered: objects without a material look like
 * Blender's default surface, a grey Principled BSDF (Base Color 0.8,
 * Roughness 0.5). FIDELITY?
 */
export function getLitMaterial(): THREE.MeshStandardMaterial {
  if (!litMaterial) {
    litMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(0.8, 0.8, 0.8, THREE.LinearSRGBColorSpace),
      roughness: 0.5,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: THREE.DoubleSide,
    });
  }
  return litMaterial;
}

let hiddenMaterial: THREE.MeshBasicMaterial | null = null;

/** Wireframe: the faces are not drawn (only the edges), but still pickable. */
export function getHiddenMaterial(): THREE.MeshBasicMaterial {
  if (!hiddenMaterial) hiddenMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  return hiddenMaterial;
}

/** The materials that show surfaces (and go through the view transform). */
export const isSurfaceMaterial = (m: THREE.Material): boolean =>
  m === solidMaterial || m === litMaterial || m === hiddenMaterial;

/** X-ray (Alt+Z): solid objects become see-through. FIDELITY? Blender's default X-ray alpha is 0.5. */
export function setSolidXray(on: boolean): void {
  for (const m of [getSolidMaterial() as THREE.MeshPhongMaterial, getLitMaterial()]) {
    if (m.transparent === on) continue;
    m.transparent = on;
    m.opacity = on ? 0.5 : 1;
    m.depthWrite = !on;
    m.needsUpdate = true;
  }
}

/** Meshes start with an empty geometry: the renderer fills it with the mesh to draw. */
export function buildObject(o: SceneObject, isSceneCamera: boolean, renderAspect: number): THREE.Object3D {
  let obj: THREE.Object3D;
  if (o.type === 'mesh') {
    obj = new THREE.Mesh(new THREE.BufferGeometry(), getSolidMaterial());
    // Shadows only matter in Rendered, where the scene's lights cast them.
    obj.castShadow = true;
    obj.receiveShadow = true;
  } else if (o.type === 'camera') {
    obj = buildCamera(o, isSceneCamera, renderAspect);
  } else {
    obj = buildLight(o);
  }
  obj.name = o.name;
  obj.userData.objectId = o.id;
  return obj;
}

export const WIRE_COLORS: Record<SelectionDisplay, string> = {
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
    if (m && !isSurfaceMaterial(m) && 'color' in m) {
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
