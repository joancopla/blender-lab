/** Index card and lab page illustration: moving the active object in the viewport. */
import { ACTIVE, X, Y, Z, cube, floor, ghostCube, svg } from '../../../apps/blender/ui/illustration-kit';

export const ILLUSTRATION = svg(`
  ${floor(160, 132, 5, 20)}
  ${cube(118, 88, 30, { outline: ACTIVE })}
  ${ghostCube(214, 70, 26, Z)}
  <path d="M142 70 Q170 38 196 52" fill="none" stroke="${ACTIVE}" stroke-width="1.5" stroke-dasharray="3 3"/>
  <circle cx="268" cy="30" r="6" fill="${Y}"/>
  <circle cx="280" cy="40" r="6" fill="${X}"/>
  <circle cx="270" cy="47" r="6" fill="${Z}"/>
`);
