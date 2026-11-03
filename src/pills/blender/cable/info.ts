/** Index card data of the cable pill (no step data, so the index stays light). */
import type { PillInfo } from '../../../core/pills/pill';
import cover from './img/s11.webp?url';
import './texts';

export const cableInfo: PillInfo = {
  id: 'blender-cable',
  nameKey: 'pillCable.name',
  descKey: 'pillCable.desc',
  texts: 'pillCable',
  cover,
  stepCount: 11,
};
