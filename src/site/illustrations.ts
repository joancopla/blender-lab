/**
 * Small isometric drawings for the lab cards of the index. They show
 * what the lab is about in Blender's own visual language (solid grey objects,
 * orange outline for the active object, axis colours), so they always sit on a
 * dark, viewport-like panel whatever the page theme.
 */

const ACTIVE = '#ffa040';
const TOP = '#b9b9b9';
const LEFT = '#8f8f8f';
const RIGHT = '#707070';
const X = '#ff6b6b';
const Y = '#8bc34a';
const Z = '#6ea8ff';

const C = 0.866;

function pts(list: readonly (readonly [number, number])[]): string {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

/** Corners of an isometric cube of edge s whose top face centre is (cx, cy). */
function corners(cx: number, cy: number, s: number) {
  const h = s / 2;
  return {
    back: [cx, cy - h] as const,
    right: [cx + s * C, cy] as const,
    front: [cx, cy + h] as const,
    left: [cx - s * C, cy] as const,
    rightLow: [cx + s * C, cy + s] as const,
    frontLow: [cx, cy + h + s] as const,
    leftLow: [cx - s * C, cy + s] as const,
  };
}

interface CubeStyle {
  readonly outline?: string;
  readonly topFill?: string;
}

function cube(cx: number, cy: number, s: number, style: CubeStyle = {}): string {
  const k = corners(cx, cy, s);
  const faces = [
    `<polygon points="${pts([k.back, k.right, k.front, k.left])}" fill="${style.topFill ?? TOP}"/>`,
    `<polygon points="${pts([k.left, k.front, k.frontLow, k.leftLow])}" fill="${LEFT}"/>`,
    `<polygon points="${pts([k.front, k.right, k.rightLow, k.frontLow])}" fill="${RIGHT}"/>`,
  ];
  const outline = style.outline
    ? `<polygon points="${pts([k.back, k.right, k.rightLow, k.frontLow, k.leftLow, k.left])}" fill="none" stroke="${style.outline}" stroke-width="2" stroke-linejoin="round"/>`
    : '';
  return faces.join('') + outline;
}

function ghostCube(cx: number, cy: number, s: number, color: string): string {
  const k = corners(cx, cy, s);
  const line = (a: readonly [number, number], b: readonly [number, number]) =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  return `<g fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3">
    <polygon points="${pts([k.back, k.right, k.rightLow, k.frontLow, k.leftLow, k.left])}" fill="${color}" fill-opacity="0.08"/>
    ${line(k.left, k.front)}${line(k.front, k.right)}${line(k.front, k.frontLow)}
  </g>`;
}

/** Isometric ground grid centred on (cx, cy), fading towards the edges. */
function floor(cx: number, cy: number, n = 4, step = 22): string {
  const at = (i: number, j: number) => [cx + (i - j) * C * step, cy + (i + j) * 0.5 * step] as const;
  const lines: string[] = [];
  for (let k = -n; k <= n; k++) {
    const o = (0.16 * (1 - Math.abs(k) / (n + 1))).toFixed(2);
    const [a, b] = [at(k, -n), at(k, n)];
    const [c, d] = [at(-n, k), at(n, k)];
    lines.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-opacity="${o}"/>`);
    lines.push(`<line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}" stroke-opacity="${o}"/>`);
  }
  return `<g stroke="#ffffff" stroke-width="1">${lines.join('')}</g>`;
}

function svg(body: string): string {
  return `<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false">${body}</svg>`;
}

const viewport = svg(`
  ${floor(160, 132, 5, 20)}
  ${cube(118, 88, 30, { outline: ACTIVE })}
  ${ghostCube(214, 70, 26, Z)}
  <path d="M142 70 Q170 38 196 52" fill="none" stroke="${ACTIVE}" stroke-width="1.5" stroke-dasharray="3 3"/>
  <circle cx="268" cy="30" r="6" fill="${Y}"/>
  <circle cx="280" cy="40" r="6" fill="${X}"/>
  <circle cx="270" cy="47" r="6" fill="${Z}"/>
`);

function vertexDots(cx: number, cy: number, s: number, selected: readonly string[]): string {
  const k = corners(cx, cy, s);
  return (Object.entries(k) as [string, readonly [number, number]][])
    .map(
      ([name, [x, y]]) =>
        `<circle cx="${x}" cy="${y}" r="3" fill="${selected.includes(name) ? ACTIVE : '#111'}" stroke="${selected.includes(name) ? ACTIVE : '#ddd'}" stroke-width="1"/>`,
    )
    .join('');
}

const editMode = (() => {
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

const modifiers = svg(`
  ${floor(140, 136, 5, 20)}
  ${cube(70, 84, 26)}
  <path d="M112 100 h24 m-6 -5 l6 5 l-6 5" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.5"/>
  <defs>
    <radialGradient id="pp-smooth" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#d6d6d6"/>
      <stop offset="0.6" stop-color="#8f8f8f"/>
      <stop offset="1" stop-color="#5c5c5c"/>
    </radialGradient>
  </defs>
  <circle cx="196" cy="98" r="36" fill="url(#pp-smooth)" stroke="${ACTIVE}" stroke-width="2"/>
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

const lights = (() => {
  const lx = 88;
  const ly = 44;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<line x1="${lx + Math.cos(a) * 11}" y1="${ly + Math.sin(a) * 11}" x2="${lx + Math.cos(a) * 17}" y2="${ly + Math.sin(a) * 17}"/>`;
  }).join('');
  return svg(`
    <defs>
      <radialGradient id="pp-light" cx="${lx}" cy="${ly}" r="190" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffe7a8" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${lx}" cy="${ly}" r="190" fill="url(#pp-light)"/>
    ${floor(186, 134, 5, 20)}
    <polygon points="${pts([[196, 150], [266, 132], [292, 146], [222, 166]])}" fill="#000" fill-opacity="0.45"/>
    ${cube(186, 96, 30)}
    <circle cx="${lx}" cy="${ly}" r="7" fill="#fff4d6"/>
    <circle cx="${lx}" cy="${ly}" r="22" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-dasharray="3 3"/>
    <g stroke="#fff4d6" stroke-width="1.5">${rays}</g>
    <line x1="${lx}" y1="${ly + 22}" x2="${lx}" y2="150" stroke="#fff" stroke-opacity="0.3" stroke-dasharray="2 4"/>
  `);
})();

/** Illustration for a lab id; empty if the lab has none yet. */
export const LAB_ILLUSTRATIONS: Readonly<Record<string, string>> = {
  '01-viewport': viewport,
  '02-edit-mode': editMode,
  '03-modifiers': modifiers,
  '04-lights': lights,
};
