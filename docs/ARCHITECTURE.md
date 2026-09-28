# Architecture

See `CLAUDE.md` for the rules. This file describes how the code is laid out today.

## Layers

`labs → apps → core`, never the other way. `src/core/layers.test.ts` parses every import and
fails if `core` imports `apps`, `labs` or three.js, or if `apps` imports `labs`.

- `src/core/`: anything a replica of any program would use (a 2D timeline tool included).
- `src/apps/blender/`: everything specific to Blender (three.js lives only here).
- `src/labs/blender/NN-name/`: stage data and Catalan texts of one lab.
- `src/site/`: index page and HTML entry points' scripts.

## The contract (`core/app-contract.ts`)

`ReplicatedApp<State, Setup, Decorations>` is what the core sees of a program:

- `mount(container, {preferences, suggestPreference})` / `unmount()`;
- `getState()` (typed, read-only) and `onChange(fn)`;
- `load(setup)`: a stage's starting point (clears history and log);
- `log`: operations confirmed, cancelled, undone and redone since the last load
  (`core/history/store.ts`, `LogEntry`);
- `decorate(decorations)`: lab elements a check result asks for (Blender: hints, markers seen);
- `overlayHost()` / `inputHost()`: where the key overlay draws and what it listens to;
- `preferences`: boolean preferences the program offers (shown by the shell);
- `renderLabTools?(container)`: optional lab tools in the panel (Blender: mesh analyser).

Blender implements it in `apps/blender/blender-app.ts` (`BlenderApp`), over `mountBlender`
(`apps/blender/app.ts`), which builds the replica itself.

## Core

- `history/store.ts`: `HistoryStore<S>`, command-pattern undo/redo, preview states for modal
  operators, operation log. Blender's `SceneStore` is `HistoryStore<SceneState>`.
- `input/keymap.ts`: declarative keymap items and pure matching; `WheelAccumulator`.
  `input/select-interaction.ts`: click/box/B-modal state machine. `input/numeric-input.ts`.
- `stages/`: generic stage types (`StageDefinition<State, Setup, Decorations>` with `setup()` and
  `check(ctx)`), `StageRunner` (loads, re-checks on every change, hints, progress) and
  `ProgressStore` (localStorage, try/catch).
- `shell/`: the wrapper around the replica, styled by `docs/DESIGN.md`: lab page
  (`lab-page.ts`), stage panel, preferences, key overlay, device warning.
- `i18n/`: `registerTexts` (deep merge) and `t(key)`. The core registers `core/i18n/ca.json`;
  programs and labs register theirs in a `texts.ts` next to their `ca.json`.
- `lab.ts`: `LabDefinition` (id, name, stages, `createApp()`, page lists).

## Blender (`apps/blender/`)

### Coordinates

Everything is Blender space (Z up, metres, degrees in the UI). `coords.ts` is the only place
that knows about three.js' Y-up: the three.js scene has a root group rotated −90° around X, and
every object, the viewport camera and the grid live inside it using Blender coordinates.

### Stages

`stages/types.ts`: `BlenderState` (scene, view, projection, size), `BlenderSetup` (scene, view,
ghosts, markers, reference meshes, analyser), `BlenderDecorations`, and `toCoreLab` which turns
Blender stage lists into core ones. `ghost-match.ts` and `silhouette.ts` are check helpers.

### Viewport navigation

- `viewport/view-state.ts`: pure functions over a `ViewState` modelled on Blender's
  `RegionView3D`. All navigation maths lives here and is unit-tested.
- `viewport/projection.ts`: frustum maths. `viewport/navigator.ts`: state and Smooth View.
- `viewport/renderer.ts`: draws the scene on demand. `viewport/nav-gizmo.ts`: navigation gizmo.

### Input

- `input/keymap.ts`: Blender 5.2 keymap tables over `core/input/keymap.ts`, plus Emulate Numpad
  and Emulate 3 Button Mouse. `input/viewport-input.ts`: DOM listeners (keys go to the viewport
  only while the pointer is over it, as in Blender).

### Scene, meshes and operators

- `scene/scene.ts`: data model (single source of truth). `scene/store.ts`: `SceneStore`.
- `mesh/`: editable meshes (vertices, edges, n-gon faces) and edit operations.
- `operators/`: pure operator functions run through the store. `transform-session.ts` and
  `edit/` connect modal operators to input, preview and UI.

### Modifiers

- `modifiers/types.ts`: modifier data stored on `MeshObject.modifiers` (immutable, Blender defaults).
- `modifiers/stack.ts`: `evaluatedMesh(object, scene)` runs the base mesh through the enabled
  modifiers in order, with a per-object, per-modifier cache (reference equality on the input mesh
  and the modifier), so dragging a field only recomputes that modifier and the ones after it.
  Both modes draw the evaluated mesh (Edit Mode: modifiers with "Edit Mode" on, with the base mesh
  drawn over it as the cage); picking of objects, Statistics, Dimensions and framing use it too.
  Edit Mode edits and picks components on the base mesh.
- `modifiers/mirror.ts`, `array.ts`, `bisect.ts`, `subsurf.ts`, `bevel.ts`, `solidify.ts`: the
  algorithms. `operators/modifiers.ts`: add, remove, duplicate, move, edit, Apply and Subdivision
  Set through the history. `edit/mirror-clip.ts`: Mirror Clipping while transforming.

### Shading

- `MeshData.smoothFaces` (optional, parallel to `faces`) is Shade Smooth per face; every edit
  operation and modifier carries it to the faces it creates (`smoothFrom` in `mesh-data.ts`).
- `MeshObject.autoSmooth` / `autoSmoothAngleDeg`: Object Data > Normals > Auto Smooth, kept on the
  object (each object has its own mesh), applied to the evaluated mesh when drawing.
- `mesh/normals.ts`: `cornerNormals` (flat faces: face normal; smooth faces: corner-angle weighted
  average across edges that are not sharp). `viewport/mesh-geometry.ts` copies them into the
  three.js geometry; the material must not use `flatShading`.
- `operators/shade.ts`: Shade Smooth / Auto Smooth / Flat and the Auto Smooth properties.

### Replica UI

`ui/`: header, Outliner, N panel, status bar, menus, adjust panel, statistics, analyser panel
(`blender-ui.css`, English, as in Blender).

`ui/properties/` (shared by Labs 03–07): the Properties Editor under the Outliner.
- `tabs.ts`: tabs in Blender's order per active object type; a lab enables some
  (`MountOptions.propertiesTabs`), the rest are shown inactive. A stage can open one
  (`BlenderSetup.propertiesTab`).
- `properties-editor.ts`: tab strip and the active tab's view (`TabViewFactory`), which keeps its
  own DOM and is updated on every change.
- `widgets.ts`: split-layout property widgets, built once and refreshed with `update()`, so a field
  being dragged is never rebuilt under the pointer (a drag is a store preview).
- `modifiers-tab.ts` + `modifier-panels.ts` + `add-modifier.ts`: the Modifiers tab. `data-tab.ts`:
  Object Data > Normals.

### Performance (Lab 03 phase 6)

Measured in Node on the development machine, a cube with Mirror, Array (3) and Subdivision
(level 3), 2304 faces: evaluating the stack ~4 ms, normals and geometry ~6 ms per drag frame.
The hot paths use numeric edge keys (`MeshTopology`, `cornerNormals`) and a fast path for convex
quads in `triangulateFace`. Stage checks run on every change, view included, so Lab 03 caches its
silhouette comparisons per evaluated mesh and placement. Levels Viewport is limited to 3.
Still to be measured on a classroom computer.

## Labs and pages

A lab is a `LabDefinition` in `src/labs/blender/<id>/index.ts`: stages (`stages.ts`), texts
(`ca.json` + `texts.ts`) and `createApp: () => new BlenderApp(options)`. Adding a lab does not
touch the core. HTML entry points live under `labs/<id>/index.html` at the project root and call
`mountLabPage(lab)` from `src/site/`.

## Deployment

`.github/workflows/deploy.yml` runs tests, builds with `BASE_PATH=/<repo>/` and publishes to
GitHub Pages on every push to `main`.
