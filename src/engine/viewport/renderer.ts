/**
 * Draws the scene with three.js. Reads the scene state and the navigator, never
 * writes to them. Renders on demand: only when something changed.
 */
import * as THREE from 'three';
import { createBlenderSpaceRoot, setObjectLocation, setObjectRotation } from '../coords';
import { rotate } from '../math/quat';
import { type Vec3, add, dot, sub, vec3 } from '../math/vec3';
import {
  type SceneState,
  activeCamera,
  cameraData,
  objectRotation,
} from '../scene/scene';
import type { DisplayedView, Navigator } from './navigator';
import { buildObject, updateLightDisplay } from './object-meshes';
import { type ViewportSize, halfTangents, orthographicFrustum, perspectiveFrustum, CLIP_END, CLIP_START } from './projection';
import { Grid } from './grid';
import { THEME } from './theme';
import { cameraViewFrustum } from './view-state';

export interface FrameInfo {
  readonly view: DisplayedView;
  readonly size: ViewportSize;
  /** Metres per CSS pixel at a Blender-space point. */
  metresPerPixelAt(p: Vec3): number;
}

export class ViewportRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly root = createBlenderSpaceRoot();
  private readonly gridScene = new THREE.Scene();
  private readonly gridRoot = createBlenderSpaceRoot();
  private readonly grid = new Grid();
  private readonly perspCamera = new THREE.PerspectiveCamera();
  private readonly orthoCamera = new THREE.OrthographicCamera();
  private readonly lightRig = new THREE.Group();
  private readonly objects = new Map<string, THREE.Object3D>();
  private objectsKey = '';
  private size: ViewportSize = { width: 1, height: 1 };
  private scheduled = false;
  private readonly drawListeners = new Set<(info: FrameInfo) => void>();

  constructor(
    private readonly container: HTMLElement,
    private readonly navigator: Navigator,
    private readonly getScene: () => SceneState,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'bl-viewport-canvas';
    container.appendChild(this.canvas);

    this.renderer.setClearColor(THEME.viewportBackground);
    this.scene.add(this.root);
    this.gridScene.add(this.gridRoot);
    this.gridRoot.add(this.grid.mesh);
    this.root.add(this.perspCamera, this.orthoCamera, this.lightRig);
    this.buildLightRig();

    navigator.onChange(() => this.requestRender());
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  get viewportSize(): ViewportSize {
    return this.size;
  }

  onDraw(fn: (info: FrameInfo) => void): () => void {
    this.drawListeners.add(fn);
    return () => this.drawListeners.delete(fn);
  }

  requestRender(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      const more = this.navigator.tick();
      this.draw();
      if (more) this.requestRender();
    });
  }

  /**
   * Studio-like lighting that follows the view, as Solid shading does with
   * "World Space Lighting" off. FIDELITY? Approximation of Blender's default studio light.
   */
  private buildLightRig(): void {
    this.root.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(-0.45, 0.75, 0.5); // view space: upper left, towards the viewer
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(0.6, -0.3, 0.4);
    for (const l of [key, fill]) {
      const target = new THREE.Object3D();
      this.lightRig.add(l, target);
      l.target = target;
    }
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.size = { width: w, height: h };
    this.renderer.setSize(w, h, false);
    this.requestRender();
  }

  private syncObjects(scene: SceneState, view: DisplayedView): void {
    const cam = activeCamera(scene);
    const key = scene.objects.map((o) => `${o.id}:${o.type}:${o.id === cam?.id}`).join('|');
    if (key !== this.objectsKey) {
      for (const obj of this.objects.values()) this.root.remove(obj);
      this.objects.clear();
      const aspect = scene.render.resolutionX / scene.render.resolutionY;
      for (const o of scene.objects) {
        const obj = buildObject(o, o.id === cam?.id, aspect);
        this.objects.set(o.id, obj);
        this.root.add(obj);
      }
      this.objectsKey = key;
    }
    for (const o of scene.objects) {
      const obj = this.objects.get(o.id);
      if (!obj) continue;
      setObjectLocation(obj, o.location);
      setObjectRotation(obj, objectRotation(o));
      obj.scale.set(o.scale.x, o.scale.y, o.scale.z);
      // Looking through a camera hides that camera's own drawing.
      obj.visible = !(view.camera && o.id === cam?.id);
    }
  }

  private draw(): void {
    const scene = this.getScene();
    const view = this.navigator.displayed();
    const size = this.size;
    this.syncObjects(scene, view);

    const eye = add(view.target, rotate(view.rotation, vec3(0, 0, view.distance)));
    const forward = rotate(view.rotation, vec3(0, 0, -1));
    const ortho = view.projection === 'orthographic' && !view.camera;
    const camera = ortho ? this.orthoCamera : this.perspCamera;
    setObjectLocation(camera, eye);
    setObjectRotation(camera, view.rotation);
    setObjectLocation(this.lightRig, eye);
    setObjectRotation(this.lightRig, view.rotation);

    let tanPerPixel: number;
    const sceneCam = activeCamera(scene);
    if (view.camera && sceneCam) {
      const f = cameraViewFrustum(view.camera, cameraData(scene, sceneCam), size);
      this.perspCamera.projectionMatrix.makePerspective(
        f.left * CLIP_START,
        f.right * CLIP_START,
        f.top * CLIP_START,
        f.bottom * CLIP_START,
        CLIP_START,
        CLIP_END,
      );
      tanPerPixel = (f.right - f.left) / size.width;
    } else if (ortho) {
      const f = orthographicFrustum(size, view.distance);
      Object.assign(this.orthoCamera, { left: f.left, right: f.right, top: f.top, bottom: f.bottom, near: f.near, far: f.far });
      this.orthoCamera.updateProjectionMatrix();
      tanPerPixel = (2 * halfTangents(size).x) / size.width;
    } else {
      const f = perspectiveFrustum(size);
      this.perspCamera.projectionMatrix.makePerspective(f.left, f.right, f.top, f.bottom, f.near, f.far);
      tanPerPixel = (2 * halfTangents(size).x) / size.width;
    }
    this.perspCamera.projectionMatrixInverse.copy(this.perspCamera.projectionMatrix).invert();

    const metresPerPixelAt = (p: Vec3) =>
      ortho ? tanPerPixel * view.distance : tanPerPixel * Math.max(CLIP_START, dot(sub(p, eye), forward));

    // Lights keep a constant on-screen size.
    const viewQuat = new THREE.Quaternion(view.rotation.x, view.rotation.y, view.rotation.z, view.rotation.w);
    for (const o of scene.objects) {
      if (o.type !== 'light') continue;
      const obj = this.objects.get(o.id);
      if (obj) updateLightDisplay(obj, o.location.z, viewQuat, metresPerPixelAt(o.location));
    }

    const axisOrtho = ortho && this.navigator.state.axisView !== null && !this.navigator.animating;
    this.grid.update(
      axisOrtho ? this.navigator.state.axisView : null,
      ortho,
      new THREE.Vector3(view.target.x, view.target.y, view.target.z),
      view.distance,
    );

    this.root.updateMatrixWorld(true);
    this.gridRoot.updateMatrixWorld(true);
    this.renderer.clear();
    if (axisOrtho) {
      // Axis views: the grid is a backdrop behind every object.
      this.renderer.render(this.gridScene, camera);
      this.renderer.render(this.scene, camera);
    } else {
      this.renderer.render(this.scene, camera);
      this.renderer.render(this.gridScene, camera);
    }

    const info: FrameInfo = { view, size, metresPerPixelAt };
    for (const fn of this.drawListeners) fn(info);
  }

}
