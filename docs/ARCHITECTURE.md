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

## Scene

`scene/scene.ts` is the data model (single source of truth). In phase 1 it is only read; from
phase 2 on it changes only through operators, so undo always works.

## Labs

A lab is a `LabDefinition` (`engine/lab.ts`) under `src/labs/<id>/`. `engine/app.ts` mounts the
engine for a lab. HTML entry points live under `labs/<id>/index.html` at the project root.

## Deployment

`.github/workflows/deploy.yml` runs tests, builds with `BASE_PATH=/<repo>/` and publishes to
GitHub Pages on every push to `main`.
