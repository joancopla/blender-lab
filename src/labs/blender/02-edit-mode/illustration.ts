/** Index card and lab page illustration: extruding the top face of a cube in Edit Mode. */
import { ACTIVE, corners, cube, floor, pts, svg, vertexDots } from '../../../apps/blender/ui/illustration-kit';

export const ILLUSTRATION = (() => {
  const cx = 160;
  const cy = 104;
  const s = 38;
  const k = corners(cx, cy, s);
  const lift = 30;
  const up = (p: readonly [number, number]) => [p[0], p[1] - lift] as const;
  const top = [k.back, k.right, k.front, k.left] as const;
  const wire = (a: readonly [number, number], b: readonly [number, number]) =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  return svg(`
    ${floor(160, 146, 5, 20)}
    ${cube(cx, cy, s, { topFill: '#c9a47c' })}
    <g fill="none" stroke="#111" stroke-width="1">
      <polygon points="${pts([k.back, k.right, k.rightLow, k.frontLow, k.leftLow, k.left])}"/>
      ${wire(k.left, k.front)}${wire(k.front, k.right)}${wire(k.front, k.frontLow)}
    </g>
    <g fill="none" stroke="${ACTIVE}" stroke-width="1.5" stroke-dasharray="4 3">
      <polygon points="${pts(top.map(up))}"/>
      ${top.map((p) => wire(p, up(p))).join('')}
    </g>
    <polygon points="${pts(top)}" fill="none" stroke="${ACTIVE}" stroke-width="2"/>
    ${vertexDots(cx, cy, s, ['back', 'right', 'front', 'left'])}
  `);
})();
