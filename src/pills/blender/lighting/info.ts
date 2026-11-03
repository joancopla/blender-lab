/** Index card data of the lighting pill (no step data, so the index stays light). */
import type { PillInfo } from '../../../core/pills/pill';
import cover from './img/s13.webp?url';
import './texts';

export const lightingInfo: PillInfo = {
  id: 'blender-lighting',
  nameKey: 'pillLighting.name',
  descKey: 'pillLighting.desc',
  texts: 'pillLighting',
  cover,
  stepCount: 13,
};
