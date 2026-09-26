/**
 * three.js representations of scene objects, built in Blender local space
 * (they live under the Blender-space root, see coords.ts).
 */
import * as THREE from 'three';
import { yUpGeometryToBlender } from '../coords';
import type { CameraObject, LightObject, PrimitiveKind, SceneObject } from '../scene/scene';
import { THEME } from './theme';

/**
 * Geometry of Blender's primitives with default Add settings.
 * Blender primitives are flat shaded until "Shade Smooth". FIDELITY?
 */
export function primitiveGeometry(kind: PrimitiveKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(2, 2, 2);
    case 'uvSphere':
      // 32 segments, 16 rings, radius 1. three.js spheres are Y-up.
      return yUpGeometryToBlender(new THREE.SphereGeometry(1, 32, 16));
    case 'cylinder':
      return yUpGeometryToBlender(new THREE.CylinderGeometry(1, 1, 2, 32));
    case 'cone':
      return yUpGeometryToBlender(new THREE.CylinderGeometry(0, 1, 2, 32));
    case 'torus':
      // Major radius 1, minor 0.25, 48 x 12 segments. three.js tori lie in the XY plane already.
      return new THREE.TorusGeometry(1, 0.25, 12, 48);
    case 'plane':
      return new THREE.PlaneGeometry(2, 2);
  }
}

let solidMaterial: THREE.Material | null = null;

/** Solid shading, Material colour: grey, flat, light specular. FIDELITY? */
function getSolidMaterial(): THREE.Material {
  if (!solidMaterial) {
    const c = THEME.solidObjectLinear;
    solidMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setRGB(c, c, c, THREE.LinearSRGBColorSpace),
      specular: new THREE.Color(0x1a1a1a),
      shininess: 20,
      flatShading: true,
      side: THREE.DoubleSide,
    });
  }
  return solidMaterial;
}

const wireMaterial = new THREE.LineBasicMaterial({ color: THEME.wire });

/** Camera display: pyramid, frame and the "up" triangle (filled for the scene camera). */
function buildCamera(cam: CameraObject, isSceneCamera: boolean, aspect: number): THREE.Object3D {
  const group = new THREE.Group();
  // Blender: drawsize = 0.5 * Display Size (1 m). Sensor fit Auto on the render size.
  const s = 0.5;
  const halfW = aspect >= 1 ? s : s * aspect;
  const halfH = aspect >= 1 ? s / aspect : s;
  const depth = (s * cam.lens) / (cam.sensorWidth / 2);
  const c = [
    new THREE.Vector3(-halfW, -halfH, -depth),
    new THREE.Vector3(halfW, -halfH, -depth),
    new THREE.Vector3(halfW, halfH, -depth),
    new THREE.Vector3(-halfW, halfH, -depth),
  ] as const;
  const o = new THREE.Vector3(0, 0, 0);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    pts.push(o, c[i]!, c[i]!, c[(i + 1) % 4]!);
  }
  // Triangle above the frame (BKE camera drawing proportions). FIDELITY?
  const ty = s * (halfH / s + 0.1);
  const tTop = 1.1 * s * (halfH / s + 0.7);
  const t0 = new THREE.Vector3(-0.7 * s, ty, -depth);
  const t1 = new THREE.Vector3(0.7 * s, ty, -depth);
  const t2 = new THREE.Vector3(0, tTop, -depth);
  pts.push(t0, t1, t1, t2, t2, t0);
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wireMaterial));
  if (isSceneCamera) {
    const tri = new THREE.Mesh(
      new THREE.BufferGeometry().setFromPoints([t0, t1, t2]),
      new THREE.MeshBasicMaterial({ color: THEME.wire, side: THREE.DoubleSide }),
    );
    group.add(tri);
  }
  return group;
}

/**
 * Point light display. Its circles keep a constant size on screen, so the renderer
 * calls `updateLightBillboard` every frame. FIDELITY? Exact look of the light icon.
 */
function buildLight(light: LightObject): THREE.Object3D {
  const group = new THREE.Group();
  const billboard = new THREE.Group();
  billboard.name = 'billboard';
  const circle = (r: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMaterial);
  };
  // Radii in pixels (scaled by the billboard).
  billboard.add(circle(9));
  billboard.add(circle(3));
  group.add(billboard);

  // Dashed line down to the ground (Z = 0), in world space.
  const ground = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineDashedMaterial({ color: THEME.wire, dashSize: 0.1, gapSize: 0.1 }),
  );
  ground.name = 'groundLine';
  group.add(ground);
  group.userData.lightId = light.id;
  return group;
}

export function buildObject(o: SceneObject, isSceneCamera: boolean, renderAspect: number): THREE.Object3D {
  let obj: THREE.Object3D;
  if (o.type === 'mesh') {
    obj = new THREE.Mesh(primitiveGeometry(o.primitive), getSolidMaterial());
  } else if (o.type === 'camera') {
    obj = buildCamera(o, isSceneCamera, renderAspect);
  } else {
    obj = buildLight(o);
  }
  obj.name = o.name;
  obj.userData.objectId = o.id;
  return obj;
}

/**
 * Keeps the light circles facing the view at a constant pixel size, and the
 * ground line reaching Z = 0. `pixelSize(worldPos)` returns metres per pixel there.
 */
export function updateLightDisplay(
  obj: THREE.Object3D,
  worldLocationZ: number,
  viewRotation: THREE.Quaternion,
  metresPerPixel: number,
): void {
  const billboard = obj.getObjectByName('billboard');
  if (billboard) {
    // The light object has no parent rotation relevant to the icon: cancel it.
    billboard.quaternion.copy(obj.quaternion).invert().multiply(viewRotation);
    billboard.scale.setScalar(metresPerPixel / Math.max(1e-9, obj.scale.x));
  }
  const ground = obj.getObjectByName('groundLine') as THREE.Line | undefined;
  if (ground) {
    // Ground line in world Z, independent of the light's rotation and scale.
    ground.quaternion.copy(obj.quaternion).invert();
    const pos = ground.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(1, 0, 0, -Math.max(0, worldLocationZ) / Math.max(1e-9, obj.scale.z));
    pos.needsUpdate = true;
    ground.computeLineDistances();
  }
}
