/** Index card and lab page illustration: a Noise Texture into a Principled BSDF, beside the shaded object. */
import { svg } from '../../../apps/blender/ui/illustration-kit';

const BODY = '#303030';
const node = (x: number, y: number, w: number, h: number, header: string, rows: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${BODY}" stroke="rgba(255,255,255,.15)"/>
   <path d="M${x} ${y + 4}a4 4 0 0 1 4-4h${w - 8}a4 4 0 0 1 4 4v8h-${w}z" fill="${header}"/>
   ${Array.from({ length: rows }, (_, i) => `<rect x="${x + 8}" y="${y + 18 + i * 12}" width="${w - 16}" height="7" rx="2" fill="#545454"/>`).join('')}`;

export const ILLUSTRATION = svg(`
  <defs><radialGradient id="l05-ball" cx="35%" cy="30%"><stop offset="0" stop-color="#e8b38a"/><stop offset=".55" stop-color="#a3613a"/><stop offset="1" stop-color="#3a2116"/></radialGradient></defs>
  ${node(16, 40, 74, 62, '#79461d', 3)}
  ${node(118, 22, 92, 104, '#2b652b', 6)}
  <path d="M90 58C104 58 104 44 118 44" fill="none" stroke="#c7c729" stroke-width="2"/>
  <circle cx="90" cy="58" r="3.5" fill="#c7c729" stroke="#000"/>
  <circle cx="118" cy="44" r="3.5" fill="#c7c729" stroke="#000"/>
  <circle cx="262" cy="78" r="38" fill="url(#l05-ball)"/>
  <path d="M210 74C224 74 224 78 224 78" fill="none" stroke="#63c763" stroke-width="2"/>
  <circle cx="210" cy="74" r="3.5" fill="#63c763" stroke="#000"/>
`);
