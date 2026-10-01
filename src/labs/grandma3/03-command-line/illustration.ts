/** Index card and lab page illustration: "1 Thru 5 At 60" on the keypad and five lit fixtures. */
const G = '#6b7078';
const WARM = (a: number) => `rgba(255,236,200,${a})`;
const KEYS: readonly (readonly [string, number, number])[] = [
  ['1', 44, 26],
  ['Thru', 76, 40],
  ['5', 122, 26],
  ['At', 154, 30],
  ['60', 190, 30],
  ['Please', 226, 52],
];

export const ILLUSTRATION = `<svg viewBox="0 0 320 180" aria-hidden="true" focusable="false">
  <line x1="20" y1="22" x2="300" y2="22" stroke="${G}" stroke-width="2"/>
  ${Array.from({ length: 6 }, (_, i) => {
    const x = 40 + i * 48;
    const on = i < 5;
    return `<polygon points="${x - 7},38 ${x + 7},38 ${x + 20},100 ${x - 20},100" fill="${WARM(on ? 0.2 : 0)}"/>
  <rect x="${x - 9}" y="22" width="18" height="16" rx="3" fill="#2a2d32" stroke="${G}"/>
  <circle cx="${x}" cy="36" r="4" fill="${on ? WARM(0.85) : '#3d4148'}"/>`;
  }).join('')}
  ${KEYS.map(([k, x, w]) => `<rect x="${x}" y="116" width="${w}" height="24" rx="3" fill="#1e1f23" stroke="#4a4f57"/>
  <text x="${x + w / 2}" y="132" fill="${/^[0-9]+$/.test(k) ? '#f2f3f4' : '#e8a25a'}" font-family="Segoe UI,Arial" font-size="11" font-weight="700" text-anchor="middle">${k}</text>`).join('')}
</svg>`;
