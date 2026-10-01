/** Index card and lab page illustration: fixtures side by side along the 512 channels of a universe. */
const G = '#6b7078';
const X0 = 30;
const K = 4.4; // px per channel
const BLOCKS: readonly (readonly [number, number, boolean])[] = [
  [1, 4, false],
  [5, 4, false],
  [9, 16, true],
  [25, 1, false],
  [26, 4, false],
  [30, 16, false],
];

export const ILLUSTRATION = `<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false">
  ${BLOCKS.map(([a, n, hot]) => `<rect x="${X0 + (a - 1) * K}" y="70" width="${n * K - 3}" height="36" rx="3" fill="${hot ? 'rgba(255,236,200,.75)' : '#2f3237'}" stroke="${G}"/>`).join('')}
  ${Array.from({ length: 16 }, (_, i) => `<line x1="${X0 + i * 4 * K}" y1="112" x2="${X0 + i * 4 * K}" y2="${i % 2 ? 116 : 120}" stroke="${G}"/>`).join('')}
  <text x="${X0}" y="60" fill="${G}" font-family="Consolas,monospace" font-size="11">1.001</text>
  <text x="${X0 + 8 * K}" y="60" fill="#d9cdb4" font-family="Consolas,monospace" font-size="11">1.009</text>
  <text x="${X0 + 24 * K}" y="138" fill="${G}" font-family="Consolas,monospace" font-size="11">9 + 16 = 25</text>
</svg>`;
