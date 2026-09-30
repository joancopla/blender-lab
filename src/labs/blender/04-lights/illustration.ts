/** Index card and lab page illustration: a point light casting a shadow. */
import { cube, floor, pts, svg } from '../../../apps/blender/ui/illustration-kit';

export const ILLUSTRATION = (() => {
  const lx = 88;
  const ly = 44;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<line x1="${lx + Math.cos(a) * 11}" y1="${ly + Math.sin(a) * 11}" x2="${lx + Math.cos(a) * 17}" y2="${ly + Math.sin(a) * 17}"/>`;
  }).join('');
  return svg(`
    <defs>
      <radialGradient id="ill-light" cx="${lx}" cy="${ly}" r="190" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffe7a8" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${lx}" cy="${ly}" r="190" fill="url(#ill-light)"/>
    ${floor(186, 134, 5, 20)}
    <polygon points="${pts([[196, 150], [266, 132], [292, 146], [222, 166]])}" fill="#000" fill-opacity="0.45"/>
    ${cube(186, 96, 30)}
    <circle cx="${lx}" cy="${ly}" r="7" fill="#fff4d6"/>
    <circle cx="${lx}" cy="${ly}" r="22" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-dasharray="3 3"/>
    <g stroke="#fff4d6" stroke-width="1.5">${rays}</g>
    <line x1="${lx}" y1="${ly + 22}" x2="${lx}" y2="150" stroke="#fff" stroke-opacity="0.3" stroke-dasharray="2 4"/>
  `);
})();
