/**
 * Blender image of a pill step: the 3D viewport as the student sees it. The step image
 * (Workbench render with a transparent background) is drawn over the viewport background
 * and the grid, with the header (mode and select mode) and the view name and
 * "(1) Collection | Object" text in the corner. A view through the camera sits in the
 * camera frame with the passepartout around it. An overlay (a curve with its points and
 * handles) can be drawn on top of the image. A beauty render is shown on its own,
 * like Blender's render window (F12).
 * FIDELITY? The header is simplified: only the mode menu and the select mode buttons.
 */
import type { PillStep } from '../../../core/pills/pill';
import { THEME } from '../viewport/theme';
import './pill-viewport.css';

export type GridKind = 'major' | 'minor' | 'floor' | 'x' | 'y';

/**
 * Overlay drawn over the image, in image pixels: a polyline ("l", points "x,y x,y ...") or a
 * dot ("d", centre "x,y"), with its colour and its width or radius. Used for what Blender
 * draws on top in the viewport, such as a curve with its control points and handles.
 */
export type OverlayItem = readonly [kind: 'l' | 'd', color: string, size: number, data: string];

export interface BlenderPillView {
  /** Viewport name, e.g. "User Perspective". */
  readonly header: string;
  readonly mode: 'Object Mode' | 'Edit Mode';
  /** Edit Mode select mode: 1 vertex, 2 edge, 3 face. */
  readonly selectMode?: 1 | 2 | 3;
  /** Active object name for the "(1) Collection | <name>" line; empty when there is none. */
  readonly active: string;
  /** Grid polylines in image pixels ("x,y x,y ..."). */
  readonly grid: readonly (readonly [GridKind, string])[];
  /** True for a finished render shown without the viewport around it. */
  readonly render?: boolean;
  /**
   * True for a view through the camera (Numpad 0): the 16:9 image sits in the camera frame
   * and the rest of the viewport is darkened by the passepartout.
   */
  readonly camera?: boolean;
  /** Overlay drawn over the image (Edit Mode curve, points and handles; a curve wire). */
  readonly overlay?: readonly OverlayItem[];
  /**
   * True for a map of the whole Blender window (Layout workspace): the step image goes in
   * the 3D Viewport and each area carries its name, for students who have never opened it.
   */
  readonly screen?: boolean;
}

/** Camera frame inside the 1200 × 1080 viewport image. FIDELITY? Blender fits the frame with a small margin. */
const FRAME = { x: 50, w: 1100, h: Math.round((1100 * 9) / 16) };
const PASSEPARTOUT = 0.5; // Blender's default Passepartout alpha

const GRID_STYLE: Record<GridKind, { color: string; width: number; opacity: number }> = {
  major: { color: THEME.gridLine, width: 1, opacity: 1 },
  floor: { color: THEME.gridLine, width: 1, opacity: 1 },
  minor: { color: THEME.gridLine, width: 1, opacity: 0.55 },
  x: { color: THEME.axisX, width: 1.6, opacity: 1 },
  y: { color: THEME.axisY, width: 1.6, opacity: 1 },
};

const SVG = 'http://www.w3.org/2000/svg';

const SELECT_ICONS = [
  '<rect x="10" y="8" width="6" height="6"/>',
  '<line x1="7" y1="15" x2="19" y2="7" stroke-width="2"/>',
  '<rect x="7" y="6" width="12" height="10"/>',
];

function div(cls: string, text?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  if (text !== undefined) d.textContent = text;
  return d;
}

export function renderBlenderPillArt(host: HTMLElement, step: PillStep<BlenderPillView>): void {
  const v = step.view;
  host.classList.add('bl-pill-art');
  host.style.background = v.render ? '#000' : v.screen ? SCREEN_GAP : THEME.viewportBackground;

  const img = document.createElement('img');
  img.className = 'bl-pill-image';
  img.src = step.image;
  img.alt = '';

  if (v.screen) {
    host.replaceChildren(...screenMap(img));
    return;
  }

  if (v.render) {
    img.classList.add('is-render');
    host.replaceChildren(img);
    return;
  }

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'bl-pill-grid');
  svg.setAttribute('viewBox', '0 0 1200 1080');
  for (const [kind, points] of v.grid) {
    const s = GRID_STYLE[kind];
    const line = document.createElementNS(SVG, 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', s.color);
    line.setAttribute('stroke-width', String(s.width));
    if (s.opacity < 1) line.setAttribute('stroke-opacity', String(s.opacity));
    svg.append(line);
  }

  const header = div('bl-pill-header');
  header.append(div('bl-pill-mode', `${v.mode} ▾`));
  if (v.mode === 'Edit Mode') {
    const seg = div('bl-pill-select');
    SELECT_ICONS.forEach((icon, i) => {
      const b = div(`bl-pill-select-mode${v.selectMode === i + 1 ? ' is-on' : ''}`);
      b.innerHTML = `<svg viewBox="0 0 26 22" fill="#e6e6e6" stroke="#e6e6e6">${icon}</svg>`;
      seg.append(b);
    });
    header.append(seg);
  }

  const text = div('bl-pill-text');
  // FIDELITY? With no active object (e.g. right after deleting it) the line shows only the collection.
  text.append(div('', v.header), div('', v.active ? `(1) Collection | ${v.active}` : '(1) Collection'));
  text.style.color = THEME.viewportText;

  const overlay = v.overlay?.length ? overlaySvg(v.overlay) : null;

  if (v.camera) {
    const frame = div('bl-pill-camera');
    const top = Math.round((1080 - FRAME.h) / 2);
    Object.assign(frame.style, { left: `${FRAME.x}px`, top: `${top}px`, width: `${FRAME.w}px`, height: `${FRAME.h}px` });
    frame.style.boxShadow = `0 0 0 2000px rgba(0, 0, 0, ${PASSEPARTOUT})`;
    img.classList.add('is-camera');
    frame.append(img);
    host.replaceChildren(...[svg, frame, overlay, header, text].filter((n) => n !== null));
    return;
  }
  host.replaceChildren(...[svg, img, overlay, header, text].filter((n) => n !== null));
}

function overlaySvg(items: readonly OverlayItem[]): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'bl-pill-overlay');
  svg.setAttribute('viewBox', '0 0 1200 1080');
  for (const [kind, color, size, data] of items) {
    if (kind === 'l') {
      const line = document.createElementNS(SVG, 'polyline');
      line.setAttribute('points', data);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', String(size));
      line.setAttribute('stroke-linejoin', 'round');
      svg.append(line);
    } else {
      const [x, y] = data.split(',');
      const dot = document.createElementNS(SVG, 'circle');
      dot.setAttribute('cx', x ?? '0');
      dot.setAttribute('cy', y ?? '0');
      dot.setAttribute('r', String(size));
      dot.setAttribute('fill', color);
      svg.append(dot);
    }
  }
  return svg;
}

/** Colour of the gaps between areas. FIDELITY? Remembered from the default theme. */
const SCREEN_GAP = '#161616';

/**
 * Properties tabs of a selected mesh in the Layout workspace, top to bottom, with the names
 * the pills use. Drawn as plain squares: the lab does not use Blender's icons.
 * FIDELITY? Tab order and the gap after Tool, as remembered from 4.x; check in 5.1.
 */
const PROPERTIES_TABS: readonly (string | null)[] = [
  null, // Tool
  'Render',
  'Output',
  null, // View Layer
  null, // Scene
  'World',
  null, // Collection
  null, // Object
  'Modifiers',
  null, // Particles
  null, // Physics
  null, // Object Constraints
  'Object Data',
  'Material',
  null, // Texture
];

function area(cls: string, x: number, y: number, w: number, h: number): HTMLDivElement {
  const d = div(`bl-pill-area ${cls}`);
  Object.assign(d.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  return d;
}

/** Simplified Layout workspace: top bar, 3D Viewport, Outliner, Properties and Timeline. */
function screenMap(img: HTMLImageElement): HTMLElement[] {
  const top = area('bl-pill-topbar', 0, 0, 1200, 34);
  top.append(
    div('', 'File   Edit   Render   Window   Help'),
    div('bl-pill-ws', 'Layout'),
    div('bl-pill-ws-off', 'Modeling   Sculpting   UV Editing   Shading   …'),
  );

  const view = area('bl-pill-zone', 0, 38, 812, 790);
  img.classList.add('is-screen');
  view.append(img, div('bl-pill-zone-head', 'Object Mode ▾   View   Select   Add   Object'), div('bl-pill-callout', '3D Viewport'));

  const outliner = area('bl-pill-zone', 816, 38, 384, 250);
  const tree = div('bl-pill-tree');
  const rows = [['Scene Collection', 0], ['Collection', 1], ['Camera', 2], ['Cube', 2], ['Light', 2]] as const;
  for (const [name, depth] of rows) {
    const r = div('bl-pill-tree-row', name);
    r.style.paddingLeft = `${12 + depth * 22}px`;
    tree.append(r);
  }
  outliner.append(div('bl-pill-zone-head', ''), tree, div('bl-pill-callout', 'Outliner'));

  const props = area('bl-pill-zone', 816, 292, 384, 536);
  const tabs = div('bl-pill-tabs');
  PROPERTIES_TABS.forEach((name, i) => {
    const tab = div(`bl-pill-tab${name ? ' is-named' : ''}${i === 1 ? ' is-gap' : ''}`);
    if (name) tab.append(div('bl-pill-tab-name', name));
    tabs.append(tab);
  });
  props.append(tabs, div('bl-pill-callout', 'Properties'));

  const timeline = area('bl-pill-zone', 0, 832, 1200, 248);
  const ruler = Array.from({ length: 13 }, (_, i) => String(i * 20).padEnd(10)).join('');
  timeline.append(
    div('bl-pill-zone-head', 'Playback ▾   Keying ▾   View   Marker'),
    div('bl-pill-ruler', ruler),
    div('bl-pill-callout', 'Timeline'),
  );

  return [top, view, outliner, props, timeline];
}
