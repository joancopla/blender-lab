/**
 * Pill "Look neó": the Lab 11 recipe step by step, for Blender 5.1. A cube and a grid that
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
}

const DATA: readonly StepData[] = [
  { id: 'camera', active: 'Camera', rows: [['Numpad 0', '~view'], ['@left', '~frame'], ['~lens']] },
  { id: 'off', active: '', rows: [['Z', '~rendered'], ['@left', '~light', 'X', '~delete'], ['~world']], op: 'Delete' },
  {
    id: 'cube',
    active: 'Cube',
    rows: [['@left', '~cube', 'G', 'Z', '1', 'Enter'], ['~name'], ['~emission'], ['~wire']],
    op: 'Move · Add Modifier',
  },
  { id: 'grid', active: 'Grid', rows: [['Shift+A', '~grid'], ['~adjust'], ['~wire'], ['~material']], op: 'Add Grid · Add Modifier' },
  { id: 'bloom', active: 'Grid', rows: [['~editor', '~new'], ['Shift+A', '~glare'], ['~drop'], ['~always']] },
  { id: 'standard', active: 'Grid', rows: [['~where'], ['~standard']] },
  { id: 'second', active: 'Torus', rows: [['Shift+A', '~torus'], ['N', '~fields'], ['~material'], ['~wire']], op: 'Add Torus · Add Modifier' },
  { id: 'wall', active: 'Grid', rows: [['@left', '~grid'], ['~thickness'], ['~size']] },
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
      // Step 1 is still in Solid; Rendered from step 2 on.
      mode: 'Object Mode',
      active: d.active,
      grid: [],
      camera: !d.render,
      render: d.render,
    },
  })),
};
