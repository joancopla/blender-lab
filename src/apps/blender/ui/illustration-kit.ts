/**
 * Drawing kit for the lab illustrations (index cards and lab pages). Small
 * isometric scenes in Blender's own visual language (solid grey objects, orange
 * outline for the active object, axis colours), so they always sit on a dark,
 * viewport-like panel whatever the page theme. Each lab draws its own scene.
 */

export const ACTIVE = '#ffa040';
export const TOP = '#b9b9b9';
export const LEFT = '#8f8f8f';
export const RIGHT = '#707070';
export const X = '#ff6b6b';
export const Y = '#8bc34a';
export const Z = '#6ea8ff';

export const C = 0.866;

export function pts(list: readonly (readonly [number, number])[]): string {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

/** Corners of an isometric cube of edge s whose top face centre is (cx, cy). */
export function corners(cx: number, cy: number, s: number) {
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

export interface CubeStyle {
  readonly outline?: string;
  readonly topFill?: string;
}

export function cube(cx: number, cy: number, s: number, style: CubeStyle = {}): string {
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

export function ghostCube(cx: number, cy: number, s: number, color: string): string {
  const k = corners(cx, cy, s);
  const line = (a: readonly [number, number], b: readonly [number, number]) =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
  return `<g fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3">
    <polygon points="${pts([k.back, k.right, k.rightLow, k.frontLow, k.leftLow, k.left])}" fill="${color}" fill-opacity="0.08"/>
    ${line(k.left, k.front)}${line(k.front, k.right)}${line(k.front, k.frontLow)}
  </g>`;
}

/** Isometric ground grid centred on (cx, cy), fading towards the edges. */
export function floor(cx: number, cy: number, n = 4, step = 22): string {
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

export function svg(body: string): string {
  return `<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function vertexDots(cx: number, cy: number, s: number, selected: readonly string[]): string {
  const k = corners(cx, cy, s);
  return (Object.entries(k) as [string, readonly [number, number]][])
    .map(
      ([name, [x, y]]) =>
        `<circle cx="${x}" cy="${y}" r="3" fill="${selected.includes(name) ? ACTIVE : '#111'}" stroke="${selected.includes(name) ? ACTIVE : '#ddd'}" stroke-width="1"/>`,
    )
    .join('');
}
