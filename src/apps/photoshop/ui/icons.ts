/**
 * Icons of the replica, drawn for this project. They hint at what each control
 * is without copying Adobe's artwork (CLAUDE.md: no official icons).
 */
const svg = (body: string, size = 16): string =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  move: svg('<path d="M8 1.5v13M1.5 8h13M8 1.5 6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2"/>'),
  marquee: svg('<rect x="2.5" y="3.5" width="11" height="9" stroke-dasharray="2 1.6"/>'),
  lasso: svg('<path d="M8 3c3.3 0 6 1.6 6 3.6S11.3 10.200 8 10.200 2 8.600 2 6.600 4.700 3 8 3ZM5 10c-1 .8-1.200 2 .2 2.300 1.300.2 1.300 1.500.3 2.200"/>'),
  crop: svg('<path d="M4 1.500v10.500h10.500M1.500 4H12v10.500"/>'),
  brush: svg('<path d="M13.500 2.500 7 9M7 9c-1.600-.3-2.800.600-3.100 2-.2 1-.9 1.700-1.900 1.900 2.200 1 5 .5 5.600-1.800C7.800 10.300 7.500 9.500 7 9Z"/>'),
  eraser: svg('<path d="m9.500 2.500 4 4-6.500 6.500H4l-2-2ZM6 6l4 4M3 14.500h10.500"/>'),
  type: svg('<path d="M3 4V2.500h10V4M8 2.500v11M6 13.500h4"/>'),
  hand: svg('<path d="M5 8V3.500a1 1 0 0 1 2 0V7M7 7V2.500a1 1 0 0 1 2 0V7M9 7V3.500a1 1 0 0 1 2 0V8M11 8V5.500a1 1 0 0 1 2 0V10c0 2.500-1.800 4.500-4.500 4.500S5 13 4 11L2.700 8.500c-.4-.9.700-1.600 1.400-.9L5 8.500"/>'),
  zoom: svg('<circle cx="7" cy="7" r="4.500"/><path d="m10.300 10.300 3.700 3.700"/>'),
  eye: svg('<path d="M1.500 8S4 3.800 8 3.800 14.500 8 14.500 8 12 12.200 8 12.200 1.500 8 1.500 8Z"/><circle cx="8" cy="8" r="1.800"/>'),
  lock: svg('<rect x="3.500" y="7" width="9" height="6.500" rx="1"/><path d="M5.500 7V5a2.500 2.500 0 0 1 5 0v2"/>', 12),
  link: svg('<path d="M6.500 9.500a2.500 2.500 0 0 0 3.500 0l2.500-2.500a2.500 2.500 0 0 0-3.500-3.500l-.8.800M9.500 6.500a2.500 2.500 0 0 0-3.500 0L3.500 9a2.500 2.500 0 0 0 3.500 3.500l.8-.8"/>', 14),
  style: `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><text x="8" y="12" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="11" fill="currentColor">fx</text></svg>`,
  mask: svg('<rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="8" cy="8" r="2.600"/>', 14),
  adjustment: svg('<circle cx="8" cy="8" r="5.500"/><path d="M8 2.500v11" /><path d="M8 2.500a5.500 5.500 0 0 1 0 11Z" fill="currentColor" stroke="none"/>', 14),
  group: svg('<path d="M1.500 4.500h4.500l1.500 1.500h7v7.500h-13Z"/>', 14),
  create: svg('<rect x="2.500" y="2.500" width="11" height="11" rx="1"/><path d="M8 5.500v5M5.500 8h5"/>', 14),
  remove: svg('<path d="M3 4.500h10M6.500 4.500V3h3v1.500M4.500 4.500l.6 9h5.800l.6-9"/>', 14),
  commit: svg('<path d="m3 8.500 3.500 3.500L13 4.500"/>', 18),
  cancel: svg('<circle cx="8" cy="8" r="5.500"/><path d="m4.200 11.800 7.600-7.600"/>', 18),
  warp: svg('<path d="M2 4c4-2 8-2 12 0M2 12c4 2 8 2 12 0M2 4v8M14 4v8M8 2.500v11M2 8h12"/>', 18),
  angle: svg('<path d="M2.500 12.500h11M2.500 12.500 10 4M8.500 12.500a6 6 0 0 0-2-4.300"/>', 14),
  chain: svg('<path d="M5.500 6.500v-1a2.500 2.500 0 0 1 5 0v1M5.500 9.500v1a2.500 2.500 0 0 0 5 0v-1M8 6v4"/>', 14),
  delta: svg('<path d="M8 3 13.500 13h-11Z"/>', 12),
  submenu: svg('<path d="m6 4 4 4-4 4" />', 10),
  search: svg('<circle cx="7" cy="7" r="4"/><path d="m10 10 3.500 3.500"/>', 12),
} as const;

/** 3 × 3 grid of the reference point locator, the centre one filled. */
export const REFERENCE_GRID = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1">${[2, 8, 14]
  .flatMap((y) => [2, 8, 14].map((x) => `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3"${x === 8 && y === 8 ? ' fill="currentColor"' : ''}/>`))
  .join('')}</svg>`;

/** Cursor for rotating (a curved double arrow), as a CSS `cursor` value. */
export const ROTATE_CURSOR = (() => {
  const art =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<g stroke="#fff" stroke-width="4"><path d="M5 17A10 10 0 0 1 17 5"/><path d="M17 5l-4.500-.5M17 5l-1 4.500M5 17l.5-4.500M5 17l4.500-1"/></g>' +
    '<g stroke="#000" stroke-width="1.600"><path d="M5 17A10 10 0 0 1 17 5"/><path d="M17 5l-4.500-.5M17 5l-1 4.500M5 17l.5-4.500M5 17l4.500-1"/></g></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(art)}") 12 12, crosshair`;
})();
