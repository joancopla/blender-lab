/** Index card data of the speaker pill (no step data, so the index stays light). */
import type { PillInfo } from '../../../core/pills/pill';
import cover from './img/s11.webp?url';
import './texts';

export const speakerInfo: PillInfo = {
  id: 'blender-speaker',
  nameKey: 'pillSpeaker.name',
  descKey: 'pillSpeaker.desc',
  texts: 'pillSpeaker',
  cover,
  stepCount: 11,
};
