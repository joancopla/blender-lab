/**
 * Pill "Look neó": the Lab 11 recipe step by step, for Blender 5.1, one action per step for
 * students who have never opened Blender (the first step maps the window). A cube and a grid that
 * glow on black (Emission, Wireframe), a Glare Bloom in the compositor, Standard instead of
 * AgX and a second, balanced colour. It starts from the factory scene and does not depend on
 * any other pill. Images come from tools/pills/neon/render_all.py (EEVEE through the factory
 * camera, with the scene's compositor).
 */
import type { PillDefinition, PillStep } from '../../../core/pills/pill';
import type { BlenderPillView } from '../../../apps/blender/ui/pill-viewport';
import { neonInfo } from './info';

const images = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

interface StepData {
  readonly id: string;
  /** Active object; empty when there is none (after deleting the light). */
  readonly active: string;
  readonly rows: readonly (readonly string[])[];
  readonly op?: string;
  readonly render?: boolean;
  /** Map of the whole window instead of the viewport (first step). */
  readonly screen?: boolean;
}

const DATA: readonly StepData[] = [
  { id: 'screen', active: 'Cube', rows: [['~viewport'], ['~outliner'], ['~properties'], ['~timeline'], ['Ctrl+Z', '~undo']], screen: true },
  { id: 'camera', active: 'Cube', rows: [['~view', 'Numpad 0'], ['~menu']] },
  { id: 'select', active: 'Camera', rows: [['@left', '~outliner']] },
  { id: 'lens', active: 'Camera', rows: [['@left', '~tab'], ['~field'], ['~type', '35', 'Enter']] },
  { id: 'lift', active: 'Cube', rows: [['@left', '~cube'], ['G', 'Z', '1', 'Enter']], op: 'Move' },
  { id: 'rendered', active: 'Cube', rows: [['Z', '~pie', '~rendered']] },
  { id: 'light', active: '', rows: [['@left', '~light'], ['~over', 'X', '~delete']], op: 'Delete' },
  { id: 'world', active: '', rows: [['@left', '~tab'], ['@left', '~color'], ['~hex', 'Enter']] },
  { id: 'name', active: 'Cube', rows: [['@left', '~cube'], ['@left', '~tab'], ['~rename', 'Enter']] },
  { id: 'emission', active: 'Cube', rows: [['~scroll'], ['@left', '~open'], ['~color', 'Enter'], ['~strength', 'Enter']] },
  { id: 'wire', active: 'Cube', rows: [['@left', '~tab'], ['~add']], op: 'Add Modifier' },
  { id: 'grid', active: 'Grid', rows: [['Shift+A', '~add'], ['@left', '~panel'], ['~values'], ['F9', '~redo']], op: 'Add Grid' },
  { id: 'gridWire', active: 'Grid', rows: [['~wire'], ['~browse'], ['@left', '~pick']], op: 'Add Modifier' },
  { id: 'compositor', active: 'Grid', rows: [['~border'], ['~editor'], ['@left', '~new'], ['Home', '~home']] },
  { id: 'glare', active: 'Grid', rows: [['Shift+A', '~add'], ['~drop', '@left']] },
  { id: 'always', active: 'Grid', rows: [['@left', '~menu'], ['~always']] },
  { id: 'standard', active: 'Grid', rows: [['@left', '~tab'], ['~where'], ['~standard']] },
  { id: 'torus', active: 'Torus', rows: [['Shift+A', '~add'], ['N', '~panel'], ['~location', 'Tab'], ['~rotation', 'Enter']], op: 'Add Torus' },
  { id: 'orange', active: 'Torus', rows: [['~new'], ['~rename', 'Enter'], ['~emission']] },
  { id: 'torusWire', active: 'Torus', rows: [['~wire']], op: 'Add Modifier' },
  { id: 'thickness', active: 'Grid', rows: [['@left', '~grid'], ['~thickness', 'Enter']] },
  { id: 'size', active: 'Grid', rows: [['@left', '~glare'], ['~size', 'Enter']] },
  { id: 'render', active: 'Grid', rows: [['F12', '~render'], ['~save']], op: 'Render Image · Save As', render: true },
];

export const neon: PillDefinition<BlenderPillView> = {
  ...neonInfo,
  steps: DATA.map((d, i): PillStep<BlenderPillView> => ({
    id: d.id,
    rows: d.rows,
    op: d.op,
    image: images[`./img/s${String(i + 1).padStart(2, '0')}.webp`]!,
    view: {
      header: 'Camera Perspective',
      // Steps 1-5 are still in Solid; Rendered from step 6 on.
      mode: 'Object Mode',
      active: d.active,
      grid: [],
      camera: !d.render && !d.screen,
      render: d.render,
      screen: d.screen,
    },
  })),
};
