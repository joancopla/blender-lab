/** Index card and lab page illustration: from the DMX output, along the cable, to each fixture. */
const G = '#6b7078';
const WARM = (a: number) => `rgba(255,236,200,${a})`;
const XS = [128, 192, 256];

export const ILLUSTRATION = `<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false">
  <rect x="26" y="70" width="58" height="34" rx="4" fill="#2a2d32" stroke="${G}"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${33 + i * 8}" y="${78 + (i % 3) * 5}" width="4" height="14" rx="1" fill="${i === 1 ? WARM(0.9) : '#4a4f57'}"/>`).join('')}
  <path d="M84 87 H${XS[0]! - 14} M${XS[0]! + 14} 87 H${XS[1]! - 14} M${XS[1]! + 14} 87 H${XS[2]! - 14}" stroke="#8a7a5a" stroke-width="2"/>
  ${XS.map(
    (x, i) => `<polygon points="${x - 10},100 ${x + 10},100 ${x + 26},158 ${x - 26},158" fill="${WARM(0.1 + i * 0.07)}"/>
  <rect x="${x - 14}" y="70" width="28" height="30" rx="5" fill="#2a2d32" stroke="${G}"/>
  <rect x="${x - 10}" y="74" width="20" height="8" rx="1.5" fill="#08090a"/>
  <text x="${x}" y="80.5" fill="#ff9b3d" font-family="Consolas,monospace" font-size="6.5" text-anchor="middle">00${1 + i * 4}</text>
  <circle cx="${x}" cy="92" r="5" fill="${WARM(0.85)}"/>`,
  ).join('')}
  <rect x="${XS[2]! + 14}" y="82" width="12" height="10" rx="2" fill="#3d4148" stroke="${G}"/>
</svg>`;
