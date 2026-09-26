/**
 * Mounts the Blender replica for a lab: layout, viewport, navigation, selection
 * and input. The SceneStore is the single source of truth.
 */
import type { InputPrefs, ObjectModeAction, ScreenAction } from './input/keymap';
import { type SelectCommand, SelectInteraction } from './input/select-interaction';
import { ViewportInput } from './input/viewport-input';
import type { LabDefinition } from './lab';
import { ClearLocationOp, ClearRotationOp, ClearScaleOp } from './operators/clear';
import { BoxSelectOp, OutlinerSelectOp, SelectAllOp, SelectOp } from './operators/select';
import { activeCamera, cameraData, objectRotation, selectedObjects, unionBounds } from './scene/scene';
import { SceneStore } from './scene/store';
import { buildLayout } from './ui/layout';
import { KeyOverlay } from './ui/key-overlay';
import { attachMenu } from './ui/menu';
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
import type { ViewportSize } from './viewport/projection';
import { type ViewProjection, viewProjection } from './viewport/screen';

export interface LabApp {
  readonly navigator: Navigator;
  readonly store: SceneStore;
  readonly keyOverlay: KeyOverlay;
  readonly renderer: ViewportRenderer;
  /** Projection of the settled view (no Smooth View in between), for stage checks. */
  settledProjection(): { projection: ViewProjection; size: ViewportSize };
}

export interface MountOptions {
  /** Current input preferences (Emulate 3 Button Mouse, Emulate Numpad). */
  inputPrefs(): InputPrefs;
  onNavigateWithoutMiddle?(): void;
}

export function mountLab(container: HTMLElement, lab: LabDefinition, options: MountOptions): LabApp {
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

  new ViewportInput({
    element: layout.viewport,
    navigator,
    prefs: options.inputPrefs,
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
    onNavigateWithoutMiddle: options.onNavigateWithoutMiddle,
  });
  const keyOverlay = new KeyOverlay(layout.viewport, container);

  const nav = (action: Parameters<Navigator['apply']>[0]) => () => navigator.apply(action);
  attachMenu(layout.viewMenu, () => [
    { label: 'Sidebar', shortcut: 'N', checked: () => sidebar.visible, action: () => sidebar.toggle() },
    'separator',
    { label: 'Perspective/Orthographic', shortcut: 'Numpad 5', action: nav({ type: 'toggleProjection' }) },
    'separator',
    { label: 'Frame Selected', shortcut: 'Numpad .', action: nav({ type: 'frameSelected' }) },
    { label: 'Frame All', shortcut: 'Home', action: nav({ type: 'frameAll' }) },
    'separator',
    {
      label: 'Viewpoint',
      submenu: [
        { label: 'Camera', shortcut: 'Numpad 0', action: nav({ type: 'toggleCamera' }) },
        'separator',
        { label: 'Top', shortcut: 'Numpad 7', action: nav({ type: 'axisView', axis: 'top' }) },
        { label: 'Bottom', shortcut: 'Ctrl Numpad 7', action: nav({ type: 'axisView', axis: 'bottom' }) },
        'separator',
        { label: 'Front', shortcut: 'Numpad 1', action: nav({ type: 'axisView', axis: 'front' }) },
        { label: 'Back', shortcut: 'Ctrl Numpad 1', action: nav({ type: 'axisView', axis: 'back' }) },
        'separator',
        { label: 'Right', shortcut: 'Numpad 3', action: nav({ type: 'axisView', axis: 'right' }) },
        { label: 'Left', shortcut: 'Ctrl Numpad 3', action: nav({ type: 'axisView', axis: 'left' }) },
      ],
    },
  ]);
  attachMenu(layout.selectMenu, () => [
    { label: 'All', shortcut: 'A', action: () => store.execute(SelectAllOp('select')) },
    { label: 'None', shortcut: 'Alt A', action: () => store.execute(SelectAllOp('deselect')) },
    { label: 'Invert', shortcut: 'Ctrl I', action: () => store.execute(SelectAllOp('invert')) },
    'separator',
    {
      label: 'Box Select',
      shortcut: 'B',
      action: () => {
        select.startModal();
        refreshInteraction();
      },
    },
  ]);

  view.requestRender();
  const settledProjection = () => {
    const size = view.viewportSize;
    const cam = activeCamera(store.state);
    return { projection: viewProjection(navigator.settled(), size, cam ? cameraData(store.state, cam) : null), size };
  };
  return { navigator, store, keyOverlay, renderer: view, settledProjection };
}
