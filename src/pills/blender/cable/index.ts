/**
 * Pill "Modela un cable amb una corba": a headphone cable lying on a table, made from a
 * Bézier curve (points and handles, Extrude, handle types, Bevel Depth) and rendered with
 * the factory camera and light. It does not depend on any other pill. Images and
 * frames.json (grid and Edit Mode overlay of each step) come from
 * tools/pills/cable/render_all.py, which runs Blender's own curve operators.
 */
import type { PillDefinition, PillStep } from '../../../core/pills/pill';
import type { BlenderPillView, GridKind, OverlayItem } from '../../../apps/blender/ui/pill-viewport';
import frames from './frames.json';
import { cableInfo } from './info';

const images = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const CURVE = 'BézierCurve';

interface StepData {
  readonly id: string;
  readonly mode: BlenderPillView['mode'];
  readonly active?: string;
  readonly rows: readonly (readonly string[])[];
  readonly op?: string;
  readonly render?: boolean;
}

const DATA: readonly StepData[] = [
  { id: 'curve', mode: 'Object Mode', rows: [['X', '~delete'], ['Shift+A', '~menu']], op: 'Delete · Bézier' },
  { id: 'edit', mode: 'Edit Mode', rows: [['Tab']] },
  { id: 'select', mode: 'Edit Mode', rows: [['@left', '~where']] },
  {
    id: 'extrude',
    mode: 'Edit Mode',
    rows: [
      ['E', 'Y', '1.2', 'Enter'],
      ['E', 'X', '-1', 'Enter'],
      ['E', 'Y', '-1.2', 'Enter'],
      ['E', 'Y', '-1', 'Enter'],
      ['E', 'X', '-1.5', 'Enter'],
    ],
    op: 'Extrude Curve and Move',
  },
  { id: 'auto', mode: 'Edit Mode', rows: [['A', 'V', '~auto']], op: 'Set Handle Type' },
  { id: 'open', mode: 'Edit Mode', rows: [['@left', '~where'], ['S', '1.4', 'Enter']], op: 'Resize' },
  { id: 'cross', mode: 'Edit Mode', rows: [['@left', '~where'], ['G', 'Z', '0.06', 'Enter']], op: 'Move' },
  { id: 'bevel', mode: 'Object Mode', rows: [['Tab'], ['~depth'], ['~caps']] },
  {
    id: 'floor',
    mode: 'Object Mode',
    active: 'Plane',
    rows: [['G', 'Z', '0.03', 'Enter'], ['Shift+A', '~plane', 'S', '10', 'Enter']],
    op: 'Move · Add Plane · Resize',
  },
  { id: 'material', mode: 'Object Mode', rows: [['@left', '~cable'], ['~new'], ['~values']] },
  {
    id: 'render',
    mode: 'Object Mode',
    active: 'Camera',
    rows: [['Numpad 0', '~view'], ['@left', '~camera'], ['~lens'], ['F12', '~render']],
    op: 'Render Image',
    render: true,
  },
];

const FRAMES = frames as unknown as readonly {
  header: string;
  grid: (readonly [GridKind, string])[];
  overlay: OverlayItem[];
}[];

export const cable: PillDefinition<BlenderPillView> = {
  ...cableInfo,
  steps: DATA.map((d, i): PillStep<BlenderPillView> => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: d.id,
      rows: d.rows,
      op: d.op,
      image: images[`./img/s${n}.webp`]!,
      view: {
        header: FRAMES[i]!.header,
        mode: d.mode,
        active: d.active ?? CURVE,
        grid: FRAMES[i]!.grid,
        overlay: FRAMES[i]!.overlay,
        render: d.render,
      },
    };
  }),
};
