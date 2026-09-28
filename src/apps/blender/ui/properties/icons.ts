/**
 * Tab icons of the Properties Editor. Drawn for the lab (not Blender's icons),
 * with Blender's colour hints per group: scene tabs grey, object orange,
 * modifiers blue, data green, material red.
 */
import type { PropertiesTabId } from './tabs';

const svg = (body: string) => `<svg viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
const GREY = '#c8c8c8';
const ORANGE = '#e8a24a';
const BLUE = '#6fa4e8';
const GREEN = '#7ec27e';
const RED = '#e07a7a';

export const TAB_ICONS: Record<PropertiesTabId, string> = {
  tool: svg(`<path d="M3 13l6-6M9.5 3.5a3 3 0 0 0 3 3l-2 2-3-3z" fill="none" stroke="${GREY}" stroke-width="1.6" stroke-linecap="round"/>`),
  render: svg(`<rect x="2" y="5" width="9" height="7" rx="1" fill="none" stroke="${GREY}" stroke-width="1.4"/><path d="M11 7.5l3-2v6l-3-2" fill="${GREY}"/>`),
  output: svg(`<rect x="3" y="2.5" width="10" height="5" fill="none" stroke="${GREY}" stroke-width="1.4"/><rect x="2" y="7.5" width="12" height="5" rx="1" fill="${GREY}"/>`),
  viewLayer: svg(`<rect x="2" y="6" width="9" height="7" fill="none" stroke="${GREY}" stroke-width="1.3"/><path d="M5 3.5h8.5V10" fill="none" stroke="${GREY}" stroke-width="1.3"/>`),
  scene: svg(`<path d="M2.5 13.5L6 5l3.5 8.5z" fill="${GREY}"/><circle cx="11.5" cy="10" r="2.8" fill="none" stroke="${GREY}" stroke-width="1.4"/>`),
  world: svg(`<circle cx="8" cy="8" r="5.5" fill="none" stroke="${RED}" stroke-width="1.4"/><path d="M2.5 8h11M8 2.5c-2.5 3-2.5 8 0 11M8 2.5c2.5 3 2.5 8 0 11" fill="none" stroke="${RED}" stroke-width="1"/>`),
  collection: svg(`<rect x="2.5" y="4" width="11" height="9" rx="1" fill="none" stroke="${GREY}" stroke-width="1.4"/><path d="M2.5 7h11" stroke="${GREY}" stroke-width="1.2"/>`),
  object: svg(`<rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="${ORANGE}"/>`),
  modifiers: svg(`<path d="M4 13.5l5.5-5.5M9.5 8a3 3 0 1 0 1.8-5l-1.6 1.6.5 1.7 1.7.5 1.6-1.6A3 3 0 0 1 9.5 8z" fill="none" stroke="${BLUE}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  particles: svg(`<circle cx="4" cy="5" r="1.5" fill="${BLUE}"/><circle cx="10" cy="3.5" r="1.5" fill="${BLUE}"/><circle cx="7" cy="9" r="1.5" fill="${BLUE}"/><circle cx="12" cy="11" r="1.5" fill="${BLUE}"/><circle cx="4" cy="12.5" r="1.5" fill="${BLUE}"/>`),
  physics: svg(`<circle cx="8" cy="8" r="2" fill="${BLUE}"/><ellipse cx="8" cy="8" rx="6" ry="3" fill="none" stroke="${BLUE}" stroke-width="1.2" transform="rotate(-30 8 8)"/>`),
  constraints: svg(`<rect x="2" y="6" width="6" height="4" rx="2" fill="none" stroke="${BLUE}" stroke-width="1.4"/><rect x="8" y="6" width="6" height="4" rx="2" fill="none" stroke="${BLUE}" stroke-width="1.4"/>`),
  data: svg(`<path d="M8 2.5l5.5 10h-11z" fill="none" stroke="${GREEN}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="2.5" r="1.3" fill="${GREEN}"/><circle cx="13.5" cy="12.5" r="1.3" fill="${GREEN}"/><circle cx="2.5" cy="12.5" r="1.3" fill="${GREEN}"/>`),
  material: svg(`<circle cx="8" cy="8" r="5.5" fill="${RED}"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="#8a3b3b"/>`),
  texture: svg(`<rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="${GREY}" stroke-width="1.3"/><path d="M2.5 8h5.5V2.5M8 8h5.5v5.5H8z" fill="${GREY}"/>`),
};
