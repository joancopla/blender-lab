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
  and the modifier). Object Mode draws, picks and counts the evaluated mesh; Edit Mode edits the base.
- `modifiers/mirror.ts`, `array.ts`, `bisect.ts`: the algorithms. `operators/modifiers.ts`: add,
  remove, move and edit through the history.

### Replica UI

`ui/`: header, Outliner, N panel, status bar, menus, adjust panel, statistics, analyser panel
(`blender-ui.css`, English, as in Blender).

## Labs and pages

A lab is a `LabDefinition` in `src/labs/blender/<id>/index.ts`: stages (`stages.ts`), texts
(`ca.json` + `texts.ts`) and `createApp: () => new BlenderApp(options)`. Adding a lab does not
touch the core. HTML entry points live under `labs/<id>/index.html` at the project root and call
`mountLabPage(lab)` from `src/site/`.

## Deployment

`.github/workflows/deploy.yml` runs tests, builds with `BASE_PATH=/<repo>/` and publishes to
GitHub Pages on every push to `main`.
