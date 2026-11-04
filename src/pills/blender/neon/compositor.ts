/**
 * Compositor drawings of the neon pill, in node editor pixels. Positions come from what the
 * compositor's New builds in 5.1.2 (node locations Render Layers -390,100 · Reroute 100,65 ·
 * Group Output 200,100 · Viewer 200,20), mapped with x + 610 and 220 - y.
 * FIDELITY? The Glare position after dropping it on the link, and how far auto-offset pushes
 * the Reroute and the outputs to the right.
 */
import type { PillNode, PillNodeEditor } from '../../../apps/blender/ui/pill-viewport';

const renderLayers: PillNode = {
  id: 'rl',
  title: 'Render Layers',
  kind: 'input',
  x: 220,
  y: 120,
  w: 240,
  outputs: ['Image', 'Alpha'],
  fields: ['Scene', 'ViewLayer'],
};

function outputs(dx: number): PillNode[] {
  return [
    { id: 'reroute', title: '', kind: 'reroute', x: 710 + dx, y: 158, w: 0 },
    { id: 'out', title: 'Group Output', kind: 'output', x: 810 + dx, y: 120, w: 140, inputs: ['Image'] },
    { id: 'viewer', title: 'Viewer', kind: 'output', x: 810 + dx, y: 200, w: 140, inputs: ['Image'] },
  ];
}

const glare = (fields: readonly string[]): PillNode => ({
  id: 'glare',
  title: 'Glare',
  kind: 'filter',
  x: 500,
  y: 120,
  w: 160,
  outputs: ['Image', 'Glare', 'Highlights'],
  fields,
  inputs: ['Image'],
});

/** Step "compositor": an empty editor with the New button. */
export const EMPTY: PillNodeEditor = { empty: true };

/** Step "new": the tree New builds. */
export const NEW_TREE: PillNodeEditor = {
  nodes: [renderLayers, ...outputs(0)],
  links: [
    ['rl', 'reroute'],
    ['reroute', 'out'],
    ['reroute', 'viewer'],
  ],
  highlight: 'reroute',
};

function withGlare(fields: readonly string[], highlight?: string): PillNodeEditor {
  return {
    nodes: [renderLayers, glare(fields), ...outputs(90)],
    links: [
      ['rl', 'glare'],
      ['glare', 'reroute'],
      ['reroute', 'out'],
      ['reroute', 'viewer'],
    ],
    highlight,
  };
}

/** Step "glare": the Glare inserted between Render Layers and the Reroute. */
export const GLARE: PillNodeEditor = withGlare(['Bloom ▾', 'Medium ▾'], 'glare');
/** Step "always": the same tree, nothing to look at. */
export const GLARE_DONE: PillNodeEditor = withGlare(['Bloom ▾', 'Medium ▾']);
/** Step "size": Size 0.7 in the Glare panel of the node. */
export const GLARE_SIZE: PillNodeEditor = withGlare(['Bloom ▾', 'Medium ▾', 'Size 0.700'], 'glare');
