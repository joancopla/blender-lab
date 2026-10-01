/**
 * Builds the Blender replica: layout, viewport, navigation, selection, tools and
 * input. The SceneStore is the single source of truth. BlenderApp (blender-app.ts)
 * wraps it in the core app contract.
 */
import type { EditModeAction, InputPrefs, ObjectModeAction, ScreenAction } from './input/keymap';
import { baseKind } from './edit/selection';
import { type Vec3, add, max, min, mul, scale, vec3 } from './math/vec3';
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
import { type SelectCommand, SelectInteraction } from '../../core/input/select-interaction';
import { ViewportInput } from './input/viewport-input';
import { ClearLocationOp, ClearRotationOp, ClearScaleOp } from './operators/clear';
import { evaluatedMesh } from './modifiers/stack';
import { sceneTriangles, surfaceAlong } from './render/light-meter';
import { SubdivisionSetOp, levelsLimited } from './operators/modifiers';
import { ShadeAutoSmoothOp, ShadeFlatOp, ShadeSmoothOp } from './operators/shade';
import { type AddKind, AddObjectOp } from './operators/add';
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
import { blenderDefaultScene } from './scene/default-scene';
import { type MenuItem, attachMenu, openMenuAt } from './ui/menu';
import { openPieMenu } from './ui/pie-menu';
import type { ShadingMode } from './render/render-setup';
import { PropertiesEditor } from './ui/properties/properties-editor';
import type { PropertiesTabId } from './ui/properties/tabs';
import { viewsFor } from './ui/properties/views';
import { type AdjustValues, type AdjustableOp, AdjustPanel } from './ui/adjust-panel';
import {
  DeleteOp,
  DissolveOp,
  FillOp,
  MergeOp,
  bevelScene,
  extrudeScene,
  insetScene,
  loopCutScene,
  mergeScene,
  translateSelection,
} from './operators/edit-tools';
import { MERGE_DISTANCE } from './mesh/ops/merge';
import { InsetModal } from './edit/inset-modal';
import { BevelModal, LoopCutModal } from './edit/cut-bevel-modals';
import { t } from '../../core/i18n';
import { Outliner } from './ui/outliner';
import { Sidebar } from './ui/sidebar';
import { StatusBar } from './ui/status-bar';
import { TransformGuides } from './ui/transform-guides';
import { type ModalOperator, TransformSession } from './transform-session';
import { TransformModal } from './operators/transform';
import { ComponentTransform } from './edit/component-transform';
import { ViewportOverlay } from './ui/viewport-overlay';
import { NavGizmo } from './viewport/nav-gizmo';
import { Navigator } from './viewport/navigator';
import { chooseClickTarget, pickAt } from './viewport/picking';
import { ViewportRenderer } from './viewport/renderer';
import type { ViewportSize } from './viewport/projection';
import { type ViewProjection, screenRay, viewProjection } from './viewport/screen';
import { NodeEditor } from './ui/node-editor/node-editor';

export interface MountedBlender {
  readonly navigator: Navigator;
  readonly store: SceneStore;
  readonly renderer: ViewportRenderer;
  /** The 3D viewport element (overlays drawn over the replica go here). */
  readonly viewport: HTMLElement;
  /** Projection of the settled view (no Smooth View in between), for stage checks. */
  settledProjection(): { projection: ViewProjection; size: ViewportSize };
  /** Shows a Properties Editor tab (if the lab enables it and the active object has it). */
  showPropertiesTab(id: PropertiesTabId): void;
  /** Viewport Shading changed (Z pie, header buttons). */
  onShadingChange(fn: () => void): () => void;
  /** A lab tool that takes the next plain click in the viewport (null: none). */
  setClickTool(tool: ((x: number, y: number) => void) | null): void;
  /** The surface under a viewport point (CSS px): its point and normal, in Blender space. */
  surfaceAt(x: number, y: number): { point: Vec3; normal: Vec3; objectId: string } | null;
}

export interface MountOptions {
  /** Current input preferences (Emulate 3 Button Mouse, Emulate Numpad). */
  inputPrefs(): InputPrefs;
  onNavigateWithoutMiddle?(): void;
  /** Overlays > Statistics (off by default, as in Blender). */
  readonly statistics?: boolean;
  /** Properties Editor tabs this lab uses; the others are shown inactive. */
  readonly propertiesTabs?: readonly PropertiesTabId[];
  /** Add menu and Shift+A (off in the labs that do not teach adding objects). */
  readonly addObjects?: boolean;
  /** Where new lights appear instead of the 3D Cursor (a lab decision). */
  readonly newLightLocation?: Vec3;
  /** Shader Editor under the viewport, as in the Shading workspace (Lab 05). */
  readonly shaderEditor?: boolean;
}

/** The material the Shader Editor shows: the active object's first slot. FIDELITY? Active slot index. */
export function activeMaterialId(s: SceneState): string | null {
  const o = s.objects.find((x) => x.id === s.activeId);
  if (!o || o.type !== 'mesh') return null;
  return o.materialSlots?.[0] ?? null;
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

export function mountBlender(container: HTMLElement, options: MountOptions): MountedBlender {
  const store = new SceneStore(blenderDefaultScene());
  let clickTool: ((x: number, y: number) => void) | null = null;
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
    // Numpad . frames the selected components in Edit Mode, the selected objects
    // otherwise (their modifiers' result, as drawn).
    selectedBounds: () =>
      isEditMode(store.state)
        ? selectedComponentBounds(store.state)
        : unionBounds(selectedObjects(store.state), (o) => evaluatedMesh(o, store.state)),
    allBounds: () => unionBounds(store.state.objects, (o) => evaluatedMesh(o, store.state)),
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
  const properties = new PropertiesEditor(layout.propertiesArea, viewsFor(options.propertiesTabs ?? []), {
    store,
    report: (message) => status.report(message),
  });
  const onSceneChange = () => {
    outliner.update(store.displayState);
    sidebar.update(store.displayState);
    properties.update(store.displayState);
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
  const sessionDeps = {
    store,
    view,
    status,
    guides,
    header: layout.viewportHeaderText.parentElement!,
    headerText: layout.viewportHeaderText,
    onEnd: () => (transform = null),
  };
  const NO_MODS = { ctrl: false, shift: false, alt: false };
  /** Starts any modal operator at the mouse position. */
  const startModal = (modal: ModalOperator) => {
    if (transform) return;
    transform = TransformSession.start(sessionDeps, modal, NO_MODS);
  };
  const startTransform = (kind: 'translate' | 'rotate' | 'resize') => {
    if (transform || !cursor) return;
    const frame = view.frame;
    if (isEditMode(store.state)) {
      if (!ComponentTransform.canStart(store.state)) return;
      startModal(new ComponentTransform(kind, store.state, frame.projection, frame.size, cursor));
      return;
    }
    if (!TransformModal.canStart(store.state)) return;
    startModal(new TransformModal(kind, store.state, frame.projection, frame.size, cursor));
  };
  const CLEAR_OPS = { location: ClearLocationOp, rotation: ClearRotationOp, scale: ClearScaleOp };

  /** Alt+Z: a viewport shading setting, not an undo step. */
  function toggleXray(): void {
    xray = !xray;
    view.setXray(xray);
    layout.xrayButton.classList.toggle('is-active', xray);
    layout.xrayButton.setAttribute('aria-pressed', String(xray));
  }
  layout.xrayButton.addEventListener('click', toggleXray);

  /** Viewport Shading (Z pie, header buttons): a view setting, not an undo step. */
  const shadingListeners = new Set<() => void>();
  function setShading(mode: ShadingMode): void {
    const changed = view.shadingMode !== mode;
    view.setShading(mode);
    if (changed) for (const fn of shadingListeners) fn();
    for (const k of ['WIREFRAME', 'SOLID', 'MATERIAL', 'RENDERED'] as const) {
      layout.shadingButtons[k].classList.toggle('is-active', k === mode);
      layout.shadingButtons[k].setAttribute('aria-pressed', String(k === mode));
    }
  }
  for (const k of ['WIREFRAME', 'SOLID', 'MATERIAL', 'RENDERED'] as const) {
    layout.shadingButtons[k].addEventListener('click', () => setShading(k));
  }
  setShading('SOLID');
  /** Z: Blender's shading pie. FIDELITY? Positions of the items, and Toggle Overlays (not in the lab). */
  const openShadingPie = () => {
    const p = cursor ?? { x: 100, y: 100 };
    const mode = view.shadingMode;
    openPieMenu(
      layout.viewport,
      p.x,
      p.y,
      [
        { label: 'Wireframe', direction: 'W', checked: mode === 'WIREFRAME', action: () => setShading('WIREFRAME') },
        { label: 'Solid', direction: 'E', checked: mode === 'SOLID', action: () => setShading('SOLID') },
        { label: 'Material Preview', direction: 'S', checked: mode === 'MATERIAL', action: () => setShading('MATERIAL') },
        { label: 'Rendered', direction: 'N', checked: mode === 'RENDERED', action: () => setShading('RENDERED') },
        { label: 'Toggle X-Ray', direction: 'NW', checked: xray, action: toggleXray },
        { label: 'Toggle Overlays', direction: 'NE', disabled: true },
      ],
      'Shading',
    );
  };

  // --- Adjust Last Operation -------------------------------------------------
  let adjust: {
    op: AdjustableOp;
    base: SceneState;
    rerun: (values: AdjustValues) => SceneState;
    logLength: number;
  } | null = null;
  let adjusting = false;
  const adjustPanel = new AdjustPanel(layout.viewport, (values) => {
    const a = adjust;
    if (!a || store.log.length !== a.logLength) return;
    adjusting = true;
    store.undo();
    if (store.state !== a.base) {
      // Something else changed in between: give up, keep the state consistent.
      store.redo();
      adjusting = false;
      closeAdjust();
      return;
    }
    const next = a.rerun(values);
    store.execute({ name: a.op.title, apply: () => next });
    a.logLength = store.log.length;
    a.op = { ...a.op, values };
    adjusting = false;
  });
  function closeAdjust(): void {
    adjust = null;
    adjustPanel.hide();
  }
  /** Shows the panel for the operation just recorded. `base`: the state before it. */
  function offerAdjust(op: AdjustableOp, base: SceneState, rerun: (values: AdjustValues) => SceneState): void {
    adjust = { op, base, rerun, logLength: store.log.length };
    adjustPanel.show(op);
  }
  store.onChange(() => {
    if (!adjusting && adjust && store.log.length !== adjust.logLength) closeAdjust();
  });

  /** Runs a non-modal tool and offers its (field-less) Adjust panel. */
  const runTool = (op: { name: string; apply: (s: SceneState) => SceneState }) => {
    const base = store.state;
    if (store.execute(op)) offerAdjust({ title: op.name, fields: [], values: {} }, base, () => op.apply(base));
  };

  const startExtrude = () => {
    if (transform || !cursor) return;
    const base = store.state;
    const { scene: extruded, normal } = extrudeScene(base);
    if (extruded === base) return;
    const frame = view.frame;
    const modal = new ComponentTransform('translate', extruded, frame.projection, frame.size, cursor, {
      name: normal ? 'Extrude Region and Move' : 'Extrude and Move',
      cancelState: extruded,
      ...(normal
        ? { normal, constraint: { space: 'local' as const, kind: 'axis' as const, axis: 2 as const }, localLabel: 'normal' }
        : {}),
    });
    modal.onConfirmed = () => {
      const t = modal.translation;
      if (normal) {
        const move = t.x * normal.x + t.y * normal.y + t.z * normal.z;
        offerAdjust(
          { title: modal.operatorName, fields: [{ key: 'move', label: 'Move', kind: 'distance', min: -Infinity }], values: { move } },
          base,
          (v) => translateSelection(extrudeScene(base).scene, scale(normal, v.move as number)),
        );
      } else {
        offerAdjust({ title: modal.operatorName, fields: [], values: {} }, base, () => translateSelection(extrudeScene(base).scene, t));
      }
    };
    startModal(modal);
  };

  const startInset = () => {
    if (transform || !cursor || !InsetModal.canStart(store.state)) return;
    const base = store.state;
    const frame = view.frame;
    startModal(
      new InsetModal(base, frame.projection, frame.size, cursor, (v) =>
        // Offered once the confirmed state is recorded (next tick).
        queueMicrotask(() =>
          offerAdjust(
            {
              title: 'Inset Faces',
              fields: [
                { key: 'thickness', label: 'Thickness', kind: 'distance' },
                { key: 'depth', label: 'Depth', kind: 'distance', min: -Infinity },
                { key: 'individual', label: 'Individual', kind: 'bool' },
              ],
              values: { ...v },
            },
            base,
            (x) =>
              insetScene(base, {
                thickness: x.thickness as number,
                depth: x.depth as number,
                individual: x.individual as boolean,
              }),
          ),
        ),
      ),
    );
  };

  const openDeleteMenu = () => {
    const p = cursor ?? { x: 100, y: 100 };
    openMenuAt(
      layout.viewport,
      p.x,
      p.y,
      [
        { label: 'Vertices', action: () => runTool(DeleteOp('verts')) },
        { label: 'Edges', action: () => runTool(DeleteOp('edges')) },
        { label: 'Faces', action: () => runTool(DeleteOp('faces')) },
        { label: 'Only Faces', action: () => runTool(DeleteOp('onlyFaces')) },
        'separator',
        { label: 'Dissolve Vertices', action: () => runTool(DissolveOp('verts')) },
        { label: 'Dissolve Edges', action: () => runTool(DissolveOp('edges')) },
        { label: 'Dissolve Faces', action: () => runTool(DissolveOp('faces')) },
        { label: 'Limited Dissolve', disabled: true },
        'separator',
        { label: 'Edge Collapse', disabled: true },
        { label: 'Edge Loops', disabled: true },
      ],
      'Delete',
    );
  };

  const runMergeByDistance = (distance: number) => {
    const base = store.state;
    const r = mergeScene(base, 'distance', distance);
    status.report(`Removed ${r.removed} vertice${r.removed === 1 ? '' : 's'}`);
    if (r.scene === base) return;
    store.execute({ name: 'Merge by Distance', apply: () => r.scene });
    offerAdjust(
      { title: 'Merge by Distance', fields: [{ key: 'distance', label: 'Merge Distance', kind: 'distance' }], values: { distance } },
      base,
      (v) => {
        const again = mergeScene(base, 'distance', v.distance as number);
        status.report(`Removed ${again.removed} vertice${again.removed === 1 ? '' : 's'}`);
        return again.scene;
      },
    );
  };

  const startLoopCut = () => {
    if (transform || !cursor) return;
    const base = store.state;
    startModal(
      new LoopCutModal(pickContext(), cursor, (v) =>
        queueMicrotask(() =>
          offerAdjust(
            {
              title: 'Loop Cut and Slide',
              fields: [
                { key: 'cuts', label: 'Number of Cuts', kind: 'int', min: 1, max: 100 },
                { key: 'factor', label: 'Factor', kind: 'factor', min: -1, max: 1 },
              ],
              values: { cuts: v.cuts, factor: v.factor },
            },
            base,
            (x) => loopCutScene(base, v.objectId, v.edge, x.cuts as number, x.factor as number),
          ),
        ),
      ),
    );
  };

  const startBevel = (vertices: boolean) => {
    if (transform || !cursor || !BevelModal.canStart(store.state, vertices)) return;
    const base = store.state;
    const modal = new BevelModal(base, pickContext(), cursor, vertices, (v) =>
      queueMicrotask(() => {
        if (modal.unsupported) status.report(t('lab.bevelUnsupported'));
        offerAdjust(
          {
            title: 'Bevel',
            fields: [
              { key: 'width', label: 'Width', kind: 'distance' },
              ...(vertices ? [] : [{ key: 'segments', label: 'Segments', kind: 'int' as const, min: 1, max: 100 }]),
            ],
            values: { width: v.width, segments: v.segments },
          },
          base,
          (x) => bevelScene(base, x.width as number, (x.segments as number) ?? 1, vertices).scene,
        );
      }),
    );
    startModal(modal);
  };

  const openMergeMenu = () => {
    const p = cursor ?? { x: 100, y: 100 };
    openMenuAt(
      layout.viewport,
      p.x,
      p.y,
      [
        { label: 'At Center', action: () => runTool(MergeOp('center')) },
        { label: 'At Cursor', disabled: true },
        { label: 'Collapse', action: () => runTool(MergeOp('collapse')) },
        { label: 'By Distance', action: () => runMergeByDistance(MERGE_DISTANCE) },
      ],
      'Merge',
    );
  };

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
      else if (a.type === 'subdivisionSet') {
        store.execute(SubdivisionSetOp(a.level));
        if (levelsLimited(a.level)) status.report(t('lab.subsurfLevelLimit'));
      } else if (a.type === 'shadingPie') {
        openShadingPie();
      } else if (a.type === 'addMenu' && options.addObjects) {
        const p = cursor ?? { x: 100, y: 100 };
        openMenuAt(layout.viewport, p.x, p.y, addItems(), 'Add');
      }
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
        case 'transform':
          return startTransform(a.kind);
        case 'extrude':
          return startExtrude();
        case 'inset':
          return startInset();
        case 'deleteMenu':
          return openDeleteMenu();
        case 'mergeMenu':
          return openMergeMenu();
        case 'fill':
          return runTool(FillOp);
        case 'loopCut':
          return startLoopCut();
        case 'bevel':
          return startBevel(a.vertices);
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
        case 'shadingPie':
          return openShadingPie();
        case 'boxSelectModal':
          return; // handled by the input layer
      }
    },
    onScreenAction: (a: ScreenAction) => (a.type === 'undo' ? store.undo() : store.redo()),
    onInteractionChange: refreshInteraction,
    onNavigateWithoutMiddle: options.onNavigateWithoutMiddle,
    clickTool: () => clickTool,
    // Edit Mode's context menus (Vertex / Edge / Face) are not in the lab yet.
    onContextMenu: (x, y) => {
      if (!isEditMode(store.state)) openMenuAt(layout.viewport, x, y, shadeItems(), 'Object');
    },
  });

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
  // FIDELITY? Blender's Object menu and Object Context Menu have many more entries.
  const shadeItems = (): MenuItem[] => [
    { label: 'Shade Smooth', action: () => store.execute(ShadeSmoothOp) },
    { label: 'Shade Auto Smooth', action: () => store.execute(ShadeAutoSmoothOp) },
    { label: 'Shade Flat', action: () => store.execute(ShadeFlatOp) },
  ];
  attachMenu(layout.objectMenu, shadeItems);
  // Add (Shift+A): only the entries of the lab work. FIDELITY? Entries and order in Blender 5.2.
  const add = (what: AddKind) => () => store.execute(AddObjectOp(what, options.newLightLocation));
  const off = (...labels: string[]): MenuItem[] => labels.map((label) => ({ label, disabled: true }));
  const addItems = (): MenuItem[] => [
    {
      label: 'Mesh',
      submenu: [
        { label: 'Plane', action: add({ kind: 'mesh', primitive: 'plane' }) },
        { label: 'Cube', action: add({ kind: 'mesh', primitive: 'cube' }) },
        ...off('Circle'),
        { label: 'UV Sphere', action: add({ kind: 'mesh', primitive: 'uvSphere' }) },
        ...off('Ico Sphere'),
        { label: 'Cylinder', action: add({ kind: 'mesh', primitive: 'cylinder' }) },
        { label: 'Cone', action: add({ kind: 'mesh', primitive: 'cone' }) },
        { label: 'Torus', action: add({ kind: 'mesh', primitive: 'torus' }) },
        'separator',
        ...off('Grid', 'Monkey'),
      ],
    },
    ...off('Curve', 'Surface', 'Metaball', 'Text', 'Volume', 'Grease Pencil'),
    'separator',
    ...off('Armature', 'Lattice'),
    'separator',
    ...off('Empty', 'Image'),
    'separator',
    {
      label: 'Light',
      submenu: [
        { label: 'Point', action: add({ kind: 'light', lightType: 'POINT' }) },
        { label: 'Sun', action: add({ kind: 'light', lightType: 'SUN' }) },
        { label: 'Spot', action: add({ kind: 'light', lightType: 'SPOT' }) },
        { label: 'Area', action: add({ kind: 'light', lightType: 'AREA' }) },
      ],
    },
    ...off('Light Probe'),
    'separator',
    ...off('Camera', 'Speaker'),
    'separator',
    ...off('Force Field'),
    'separator',
    ...off('Collection Instance'),
  ];
  if (options.addObjects) attachMenu(layout.addMenu, addItems);
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

  // Shading workspace (Lab 05): the viewport on top, the Shader Editor below.
  if (options.shaderEditor) {
    const viewArea = layout.viewport.closest<HTMLElement>('.bl-area-view3d')!;
    const column = document.createElement('div');
    column.className = 'bl-column';
    viewArea.replaceWith(column);
    column.append(viewArea);
    new NodeEditor(column, {
      store,
      materialId: () => activeMaterialId(store.state),
      objects: () => store.state.objects.map((o) => ({ id: o.id, name: o.name })),
      emulate3Button: () => options.inputPrefs().emulate3ButtonMouse,
    });
  }

  view.requestRender();
  const settledProjection = () => {
    const size = view.viewportSize;
    const cam = activeCamera(store.state);
    return { projection: viewProjection(navigator.settled(), size, cam ? cameraData(store.state, cam) : null), size };
  };
  return {
    navigator,
    store,
    renderer: view,
    viewport: layout.viewport,
    settledProjection,
    showPropertiesTab: (id) => properties.select(id),
    onShadingChange: (fn) => {
      shadingListeners.add(fn);
      return () => shadingListeners.delete(fn);
    },
    setClickTool: (tool) => {
      clickTool = tool;
      layout.viewport.classList.toggle('is-click-tool', tool !== null);
    },
    surfaceAt: (x, y) => {
      const f = view.frame;
      const ray = screenRay(f.projection, f.size, x, y);
      return surfaceAlong(sceneTriangles(store.state), ray.origin, ray.direction);
    },
  };
}
