# Architecture

See `CLAUDE.md` for the rules. This file describes how the code is laid out today.

## Coordinates

Everything is Blender space (Z up, metres, degrees in the UI). `engine/coords.ts` is the only
place that knows about three.js' Y-up: the three.js scene has a root group rotated −90° around
X, and every object, the viewport camera and the grid live inside it using Blender coordinates.
Y-up primitive geometries are converted with `yUpGeometryToBlender`.

## Viewport navigation

- `viewport/view-state.ts`: pure functions over a `ViewState` modelled on Blender's
  `RegionView3D` (view rotation, target, distance, projection, axis view, camera framing).
  All navigation maths lives here and is unit-tested.
- `viewport/projection.ts`: frustum maths (lens, sensor fit, clip range).
- `viewport/navigator.ts`: holds the state, turns actions into new states and runs
  Smooth View transitions. No DOM, no three.js.
- `viewport/renderer.ts`: reads the scene and the navigator and draws them on demand. Grid is a
  separate pass: after the objects in perspective (depth-tested floor), before them in axis
  orthographic views (backdrop).
- `viewport/nav-gizmo.ts`: the navigation gizmo (canvas 2D + DOM buttons).

## Input

- `input/keymap.ts`: declarative keymap and pure resolution of keys and mouse buttons, including
  Emulate Numpad and Emulate 3 Button Mouse. Unit-tested.
- `input/viewport-input.ts`: DOM listeners. Keys go to the viewport only while the pointer is
  over it, as in Blender.

## Scene and operators

- `scene/scene.ts` is the data model (single source of truth).
- `scene/store.ts` (SceneStore) holds the state and the undo history. Every change is an
  `OperatorCall` run through `execute`, which records one undo step (only if something changed)
  and appends to the operation log used by stage checks.
- `operators/` contains pure operator functions (`select.ts`: click, box, select all, Outliner).

## Selection

- `input/select-interaction.ts`: pure state machine for click, drag box and the B modal.
- `viewport/picking.ts`: click picking in Blender space (ray vs primitive triangles; screen
  distance for camera and light wires), with click cycling.
- `viewport/selection-passes.ts`: object-ID render pass used for mesh outlines and for box
  select (visible objects inside the rectangle).
- `ui/outliner.ts`: Outliner rows; clicks run operators.

## Modal operators and panels

- `operators/transform.ts`: pure G/R/S state machine (constraints, numeric input, snapping,
  precision). `transform-session.ts` connects it to input, the store preview and the UI.
- `SceneStore.setPreview` shows uncommitted states (modal operators, N panel drags); confirming
  runs one operator, cancelling logs a `cancel` entry.
- `ui/sidebar.ts` + `ui/number-field.ts`: N panel. `ui/menu.ts`: View and Select menus.

## Stages

- `stages/types.ts`: a stage is data (texts as i18n keys, scene, ghosts, markers, keys) plus a
  `check(ctx)` that reads the scene state, the view state and the operation log.
- `stages/runner.ts`: loads stages, re-checks on every scene/view change, hints, progress.
- `stages/ghost-match.ts`: symmetry-aware comparison with ghost silhouettes.
- `viewport/lab-elements.ts`: ghosts and face markers (lab elements, not scene objects).

## Labs and pages

A lab is a `LabDefinition` (`engine/lab.ts`) under `src/labs/<id>/`: id, texts, initial scene
and stages. Adding a lab does not require touching the engine. `engine/app.ts` mounts the Blender
replica; `site/lab-page.ts` builds the lab page (intro, lab column, replica, "Al Blender real");
`site/index.ts` is the collection index. HTML entry points live under `labs/<id>/index.html` at
the project root. Lab UI (Catalan, `site/lab.css`) is styled apart from the Blender replica
(`engine/ui/blender-ui.css`).

## Preferences and progress

`lab-prefs.ts` (emulations, key overlay) and `stages/progress.ts` use localStorage, always
wrapped in try/catch; without storage everything still works for the visit.

## Deployment

`.github/workflows/deploy.yml` runs tests, builds with `BASE_PATH=/<repo>/` and publishes to
GitHub Pages on every push to `main`.
