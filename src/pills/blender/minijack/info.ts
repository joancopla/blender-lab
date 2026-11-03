/** Index card data of the minijack pill (no step data, so the index stays light). */
import type { PillInfo } from '../../../core/pills/pill';
import cover from './img/final.webp?url';
import './texts';

export const minijackInfo: PillInfo = {
  id: 'blender-minijack',
  nameKey: 'pillMinijack.name',
  descKey: 'pillMinijack.desc',
  texts: 'pillMinijack',
  cover,
  stepCount: 18,
};
