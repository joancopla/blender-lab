/** Index card data of the neon look pill (no step data, so the index stays light). */
import type { PillInfo } from '../../../core/pills/pill';
import cover from './img/s24.webp?url';
import './texts';

export const neonInfo: PillInfo = {
  id: 'blender-neon',
  nameKey: 'pillNeon.name',
  descKey: 'pillNeon.desc',
  texts: 'pillNeon',
  cover,
  stepCount: 24,
};
