/**
 * Static shell of Blender's Layout workspace (simplified). Menus and tabs are
 * decoration with the exact labels; they do nothing.
 * FIDELITY? Workspace tab list and status bar texts for 5.2.
 */
import './blender-ui.css';

export interface LayoutRefs {
  readonly root: HTMLElement;
  readonly viewport: HTMLElement;
  /** Viewport header: menus normally, the operator text during a modal transform. */
  readonly viewportHeaderText: HTMLElement;
  readonly viewMenu: HTMLElement;
  /** Add menu of the header (Object Mode). */
  readonly addMenu: HTMLElement;
  readonly selectMenu: HTMLElement;
  readonly objectMenu: HTMLElement;
  /** Object Mode / Edit Mode selector. */
  readonly modeMenu: HTMLElement;
  /** Vertex / Edge / Face select mode buttons (Edit Mode only). */
  readonly selectModeButtons: Record<'vert' | 'edge' | 'face', HTMLButtonElement>;
  /** Toggle X-Ray, at the right of the viewport header (both modes). */
  readonly xrayButton: HTMLButtonElement;
  /** Viewport Shading: Wireframe, Solid, Material Preview, Rendered. */
  readonly shadingButtons: Record<'WIREFRAME' | 'SOLID' | 'MATERIAL' | 'RENDERED', HTMLButtonElement>;
  /** Header parts shown only in one mode. */
  readonly objectModeOnly: readonly HTMLElement[];
  readonly editModeOnly: readonly HTMLElement[];
  readonly outlinerBody: HTMLElement;
  /** Properties Editor area, under the Outliner (filled by PropertiesEditor). */
  readonly propertiesArea: HTMLElement;
  readonly statusLeft: HTMLElement;
}

const WORKSPACES = [
  'Layout',
  'Modeling',
  'Sculpting',
  'UV Editing',
  'Texture Paint',
  'Shading',
  'Animation',
  'Rendering',
  'Compositing',
  'Geometry Nodes',
  'Scripting',
];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function buildLayout(container: HTMLElement): LayoutRefs {
  container.classList.add('bl-app');

  const topbar = el('div', 'bl-topbar');
  const logo = el('span', 'bl-logo');
  logo.innerHTML =
    '<svg viewBox="0 0 16 16"><circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9" r="1.7" fill="currentColor"/><path d="M1 6h6M2.5 3.5l5 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  topbar.append(logo);
  for (const m of ['File', 'Edit', 'Render', 'Window', 'Help']) topbar.append(el('span', 'bl-menu', m));
  const tabs = el('div', 'bl-workspaces');
  for (const w of WORKSPACES) tabs.append(el('span', w === 'Layout' ? 'bl-tab is-active' : 'bl-tab', w));
  topbar.append(tabs, el('span', 'bl-spacer'), el('span', 'bl-field', 'Scene'), el('span', 'bl-field', 'ViewLayer'));

  const main = el('div', 'bl-main');

  const viewArea = el('section', 'bl-area bl-area-view3d');
  const header = el('div', 'bl-header');
  const viewMenu = el('span', 'bl-menu', 'View');
  const selectMenu = el('span', 'bl-menu', 'Select');
  const modeMenu = el('span', 'bl-dropdown', 'Object Mode');

  // Vertex / Edge / Face select mode buttons. FIDELITY? Icons are simplified.
  const selectModeGroup = el('span', 'bl-selectmode');
  selectModeGroup.hidden = true;
  const SELECT_MODE_ICONS = {
    vert: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" stroke-dasharray="2 1.5"/><circle cx="2.5" cy="13.5" r="2.2" fill="currentColor"/></svg>',
    edge: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" stroke-dasharray="2 1.5"/><path d="M2.5 13.5h11" stroke="currentColor" stroke-width="2.2"/></svg>',
    face: '<svg viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" fill="currentColor" fill-opacity="0.6" stroke="currentColor"/></svg>',
  } as const;
  const TITLES = { vert: 'Vertex', edge: 'Edge', face: 'Face' } as const;
  const selectModeButtons = {} as Record<'vert' | 'edge' | 'face', HTMLButtonElement>;
  for (const k of ['vert', 'edge', 'face'] as const) {
    const b = el('button', 'bl-selectmode-button');
    b.type = 'button';
    b.title = TITLES[k];
    b.innerHTML = SELECT_MODE_ICONS[k];
    selectModeButtons[k] = b;
    selectModeGroup.append(b);
  }

  const addMenu = el('span', 'bl-menu', 'Add');
  const objectMenu = el('span', 'bl-menu', 'Object');
  // Edit Mode menus: decoration for now.
  const editMenus = ['Mesh', 'Vertex', 'Edge', 'Face', 'UV'].map((t) => el('span', 'bl-menu', t));
  for (const m of editMenus) m.hidden = true;
  header.append(
    el('span', 'bl-editor-type', '▣'),
    modeMenu,
    selectModeGroup,
    viewMenu,
    selectMenu,
    addMenu,
    objectMenu,
    ...editMenus,
  );
  const viewportHeaderText = el('span', 'bl-header-text');
  viewportHeaderText.hidden = true;
  // Toggle X-Ray: the mouse alternative to Alt+Z (which some graphics drivers
  // take for their own overlay). Own icon: two overlapping squares, the back one seen through.
  // FIDELITY? Tooltip text.
  const xrayButton = el('button', 'bl-header-toggle');
  xrayButton.type = 'button';
  xrayButton.title = 'Toggle X-Ray (Alt Z)';
  xrayButton.setAttribute('aria-pressed', 'false');
  // Keep keyboard focus off it: Enter or Space later would toggle it again.
  xrayButton.addEventListener('mousedown', (e) => e.preventDefault());
  xrayButton.innerHTML =
    '<svg viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" stroke-dasharray="2 1.5"/><rect x="5.5" y="5.5" width="9" height="9" fill="currentColor" fill-opacity="0.45" stroke="currentColor"/></svg>';
  // Viewport Shading buttons, after X-ray as in Blender. Own icons.
  const SHADING_ICONS = {
    WIREFRAME: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/><ellipse cx="8" cy="8" rx="2.6" ry="6" fill="none" stroke="currentColor"/><path d="M2 8h12" stroke="currentColor"/></svg>',
    SOLID: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="currentColor"/></svg>',
    MATERIAL: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/><path d="M2.5 8H8M8 2v12" stroke="currentColor"/></svg>',
    RENDERED: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.8" fill="currentColor"/></svg>',
  } as const;
  const SHADING_TITLES = { WIREFRAME: 'Wireframe', SOLID: 'Solid', MATERIAL: 'Material Preview', RENDERED: 'Rendered' } as const;
  const shadingGroup = el('div', 'bl-selectmode bl-shading');
  const shadingButtons = {} as Record<'WIREFRAME' | 'SOLID' | 'MATERIAL' | 'RENDERED', HTMLButtonElement>;
  for (const k of ['WIREFRAME', 'SOLID', 'MATERIAL', 'RENDERED'] as const) {
    const b = el('button', 'bl-selectmode-button');
    b.type = 'button';
    b.title = SHADING_TITLES[k];
    b.innerHTML = SHADING_ICONS[k];
    b.addEventListener('mousedown', (e) => e.preventDefault());
    shadingButtons[k] = b;
    shadingGroup.append(b);
  }
  header.append(viewportHeaderText, el('span', 'bl-spacer'), xrayButton, shadingGroup);
  const viewport = el('div', 'bl-viewport');
  viewArea.append(header, viewport);

  const outliner = el('section', 'bl-area bl-area-outliner');
  const outlinerHeader = el('div', 'bl-header');
  outlinerHeader.append(el('span', 'bl-editor-type', '☰'), el('span', 'bl-search'));
  const outlinerBody = el('div', 'bl-outliner-body');
  outliner.append(outlinerHeader, outlinerBody);
  const propertiesArea = el('section', 'bl-area bl-area-properties');
  // Layout workspace: Outliner on top, Properties Editor below.
  const right = el('div', 'bl-right');
  right.append(outliner, propertiesArea);

  main.append(viewArea, right);

  const status = el('div', 'bl-statusbar');
  const statusLeft = el('div', 'bl-status-left');
  status.append(statusLeft, el('span', 'bl-spacer'), el('span', 'bl-version', '5.2.0'));

  container.append(topbar, main, status);
  return {
    root: container,
    viewport,
    viewportHeaderText,
    viewMenu,
    selectMenu,
    objectMenu,
    addMenu,
    modeMenu,
    selectModeButtons,
    xrayButton,
    shadingButtons,
    // FIDELITY? In Edit Mode, Blender's Add menu adds primitives into the mesh (not in the lab).
    objectModeOnly: [objectMenu, addMenu],
    editModeOnly: [selectModeGroup, ...editMenus],
    outlinerBody,
    propertiesArea,
    statusLeft,
  };
}
