/**
 * Static shell of Blender's Layout workspace (simplified). Menus and tabs are
 * decoration with the exact labels; they do nothing.
 * FIDELITY? Workspace tab list and status bar texts for 5.2.
 */
import './blender-ui.css';

export interface LayoutRefs {
  readonly root: HTMLElement;
  readonly viewport: HTMLElement;
  readonly outlinerBody: HTMLElement;
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
  header.append(
    el('span', 'bl-editor-type', '▣'),
    el('span', 'bl-dropdown', 'Object Mode'),
    el('span', 'bl-menu', 'View'),
    el('span', 'bl-menu', 'Select'),
    el('span', 'bl-menu', 'Add'),
    el('span', 'bl-menu', 'Object'),
  );
  const viewport = el('div', 'bl-viewport');
  viewArea.append(header, viewport);

  const outliner = el('section', 'bl-area bl-area-outliner');
  const outlinerHeader = el('div', 'bl-header');
  outlinerHeader.append(el('span', 'bl-editor-type', '☰'), el('span', 'bl-search'));
  const outlinerBody = el('div', 'bl-outliner-body');
  outliner.append(outlinerHeader, outlinerBody);

  main.append(viewArea, outliner);

  const status = el('div', 'bl-statusbar');
  const statusLeft = el('div', 'bl-status-left');
  status.append(statusLeft, el('span', 'bl-spacer'), el('span', 'bl-version', '5.2.0'));

  container.append(topbar, main, status);
  return { root: container, viewport, outlinerBody, statusLeft };
}
