/**
 * Mounts the Blender replica for a lab: layout, viewport, navigation, selection
 * and input. The SceneStore is the single source of truth.
 */
import type { EditModeAction, InputPrefs, ObjectModeAction, ScreenAction } from './input/keymap';
import { baseKind } from './edit/selection';
import { add, max, min, mul, vec3 } from './math/vec3';
import { rotate } from './math/quat';
import {
  EditBoxSelectOp,
  EditSelectAllOp,
  EditSelectOp,
  LoopSelectOp,
  SelectLinkedOp,
  SelectLinkedPickOp,
  SelectModeOp,
  SelectMoreLessOp,
  ToggleEditModeOp,
  selectionOf,
} from './operators/edit-mode';
import { componentsInRect, pickComponent, pickEdge } from './viewport/component-picking';
import type { Bounds } from './viewport/view-state';
import { type SelectCommand, SelectInteraction } from './input/select-interaction';
import { ViewportInput } from './input/viewport-input';
import type { LabDefinition } from './lab';
import { ClearLocationOp, ClearRotationOp, ClearScaleOp } from './operators/clear';
import { BoxSelectOp, OutlinerSelectOp, SelectAllOp, SelectOp } from './operators/select';
import {
  type SceneState,
  activeCamera,
  cameraData,
  isEditMode,
  meshOf,
  objectRotation,
  selectModeOf,
  selectedObjects,
  unionBounds,
} from './scene/scene';
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
  /** Overlays > Statistics (off by default, as in Blender). */
  readonly statistics?: boolean;
}

/** World-space bounds of the selected vertices of the objects in Edit Mode. */
function selectedComponentBounds(s: SceneState): Bounds | null {
  const ids = new Set(s.editObjectIds ?? []);
  let lo = vec3(Infinity, Infinity, Infinity);
  let hi = vec3(-Infinity, -Infinity, -Infinity);
  let any = false;
  for (const o of s.objects) {
    if (o.type !== 'mesh' || !ids.has(o.id)) continue;
    const m = meshOf(o);
    const q = objectRotation(o);
    for (const v of selectionOf(o).verts) {
      const p = add(o.location, rotate(q, mul(m.verts[v]!, o.scale)));
      lo = min(lo, p);
      hi = max(hi, p);
      any = true;
    }
  }
  return any ? { min: lo, max: hi } : null;
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
    // Numpad . frames the selected components in Edit Mode, the selected objects otherwise.
    selectedBounds: () =>
      isEditMode(store.state) ? selectedComponentBounds(store.state) : unionBounds(selectedObjects(store.state)),
    allBounds: () => unionBounds(store.state.objects),
    reducedMotion: () => reducedMotion.matches,
    now: () => performance.now(),
  });

  const view = new ViewportRenderer(layout.viewport, navigator, () => store.displayState);
  renderer = view;
  const overlay = new ViewportOverlay(layout.viewport, options.statistics ?? false);
  const gizmo = new NavGizmo(navigator);
  layout.viewport.append(gizmo.element);
  const status = new StatusBar(layout.statusLeft);
  const outliner = new Outliner({
    container: layout.outlinerBody,
    // FIDELITY? Clicking objects in the Outliner while in Edit Mode is ignored here.
    onSelect: (id, extend) => !isEditMode(store.state) && store.execute(OutlinerSelectOp(id, extend)),
  });

  // Header: mode selector, select mode buttons and mode-specific menus.
  const updateHeader = () => {
    const s = store.displayState;
    const edit = isEditMode(s);
    layout.modeMenu.textContent = edit ? 'Edit Mode' : 'Object Mode';
    for (const e of layout.objectModeOnly) e.hidden = edit;
    for (const e of layout.editModeOnly) e.hidden = !edit;
    const mode = selectModeOf(s);
    for (const k of ['vert', 'edge', 'face'] as const) layout.selectModeButtons[k].classList.toggle('is-active', mode[k]);
  };
  for (const k of ['vert', 'edge', 'face'] as const) {
    layout.selectModeButtons[k].addEventListener('click', (e) => store.execute(SelectModeOp(k, e.shiftKey)));
  }
  attachMenu(layout.modeMenu, () => [
    { label: 'Object Mode', action: () => isEditMode(store.state) && store.execute(ToggleEditModeOp) },
    { label: 'Edit Mode', action: () => !isEditMode(store.state) && store.execute(ToggleEditModeOp) },
  ]);

  view.onDraw((info) => {
    overlay.update(info, navigator.state, store.displayState);
    gizmo.update(info.view);
  });
  const sidebar = new Sidebar(layout.viewport, store);
  const onSceneChange = () => {
    outliner.update(store.displayState);
    sidebar.update(store.displayState);
    updateHeader();
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

  let xray = false;
  const pickContext = () => {
    const frame = view.frame;
    return { scene: store.state, projection: frame.projection, size: frame.size, xray };
  };

  const runEditSelect = (cmd: SelectCommand) => {
    const ctx = pickContext();
    if (cmd.type === 'box') {
      const inside = componentsInRect(ctx, baseKind(selectModeOf(store.state)), cmd.rect);
      store.execute(EditBoxSelectOp(inside, cmd.mode));
      return;
    }
    if (cmd.alt) {
      // Alt+click: edge loop; Ctrl+Alt+click: edge ring. Shift adds.
      const hit = pickEdge(ctx, cmd.x, cmd.y, 20);
      if (hit) store.execute(LoopSelectOp(hit.objectId, hit.ref.index, cmd.ctrl ? 'ring' : 'loop', cmd.extend));
      return;
    }
    // FIDELITY? Ctrl+click (Pick Shortest Path in Blender) is out of scope.
    if (cmd.ctrl) return;
    store.execute(EditSelectOp(pickComponent(ctx, selectModeOf(store.state), cmd.x, cmd.y), cmd.extend));
  };

  const runSelect = (cmd: SelectCommand) => {
    if (isEditMode(store.state)) {
      runEditSelect(cmd);
      return;
    }
    const frame = view.frame;
    if (cmd.type === 'click') {
      // Ctrl+click and Alt+click do nothing in Object Mode here.
      if (cmd.ctrl || cmd.alt) return;
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
    // Transforming components arrives in phase 3.
    if (transform || !cursor || isEditMode(store.state)) return;
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

  /** Alt+Z: a viewport shading setting, not an undo step. */
  function toggleXray(): void {
    xray = !xray;
    view.setXray(xray);
  }

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
      else if (a.type === 'toggleEditMode') store.execute(ToggleEditModeOp);
      else if (a.type === 'toggleXray') toggleXray();
    },
    editMode: () => isEditMode(store.state),
    onEditModeAction: (a: EditModeAction) => {
      switch (a.type) {
        case 'selectMode':
          return void store.execute(SelectModeOp(a.kind, a.extend));
        case 'selectAll':
          return void store.execute(EditSelectAllOp(a.action));
        case 'selectLinked':
          return void store.execute(SelectLinkedOp);
        case 'selectMoreLess':
          return void store.execute(SelectMoreLessOp(a.more));
        case 'selectLinkedPick': {
          if (!cursor) return;
          const hit = pickComponent(pickContext(), selectModeOf(store.state), cursor.x, cursor.y);
          if (!hit) return;
          const o = store.state.objects.find((x) => x.id === hit.objectId);
          if (o?.type !== 'mesh') return;
          const m = meshOf(o);
          const verts = hit.ref.kind === 'vert' ? [hit.ref.index] : hit.ref.kind === 'edge' ? [...m.edges[hit.ref.index]!] : [...m.faces[hit.ref.index]!];
          return void store.execute(SelectLinkedPickOp(hit.objectId, verts));
        }
        case 'toggleSidebar':
          return sidebar.toggle();
        case 'toggleEditMode':
          return void store.execute(ToggleEditModeOp);
        case 'toggleXray':
          return toggleXray();
        case 'boxSelectModal':
          return; // handled by the input layer
      }
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
  attachMenu(layout.selectMenu, () => {
    const edit = isEditMode(store.state);
    const all = (action: 'select' | 'deselect' | 'invert') => () =>
      store.execute(edit ? EditSelectAllOp(action) : SelectAllOp(action));
    return [
      { label: 'All', shortcut: 'A', action: all('select') },
      { label: 'None', shortcut: 'Alt A', action: all('deselect') },
      { label: 'Invert', shortcut: 'Ctrl I', action: all('invert') },
      'separator',
      {
        label: 'Box Select',
        shortcut: 'B',
        action: () => {
          select.startModal();
          refreshInteraction();
        },
      },
      ...(edit
        ? ([
            'separator',
            {
              label: 'Select More/Less',
              submenu: [
                { label: 'More', shortcut: 'Ctrl Numpad +', action: () => store.execute(SelectMoreLessOp(true)) },
                { label: 'Less', shortcut: 'Ctrl Numpad -', action: () => store.execute(SelectMoreLessOp(false)) },
              ],
            },
            { label: 'Select Linked', submenu: [{ label: 'Linked', shortcut: 'Ctrl L', action: () => store.execute(SelectLinkedOp) }] },
          ] as const)
        : []),
    ];
  });

  view.requestRender();
  const settledProjection = () => {
    const size = view.viewportSize;
    const cam = activeCamera(store.state);
    return { projection: viewProjection(navigator.settled(), size, cam ? cameraData(store.state, cam) : null), size };
  };
  return { navigator, store, keyOverlay, renderer: view, settledProjection };
}
