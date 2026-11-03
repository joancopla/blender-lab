/** Index card data of the turntable pill (no step data, so the index stays light). */
import type { PillInfo } from '../../../core/pills/pill';
import cover from './img/s11.webp?url';
import './texts';

export const turntableInfo: PillInfo = {
  id: 'blender-turntable',
  nameKey: 'pillTurntable.name',
  descKey: 'pillTurntable.desc',
  texts: 'pillTurntable',
  cover,
  stepCount: 11,
};
