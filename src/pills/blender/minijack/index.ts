/**
 * Pill "Modela un minijack": a 3.5 mm jack with a rubber handle from an 8-sided cylinder.
 * Images and frames.json come from tools/pills/minijack/render_all.py (run in Blender).
 * Values are in a scaled-up model (1 unit = 1 cm), so students type small round numbers.
 */
import type { PillDefinition, PillStep } from '../../../core/pills/pill';
import type { BlenderPillView, GridKind } from '../../../apps/blender/ui/pill-viewport';
import frames from './frames.json';
import { minijackInfo } from './info';

const images = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const image = (name: string): string => images[`./img/${name}.webp`]!;

interface StepData {
  readonly id: string;
  readonly mode: BlenderPillView['mode'];
  readonly select?: 1 | 2 | 3;
  readonly rows: readonly (readonly string[])[];
  readonly op?: string;
  /** Show the Cycles beauty render instead of the viewport. */
  readonly render?: boolean;
}

const EXTRUDE = 'Extrude Region and Move';

const DATA: readonly StepData[] = [
  { id: 'cylinder', mode: 'Object Mode', rows: [['Shift+A', '~menu'], ['~fields']], op: 'Add Cylinder' },
  { id: 'edit', mode: 'Edit Mode', select: 3, rows: [['Tab', '~then', '3', '~then', 'Alt+A']] },
  { id: 'selectTop', mode: 'Edit Mode', select: 3, rows: [['@left', '~where']] },
  { id: 'insetCollar', mode: 'Edit Mode', select: 3, rows: [['I', '0.1', 'Enter']], op: 'Inset Faces' },
  { id: 'extrudeCollar', mode: 'Edit Mode', select: 3, rows: [['E', '0.2', 'Enter']], op: EXTRUDE },
  { id: 'insetPlug', mode: 'Edit Mode', select: 3, rows: [['I', '0.09', 'Enter']], op: 'Inset Faces' },
  { id: 'sleeve', mode: 'Edit Mode', select: 3, rows: [['E', '0.75', 'Enter']], op: EXTRUDE },
  {
    id: 'rings',
    mode: 'Edit Mode',
    select: 3,
    rows: [
      ['E', '0.1', 'Enter', '~insulator'],
      ['E', '0.25', 'Enter', '~ring'],
      ['E', '0.1', 'Enter', '~insulator'],
    ],
    op: EXTRUDE,
  },
  {
    id: 'tip',
    mode: 'Edit Mode',
    select: 3,
    rows: [
      ['E', '0.05', 'Enter', 'S', '0.7', 'Enter', '~groove'],
      ['E', '0.07', 'Enter', 'S', '1.4', 'Enter', '~lip'],
      ['E', '0.2', 'Enter', '~body'],
      ['E', '0.1', 'Enter', 'S', '0.45', 'Enter', '~point'],
    ],
    op: `${EXTRUDE} · Resize`,
  },
  { id: 'selectBottom', mode: 'Edit Mode', select: 3, rows: [['@middle', '~orbit'], ['@left', '~where']] },
  {
    id: 'strainRelief',
    mode: 'Edit Mode',
    select: 3,
    rows: [
      ['E', '0.3', 'Enter', 'S', '0.8', 'Enter'],
      ['E', '0.5', 'Enter', 'S', '0.7', 'Enter'],
    ],
    op: `${EXTRUDE} · Resize`,
  },
  { id: 'cable', mode: 'Edit Mode', select: 3, rows: [['I', '0.08', 'Enter'], ['E', '1.5', 'Enter']], op: `Inset Faces · ${EXTRUDE}` },
  {
    id: 'grip',
    mode: 'Edit Mode',
    select: 2,
    rows: [
      ['Ctrl+R', '~wheel', '@left', '@right'],
      ['2', 'Alt+@left', 'Shift+Alt+@left', '~times'],
      ['S', 'Shift+Z', '0.9', 'Enter'],
    ],
    op: 'Loop Cut and Slide · Resize',
  },
  { id: 'subsurf', mode: 'Object Mode', rows: [['Tab', 'Ctrl+2'], ['@right', '~smooth']], op: 'Subdivision Set · Shade Smooth' },
  { id: 'support', mode: 'Edit Mode', select: 2, rows: [['Tab'], ['Ctrl+R', '@left', '~slide', '@left']], op: 'Loop Cut and Slide' },
  {
    id: 'bevel',
    mode: 'Edit Mode',
    select: 2,
    rows: [
      ['Alt+@left', '~first'],
      ['Shift+Alt+@left', '~more'],
      ['Ctrl+B', '0.02', 'Enter'],
    ],
    op: 'Bevel',
  },
  { id: 'materials', mode: 'Object Mode', rows: [['~tab', '+', '~new'], ['Alt+@left', '~assign']], op: 'Assign' },
  { id: 'final', mode: 'Object Mode', rows: [['Tab', 'Numpad .', '~frame'], ['@middle', '~orbit']], render: true },
];

const FRAMES = frames as unknown as readonly { header: string; grid: (readonly [GridKind, string])[] }[];

export const minijack: PillDefinition<BlenderPillView> = {
  ...minijackInfo,
  steps: DATA.map(
    (d, i): PillStep<BlenderPillView> => ({
      id: d.id,
      rows: d.rows,
      op: d.op,
      image: d.render ? image('final') : image(`s${String(i + 1).padStart(2, '0')}`),
      view: {
        header: FRAMES[i]!.header,
        mode: d.mode,
        selectMode: d.select,
        active: 'Cylinder',
        grid: FRAMES[i]!.grid,
        render: d.render,
      },
    }),
  ),
};
