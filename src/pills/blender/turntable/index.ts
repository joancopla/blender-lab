/**
 * Pill "Modela un plat de vinil": the DJ turntable of the wall visual. It continues the
 * scene of the speaker pill: a base (cube resized in Edit Mode, top inset and pushed in),
 * the record (a 32-sided cylinder with insets for the grooves and the label), the arm's
 * pivot and the arm with its headshell (Extrude and Scale), neon copied with Ctrl+L, and
 * Parent. Images and frames.json come from tools/pills/turntable/render_all.py.
 */
import type { PillDefinition, PillStep } from '../../../core/pills/pill';
import type { BlenderPillView, GridKind } from '../../../apps/blender/ui/pill-viewport';
import frames from './frames.json';
import { turntableInfo } from './info';

const images = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const EXTRUDE = 'Extrude Region and Move';

interface StepData {
  readonly id: string;
  readonly active: string;
  readonly mode?: BlenderPillView['mode'];
  readonly select?: 1 | 2 | 3;
  readonly rows: readonly (readonly string[])[];
  readonly op?: string;
  readonly camera?: boolean;
}

const DATA: readonly StepData[] = [
  { id: 'prepare', active: '', rows: [['Z', '~solid'], ['@left', '~cube', 'X', '~delete']], op: 'Delete' },
  {
    id: 'base',
    active: 'Cube',
    mode: 'Edit Mode',
    select: 1,
    rows: [
      ['Shift+A', '~cube'],
      ['Tab', 'S', 'X', '1.5', 'Enter'],
      ['S', 'Y', '1.1', 'Enter'],
      ['S', 'Z', '0.15', 'Enter'],
      ['Tab', 'G', 'Z', '0.15', 'Enter'],
    ],
    op: 'Add Cube · Resize · Move',
  },
  {
    id: 'top',
    active: 'Cube',
    mode: 'Edit Mode',
    select: 3,
    rows: [['Tab', '3', '@left', '~top'], ['I', '0.08', 'Enter', 'E', '-0.03', 'Enter']],
    op: `Inset Faces · ${EXTRUDE}`,
  },
  { id: 'platter', active: 'Cylinder.004', rows: [['Tab', 'Shift+A', '~cylinder'], ['~fields'], ['~place']], op: 'Add Cylinder' },
  {
    id: 'grooves',
    active: 'Cylinder.004',
    mode: 'Edit Mode',
    select: 3,
    rows: [
      ['Tab', '3', '@left', '~top'],
      ['I', '0.06', 'Enter', '~rim'],
      ['I', '0.15', 'Enter', '~times'],
      ['I', '0.2', 'Enter', '~label'],
    ],
    op: 'Inset Faces',
  },
  {
    id: 'platterNeon',
    active: 'Cube',
    rows: [
      ['Tab', '@left', '~base'],
      ['~material'],
      ['~wire'],
      ['@left', '~platter'],
      ['Shift+@left', '~base'],
      ['Ctrl+L', '~links'],
      ['Ctrl+L', '~mods'],
    ],
    op: 'Link/Transfer Data',
  },
  { id: 'pivot', active: 'Cylinder.005', rows: [['Shift+A', '~cylinder'], ['~fields'], ['~place']], op: 'Add Cylinder' },
  {
    id: 'arm',
    active: 'Cylinder.006',
    mode: 'Edit Mode',
    select: 3,
    rows: [
      ['Shift+A', '~cylinder'],
      ['~fields'],
      ['~place'],
      ['Tab', '3', '@left', '~tip'],
      ['E', '0.04', 'Enter', 'S', '2.4', 'Enter'],
      ['E', '0.16', 'Enter'],
    ],
    op: `Add Cylinder · ${EXTRUDE} · Resize`,
  },
  {
    id: 'armNeon',
    active: 'Cylinder.006',
    rows: [['Tab'], ['~material'], ['~wire'], ['@left', '~pivot'], ['Shift+@left', '~arm'], ['Ctrl+L', '~links'], ['Ctrl+L', '~mods']],
    op: 'Link/Transfer Data',
  },
  {
    id: 'parent',
    active: 'Cube',
    rows: [
      ['@left', '~platter'],
      ['Shift+@left', '~pivot'],
      ['Shift+@left', '~arm'],
      ['Shift+@left', '~base'],
      ['Ctrl+P', '~object'],
      ['N', '~rotation'],
    ],
    op: 'Make Parent',
  },
  { id: 'look', active: 'Cube', rows: [['Z', '~rendered'], ['Numpad 0', '~view']], camera: true },
];

const FRAMES = frames as unknown as readonly { header: string; grid: (readonly [GridKind, string])[] }[];

export const turntable: PillDefinition<BlenderPillView> = {
  ...turntableInfo,
  steps: DATA.map(
    (d, i): PillStep<BlenderPillView> => ({
      id: d.id,
      rows: d.rows,
      op: d.op,
      image: images[`./img/s${String(i + 1).padStart(2, '0')}.webp`]!,
      view: {
        header: FRAMES[i]!.header,
        mode: d.mode ?? 'Object Mode',
        selectMode: d.select,
        active: d.active,
        grid: FRAMES[i]!.grid,
        camera: d.camera,
      },
    }),
  ),
};
