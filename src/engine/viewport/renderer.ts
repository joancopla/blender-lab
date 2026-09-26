/**
 * Draws the scene with three.js. Reads the scene state and the navigator, never
 * writes to them. Renders on demand: only when something changed.
 */
import * as THREE from 'three';
import { createBlenderSpaceRoot, setObjectLocation, setObjectRotation } from '../coords';
import { rotate } from '../math/quat';
import { type Vec3, dot, sub, vec3 } from '../math/vec3';
import { type SceneState, activeCamera, cameraData, objectRotation } from '../scene/scene';
import type { DisplayedView, Navigator } from './navigator';
import { type SelectionDisplay, buildObject, setWireSelection, updateLightDisplay } from './object-meshes';
import { type ViewportSize, CLIP_END, CLIP_START } from './projection';
import { type ViewProjection, viewProjection } from './screen';
import { Grid } from './grid';
import { LabElements } from './lab-elements';
import type { Ghost } from '../stages/ghost-match';
import type { FaceMarker } from '../stages/types';
import { type OutlineState, SelectionPasses } from './selection-passes';
import { THEME } from './theme';

/** Keeps modest classroom computers at 60 fps on high-density screens. */
const MAX_PIXEL_RATIO = 1.5;

export interface FrameInfo {
  readonly view: DisplayedView;
  readonly size: ViewportSize;
  readonly projection: ViewProjection;
  /** Metres per CSS pixel at a Blender-space point. */
  metresPerPixelAt(p: Vec3): number;
}

interface ObjectEntry {
  readonly root: THREE.Object3D;
  readonly type: 'mesh' | 'camera' | 'light';
  /** ID used by the selection passes (scene index + 1). */
  readonly passId: number;
  selection: SelectionDisplay | null;
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
  private readonly labElements = new LabElements();
  private readonly passes: SelectionPasses;
  private readonly objects = new Map<string, ObjectEntry>();
  private objectsKey = '';
  private size: ViewportSize = { width: 1, height: 1 };
  private scheduled = false;
  private lastCamera: THREE.Camera = this.perspCamera;
  private lastFrame: FrameInfo | null = null;
  private readonly drawListeners = new Set<(info: FrameInfo) => void>();

  constructor(
    private readonly container: HTMLElement,
    private readonly navigator: Navigator,
    private readonly getScene: () => SceneState,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    // Capped: on high-density screens every pass (scene, grid, outlines) costs 4x at 2.0.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.autoClear = false;
    this.renderer.setClearColor(THEME.viewportBackground);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'bl-viewport-canvas';
    container.appendChild(this.canvas);
    this.passes = new SelectionPasses(this.renderer);

    this.scene.add(this.root);
    this.gridScene.add(this.gridRoot);
    this.gridRoot.add(this.grid.mesh);
    this.root.add(this.perspCamera, this.orthoCamera, this.lightRig, this.labElements.group);
    this.buildLightRig();

    navigator.onChange(() => this.requestRender());
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  get viewportSize(): ViewportSize {
    return this.size;
  }

  /**
   * Projection of what the user sees: the last drawn frame, or the current view
   * if nothing has been drawn yet (e.g. the tab is in the background).
   */
  get frame(): FrameInfo {
    return this.lastFrame ?? this.frameInfo(this.getScene(), this.navigator.displayed());
  }

  private frameInfo(scene: SceneState, view: DisplayedView): FrameInfo {
    const size = this.size;
    const sceneCam = activeCamera(scene);
    const vp = viewProjection(view, size, sceneCam ? cameraData(scene, sceneCam) : null);
    const forward = rotate(vp.rotation, vec3(0, 0, -1));
    const perPixel = (vp.right - vp.left) / size.width;
    const metresPerPixelAt = (p: Vec3) =>
      vp.orthographic ? perPixel : perPixel * Math.max(CLIP_START, dot(sub(p, vp.eye), forward));
    return { view, size, projection: vp, metresPerPixelAt };
  }

  /** Ghost silhouettes and face markers of the current stage. */
  setLabElements(ghosts: readonly Ghost[], markers: readonly FaceMarker[]): void {
    this.labElements.set(ghosts, markers);
    this.requestRender();
  }

  setSeenMarkers(ids: readonly string[]): void {
    this.labElements.setSeen(ids);
    this.requestRender();
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
   * Scene object IDs with visible pixels inside a rectangle (CSS px), as drawn
   * in the last frame. Used by box select.
   */
  objectsInRect(rect: { x: number; y: number; width: number; height: number }): string[] {
    const byRoot = new Map<THREE.Object3D, number>();
    const byPassId = new Map<number, string>();
    for (const [id, e] of this.objects) {
      if (!e.root.visible) continue;
      byRoot.set(e.root, e.passId);
      byPassId.set(e.passId, id);
    }
    const ids = this.passes.idsInRect(this.scene, this.lastCamera, byRoot, rect, (d) => d.name !== 'groundLine');
    return [...ids].map((i) => byPassId.get(i)).filter((x): x is string => x !== undefined);
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
      for (const e of this.objects.values()) this.root.remove(e.root);
      this.objects.clear();
      const aspect = scene.render.resolutionX / scene.render.resolutionY;
      scene.objects.forEach((o, i) => {
        const root = buildObject(o, o.id === cam?.id, aspect);
        this.objects.set(o.id, { root, type: o.type, passId: i + 1, selection: null });
        this.root.add(root);
      });
      this.objectsKey = key;
    }
    for (const o of scene.objects) {
      const e = this.objects.get(o.id);
      if (!e) continue;
      setObjectLocation(e.root, o.location);
      setObjectRotation(e.root, objectRotation(o));
      e.root.scale.set(o.scale.x, o.scale.y, o.scale.z);
      // Looking through a camera hides that camera's own drawing.
      e.root.visible = !(view.camera && o.id === cam?.id);
      const selection: SelectionDisplay = !scene.selectedIds.includes(o.id)
        ? 'none'
        : o.id === scene.activeId
          ? 'active'
          : 'selected';
      if (e.type !== 'mesh' && selection !== e.selection) setWireSelection(e.root, selection);
      e.selection = selection;
    }
  }

  private draw(): void {
    const scene = this.getScene();
    const view = this.navigator.displayed();
    this.syncObjects(scene, view);

    const info = this.frameInfo(scene, view);
    const { projection: vp, metresPerPixelAt } = info;
    const camera = vp.orthographic ? this.orthoCamera : this.perspCamera;
    this.lastCamera = camera;
    for (const obj of [camera, this.lightRig]) {
      setObjectLocation(obj, vp.eye);
      setObjectRotation(obj, vp.rotation);
    }
    if (vp.orthographic) {
      Object.assign(this.orthoCamera, {
        left: vp.left,
        right: vp.right,
        top: vp.top,
        bottom: vp.bottom,
        // Orthographic views clip symmetrically around the view point.
        near: -CLIP_END / 2,
        far: CLIP_END / 2,
      });
      this.orthoCamera.updateProjectionMatrix();
    } else {
      const n = CLIP_START;
      this.perspCamera.projectionMatrix.makePerspective(vp.left * n, vp.right * n, vp.top * n, vp.bottom * n, n, CLIP_END);
      this.perspCamera.projectionMatrixInverse.copy(this.perspCamera.projectionMatrix).invert();
    }

    // Lights keep a constant on-screen size.
    const viewQuat = new THREE.Quaternion(vp.rotation.x, vp.rotation.y, vp.rotation.z, vp.rotation.w);
    for (const o of scene.objects) {
      if (o.type !== 'light') continue;
      const e = this.objects.get(o.id);
      if (e) updateLightDisplay(e.root, o.location.z, viewQuat, metresPerPixelAt(o.location));
    }

    const axisOrtho = vp.orthographic && this.navigator.state.axisView !== null && !this.navigator.animating;
    this.grid.update(
      axisOrtho ? this.navigator.state.axisView : null,
      vp.orthographic,
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
    this.drawOutlines(camera);

    this.lastFrame = info;
    for (const fn of this.drawListeners) fn(info);
  }

  private drawOutlines(camera: THREE.Camera): void {
    const meshRoots = new Map<THREE.Object3D, number>();
    const states = new Map<number, OutlineState>();
    for (const e of this.objects.values()) {
      if (e.type !== 'mesh' || !e.root.visible) continue;
      meshRoots.set(e.root, e.passId);
      states.set(e.passId, e.selection === 'active' ? 2 : e.selection === 'selected' ? 1 : 0);
    }
    if ([...states.values()].some((s) => s > 0)) {
      this.passes.renderOutlines(this.scene, camera, meshRoots, states);
    }
  }
}
