/** Index card and lab page illustration: a cube smoothed by a modifier stack. */
import { ACTIVE, Z, cube, floor, svg } from '../../../apps/blender/ui/illustration-kit';

export const ILLUSTRATION = svg(`
  ${floor(140, 136, 5, 20)}
  ${cube(70, 84, 26)}
  <path d="M112 100 h24 m-6 -5 l6 5 l-6 5" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.5"/>
  <defs>
    <radialGradient id="ill-smooth" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#d6d6d6"/>
      <stop offset="0.6" stop-color="#8f8f8f"/>
      <stop offset="1" stop-color="#5c5c5c"/>
    </radialGradient>
  </defs>
  <circle cx="196" cy="98" r="36" fill="url(#ill-smooth)" stroke="${ACTIVE}" stroke-width="2"/>
  <g fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="1">
    <ellipse cx="196" cy="98" rx="36" ry="12"/>
    <ellipse cx="196" cy="98" rx="14" ry="36"/>
  </g>
  <g font-family="Inter, Arial, sans-serif" font-size="10" font-weight="600">
    <rect x="248" y="54" width="56" height="16" rx="3" fill="#3a3e45"/>
    <rect x="248" y="74" width="56" height="16" rx="3" fill="#3a3e45"/>
    <rect x="248" y="94" width="56" height="16" rx="3" fill="#3a3e45"/>
    <rect x="248" y="54" width="3" height="16" fill="${Z}"/>
    <rect x="248" y="74" width="3" height="16" fill="${Z}"/>
    <rect x="248" y="94" width="3" height="16" fill="${Z}"/>
  </g>
`);
