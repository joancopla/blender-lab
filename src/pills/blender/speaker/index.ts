/**
 * Pill "Modela un altaveu": two neon speakers for the wall visual. It continues the scene
 * of the neon look pill: a box (cube resized in Edit Mode, front inset and pushed in), the
 * woofer and the tweeter (a 32-sided cylinder shaped with Inset, Extrude and Scale, then
 * Shift+D), the neon materials, Parent and a second speaker. Images and frames.json come from
 * tools/pills/speaker/render_all.py, which runs Blender's own operators.
 */
import type { PillDefinition, PillStep } from '../../../core/pills/pill';
import type { BlenderPillView, GridKind } from '../../../apps/blender/ui/pill-viewport';
import frames from './frames.json';
import { speakerInfo } from './info';

const images = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const EXTRUDE = 'Extrude Region and Move';

interface StepData {
  readonly id: string;
  readonly active: string;
  readonly mode?: BlenderPillView['mode'];
  readonly select?: 1 | 2 | 3;
  readonly rows: readonly (readonly string[])[];
  readonly op?: string;
  /** Rendered through the camera instead of a Solid viewport image. */
  readonly camera?: boolean;
}

const DATA: readonly StepData[] = [
  { id: 'prepare', active: '', rows: [['Z', '~solid'], ['@left', '~torus', 'X', '~delete']], op: 'Delete' },
  {
    id: 'box',
    active: 'Cube.001',
    mode: 'Edit Mode',
    select: 1,
    rows: [
      ['Shift+A', '~cube'],
      ['G', 'X', '-4', 'Enter'],
      ['G', 'Z', '1', 'Enter'],
      ['Tab', 'S', 'X', '0.6', 'Enter'],
      ['S', 'Y', '0.5', 'Enter'],
    ],
    op: 'Add Cube · Move · Resize',
  },
  {
    id: 'front',
    active: 'Cube.001',
    mode: 'Edit Mode',
    select: 3,
    rows: [['3', '@left', '~front'], ['I', '0.06', 'Enter', 'E', '-0.04', 'Enter']],
    op: `Inset Faces · ${EXTRUDE}`,
  },
  { id: 'woofer', active: 'Cylinder', rows: [['Tab', 'Shift+A', '~cylinder'], ['~fields'], ['~place']], op: 'Add Cylinder' },
  {
    id: 'cone',
    active: 'Cylinder',
    mode: 'Edit Mode',
    select: 3,
    rows: [
      ['Tab', '3', '@left', '~cap'],
      ['I', '0.04', 'Enter', 'E', '0.015', 'Enter'],
      ['I', '0.02', 'Enter', 'E', '-0.05', 'Enter'],
      ['S', '0.45', 'Enter'],
      ['E', '0.03', 'Enter', 'S', '0.7', 'Enter'],
    ],
    op: `Inset Faces · ${EXTRUDE} · Resize`,
  },
  { id: 'wooferNeon', active: 'Cylinder', rows: [['Tab'], ['~material'], ['~wire']], op: 'Add Modifier' },
  { id: 'tweeter', active: 'Cylinder.001', rows: [['Shift+D', 'Z', '0.8', 'Enter'], ['S', '0.4', 'Enter']], op: 'Duplicate Objects · Resize' },
  { id: 'boxNeon', active: 'Cube.001', rows: [['@left', '~box'], ['~material'], ['~wire']], op: 'Add Modifier' },
  {
    id: 'parent',
    active: 'Cube.001',
    rows: [
      ['@left', '~woofer'],
      ['Shift+@left', '~tweeter'],
      ['Shift+@left', '~box'],
      ['Ctrl+P', '~object'],
      ['N', '~fields'],
    ],
    op: 'Make Parent',
  },
  { id: 'second', active: 'Cube.002', rows: [['Shift+D', '@right', '~copy'], ['~fields']], op: 'Duplicate Objects' },
  { id: 'look', active: 'Cube.002', rows: [['Z', '~rendered'], ['Numpad 0', '~view']], camera: true },
];

const FRAMES = frames as unknown as readonly { header: string; grid: (readonly [GridKind, string])[] }[];

export const speaker: PillDefinition<BlenderPillView> = {
  ...speakerInfo,
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
