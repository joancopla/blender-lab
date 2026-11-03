import { lighting } from '../pills/blender/lighting';
import { mountPillPage } from '../core/pills/pill-page';
import { renderBlenderPillArt } from '../apps/blender/ui/pill-viewport';

mountPillPage(lighting, {
  programKey: 'app.name',
  renderArt: renderBlenderPillArt,
  // ?p=blender opens the Blender tab even if the student last chose another program.
  indexHref: '../../?p=blender',
});
