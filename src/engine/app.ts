/**
 * Mounts the Blender replica for a lab: layout, viewport, navigation, selection
 * and input. The SceneStore is the single source of truth.
 */
import { type InputPrefs, DEFAULT_INPUT_PREFS, type ObjectModeAction, type ScreenAction } from './input/keymap';
import { type SelectCommand, SelectInteraction } from './input/select-interaction';
import { ViewportInput } from './input/viewport-input';
import type { LabDefinition } from './lab';
import { ClearLocationOp, ClearRotationOp, ClearScaleOp } from './operators/clear';
import { BoxSelectOp, OutlinerSelectOp, SelectAllOp, SelectOp } from './operators/select';
import { activeCamera, cameraData, objectRotation, selectedObjects, unionBounds } from './scene/scene';
import { SceneStore } from './scene/store';
import { buildLayout } from './ui/layout';
import { Outliner } from './ui/outliner';
import { Sidebar } from './ui/sidebar';
import { StatusBar } from './ui/status-bar';
import { TransformGuides } from './ui/transform-guides';
import { TransformSession } from './transform-session';
import { ViewportOverlay } from './ui/viewport-overlay';
import { NavGizmo } from './viewport/nav-gizmo';
import { Navigator } from './viewport/navigator';
import { chooseClickTarget, pickAt } from './viewport/picking';
import { ViewportRenderer } from './viewport/renderer';

export interface LabApp {
  readonly navigator: Navigator;
  readonly store: SceneStore;
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
  const store = new SceneStore(lab.initialScene());
  const layout = buildLayout(container);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let renderer: ViewportRenderer | null = null;
  const navigator = new Navigator({
    size: () => renderer?.viewportSize ?? { width: 1, height: 1 },
    cameraPose: () => {
      const cam = activeCamera(store.state);
      return cam ? { location: cam.location, rotation: objectRotation(cam) } : null;
    },
    cameraData: () => {
      const cam = activeCamera(store.state);
      return cam ? cameraData(store.state, cam) : null;
    },
    selectedBounds: () => unionBounds(selectedObjects(store.state)),
    allBounds: () => unionBounds(store.state.objects),
    reducedMotion: () => reducedMotion.matches,
    now: () => performance.now(),
  });

  const view = new ViewportRenderer(layout.viewport, navigator, () => store.displayState);
  renderer = view;
  const overlay = new ViewportOverlay(layout.viewport);
  const gizmo = new NavGizmo(navigator);
  layout.viewport.append(gizmo.element);
  const status = new StatusBar(layout.statusLeft);
  const outliner = new Outliner({
    container: layout.outlinerBody,
    onSelect: (id, extend) => store.execute(OutlinerSelectOp(id, extend)),
  });

  view.onDraw((info) => {
    overlay.update(info, navigator.state, store.displayState);
    gizmo.update(info.view);
  });
  const sidebar = new Sidebar(layout.viewport, store);
  const onSceneChange = () => {
    outliner.update(store.displayState);
    sidebar.update(store.displayState);
    view.requestRender();
  };
  store.onChange(onSceneChange);
  onSceneChange();

  const select = new SelectInteraction();
  let cursor: { x: number; y: number } | null = null;
  const refreshInteraction = () => {
    overlay.setBox(select.box);
    overlay.setCrosshair(select.modalWaiting ? cursor : null);
    status.set(select.isModal ? 'boxModal' : 'idle');
  };
  layout.viewport.addEventListener('pointermove', (e) => {
    const r = layout.viewport.getBoundingClientRect();
    cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (select.modalWaiting) refreshInteraction();
  });

  const runSelect = (cmd: SelectCommand) => {
    const frame = view.frame;
    if (cmd.type === 'click') {
      const cam = activeCamera(store.state);
      const hidden = new Set<string>(frame.view.camera && cam ? [cam.id] : []);
      const hits = pickAt(store.state, frame.projection, frame.size, cmd.x, cmd.y, { hiddenIds: hidden });
      const id = cmd.extend ? (hits[0]?.id ?? null) : chooseClickTarget(hits, store.state);
      store.execute(SelectOp(id, cmd.extend));
    } else {
      store.execute(BoxSelectOp(view.objectsInRect(cmd.rect), cmd.mode));
    }
  };

  const guides = new TransformGuides(layout.viewport);
  let transform: TransformSession | null = null;
  const startTransform = (kind: 'translate' | 'rotate' | 'resize') => {
    if (transform || !cursor) return;
    transform = TransformSession.start(
      {
        store,
        view,
        status,
        guides,
        header: layout.viewportHeaderText.parentElement!,
        headerText: layout.viewportHeaderText,
        onEnd: () => (transform = null),
      },
      kind,
      cursor,
      { ctrl: false, shift: false, alt: false },
    );
  };
  const CLEAR_OPS = { location: ClearLocationOp, rotation: ClearRotationOp, scale: ClearScaleOp };

  const prefs = inputPrefsFromUrl();
  new ViewportInput({
    element: layout.viewport,
    navigator,
    prefs: () => prefs,
    select,
    modal: () => transform,
    onSelect: runSelect,
    onObjectModeAction: (a: ObjectModeAction) => {
      if (a.type === 'selectAll') store.execute(SelectAllOp(a.action));
      else if (a.type === 'transform') startTransform(a.kind);
      else if (a.type === 'clear') store.execute(CLEAR_OPS[a.field]);
      else if (a.type === 'toggleSidebar') sidebar.toggle();
    },
    onScreenAction: (a: ScreenAction) => (a.type === 'undo' ? store.undo() : store.redo()),
    onInteractionChange: refreshInteraction,
  });

  view.requestRender();
  return { navigator, store };
}
