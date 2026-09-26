/**
 * Mounts the Blender replica for a lab: layout, viewport, navigation and input.
 */
import { type InputPrefs, DEFAULT_INPUT_PREFS } from './input/keymap';
import { ViewportInput } from './input/viewport-input';
import type { LabDefinition } from './lab';
import {
  type SceneState,
  activeCamera,
  cameraData,
  selectedObjects,
  objectRotation,
  unionBounds,
} from './scene/scene';
import { buildLayout } from './ui/layout';
import { ViewportOverlay } from './ui/viewport-overlay';
import { NavGizmo } from './viewport/nav-gizmo';
import { Navigator } from './viewport/navigator';
import { ViewportRenderer } from './viewport/renderer';

export interface LabApp {
  readonly navigator: Navigator;
  getScene(): SceneState;
}

/**
 * Temporary way to test the input emulations until the lab preferences UI
 * (phase 4): ?emulate3=1 and/or ?emulateNumpad=1 in the URL.
 */
function inputPrefsFromUrl(): InputPrefs {
  const q = new URLSearchParams(location.search);
  return {
    emulate3ButtonMouse: q.get('emulate3') === '1' || DEFAULT_INPUT_PREFS.emulate3ButtonMouse,
    emulateNumpad: q.get('emulateNumpad') === '1' || DEFAULT_INPUT_PREFS.emulateNumpad,
  };
}

export function mountLab(container: HTMLElement, lab: LabDefinition): LabApp {
  const scene: SceneState = lab.initialScene();
  const getScene = () => scene;
  const layout = buildLayout(container);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let renderer: ViewportRenderer | null = null;
  const navigator = new Navigator({
    size: () => renderer?.viewportSize ?? { width: 1, height: 1 },
    cameraPose: () => {
      const cam = activeCamera(scene);
      return cam ? { location: cam.location, rotation: objectRotation(cam) } : null;
    },
    cameraData: () => {
      const cam = activeCamera(scene);
      return cam ? cameraData(scene, cam) : null;
    },
    selectedBounds: () => unionBounds(selectedObjects(scene)),
    allBounds: () => unionBounds(scene.objects),
    reducedMotion: () => reducedMotion.matches,
    now: () => performance.now(),
  });

  renderer = new ViewportRenderer(layout.viewport, navigator, getScene);
  const overlay = new ViewportOverlay(layout.viewport);
  const gizmo = new NavGizmo(navigator);
  layout.viewport.append(gizmo.element);
  renderer.onDraw((info) => {
    overlay.update(info, navigator.state, scene);
    gizmo.update(info.view);
  });

  const prefs = inputPrefsFromUrl();
  new ViewportInput({ element: layout.viewport, navigator, prefs: () => prefs });

  renderer.requestRender();
  return { navigator, getScene };
}
