/**
 * Pill "Il·lumina i renderitza el minijack": a studio sweep, a camera, four area lights
 * aimed with Track To, materials, a dark World and a Cycles render. It starts from the
 * jack of the minijack pill. Images and frames.json come from
 * tools/pills/lighting/render_all.py, which uses the same values as the texts.
 */
import type { PillDefinition, PillStep } from '../../../core/pills/pill';
import type { BlenderPillView, GridKind } from '../../../apps/blender/ui/pill-viewport';
import frames from './frames.json';
import { lightingInfo } from './info';

const images = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

type Shot = 'viewport' | 'camera' | 'render';

interface StepData {
  readonly id: string;
  readonly active: string;
  readonly shot: Shot;
  readonly rows: readonly (readonly string[])[];
  readonly op?: string;
}

const DATA: readonly StepData[] = [
  {
    id: 'wall',
    active: 'Plane',
    shot: 'viewport',
    rows: [
      ['Shift+A', '~plane'],
      ['Tab', 'S', '10', 'Enter'],
      ['2', '@left', '~backEdge'],
      ['E', 'Z', '8', 'Enter'],
    ],
    op: 'Add Plane · Extrude Region and Move',
  },
  {
    id: 'curve',
    active: 'Plane',
    shot: 'viewport',
    rows: [['@left', '~corner'], ['Ctrl+B', '3', '~segments', 'Enter'], ['Tab', '@right', '~smooth']],
    op: 'Bevel · Shade Smooth',
  },
  {
    id: 'lay',
    active: 'Cylinder',
    shot: 'viewport',
    rows: [
      ['@left', '~jack'],
      ['R', 'Y', '90', 'Enter', 'R', 'Z', '-30', 'Enter'],
      ['G', 'Z', '0.38', 'Enter'],
    ],
    op: 'Rotate · Move',
  },
  {
    id: 'camera',
    active: 'Camera',
    shot: 'camera',
    rows: [['Shift+A', '~camera'], ['N', '~fields'], ['~lens'], ['Numpad 0', '~view']],
    op: 'Add Camera',
  },
  {
    id: 'key',
    active: 'Area',
    shot: 'camera',
    rows: [['Z', '~rendered', 'Shift+A', '~area'], ['N', '~fields'], ['~light'], ['~track']],
    op: 'Add Light · Track To',
  },
  { id: 'rim', active: 'Area.001', shot: 'camera', rows: [['Shift+D', '@right', '~copy'], ['~fields'], ['~light']], op: 'Duplicate Objects' },
  { id: 'fill', active: 'Area.002', shot: 'camera', rows: [['Shift+D', '@right', '~copy'], ['~fields'], ['~light']], op: 'Duplicate Objects' },
  { id: 'strip', active: 'Area.003', shot: 'camera', rows: [['Shift+D', '@right', '~copy'], ['~fields'], ['~light']], op: 'Duplicate Objects' },
  { id: 'materials', active: 'Cylinder', shot: 'camera', rows: [['~where'], ['~metal'], ['~rubber'], ['~plastic'], ['~floor']] },
  { id: 'world', active: 'Cylinder', shot: 'camera', rows: [['~where'], ['~color']] },
  { id: 'cycles', active: 'Cylinder', shot: 'camera', rows: [['~engine'], ['~samples'], ['~denoise']] },
  { id: 'color', active: 'Cylinder', shot: 'camera', rows: [['~where'], ['~look']] },
  { id: 'render', active: 'Camera', shot: 'render', rows: [['~dof'], ['F12', '~render'], ['~save']], op: 'Render Image · Save As' },
];

const FRAMES = frames as unknown as readonly { header: string; grid: (readonly [GridKind, string])[] }[];

export const lighting: PillDefinition<BlenderPillView> = {
  ...lightingInfo,
  steps: DATA.map((d, i): PillStep<BlenderPillView> => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: d.id,
      rows: d.rows,
      op: d.op,
      image: images[`./img/s${n}.webp`]!,
      view: {
        header: FRAMES[i]!.header,
        mode: 'Object Mode',
        active: d.active,
        grid: FRAMES[i]!.grid,
        camera: d.shot === 'camera',
        render: d.shot === 'render',
      },
    };
  }),
};
