/**
 * Properties Editor > World: the Surface panel (Background: Color and
 * Strength). The other panels are shown folded and inactive.
 * FIDELITY? Panel list in Blender 5.2 (it depends on the render engine) and
 * whether Surface shows the node ("Surface: Background").
 */
import { worldOf } from '../../scene/scene';
import { SetWorldOp, setWorld } from '../../operators/world';
import { type TabContext, type TabView, contextPath } from './properties-editor';
import { type Widget, colorWidget, numberWidget } from './widgets';

const PANELS = ['Surface', 'Volume', 'Settings', 'Viewport Display', 'Custom Properties'] as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function worldTab(body: HTMLElement, ctx: TabContext): TabView {
  const { store } = ctx;
  const world = () => worldOf(store.displayState);
  const widgets: Widget[] = [
    colorWidget(
      'Color',
      () => world().color,
      (v) => store.setPreview(v ? setWorld(store.state, { color: v }) : null),
      (v) => store.execute(SetWorldOp({ color: v }, 'Color')),
    ),
    numberWidget({
      label: 'Strength',
      get: () => world().strength,
      preview: (v) => store.setPreview(v === null ? null : setWorld(store.state, { strength: v })),
      commit: (v) => store.execute(SetWorldOp({ strength: v }, 'Strength')),
      format: (v) => v.toFixed(3),
      dragStep: 0.01,
      snapStep: 0.1,
      min: 0,
    }),
  ];

  body.replaceChildren(contextPath(['Scene', 'World']));
  for (const title of PANELS) {
    const panel = el('div', 'bl-data-panel');
    const header = el('div', 'bl-data-header');
    const working = title === 'Surface';
    header.append(el('span', 'bl-data-arrow', working ? '▾' : '▸'), el('span', undefined, title));
    panel.append(header);
    if (working) {
      const content = el('div', 'bl-mod-body');
      const surface = el('div', 'bl-mp-row');
      surface.append(el('span', 'bl-mp-label', 'Surface'), el('span', 'bl-mp-dropdown', 'Background'));
      content.append(surface);
      for (const w of widgets) content.append(w.element);
      panel.append(content);
    } else {
      panel.classList.add('is-inactive');
    }
    body.append(panel);
  }

  return {
    update: () => {
      for (const w of widgets) w.update();
    },
    dispose: () => {
      for (const w of widgets) w.dispose?.();
    },
  };
}
