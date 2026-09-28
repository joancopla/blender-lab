/**
 * Properties Editor > Object Data (mesh): Blender's panels, with only Normals
 * working (Auto Smooth and its angle). The other panels are shown folded and
 * inactive, as parts of Blender outside the lab.
 * FIDELITY? Panel list and order; whether Normals starts open.
 */
import { DEFAULT_AUTO_SMOOTH_ANGLE_DEG, type MeshObject } from '../../scene/scene';
import { SetAutoSmoothOp, setAutoSmooth } from '../../operators/shade';
import { formatAngle } from '../format';
import { type TabContext, type TabView, contextPath } from './properties-editor';
import { type Widget, checkNumberWidget } from './widgets';

const PANELS = [
  'Vertex Groups',
  'Shape Keys',
  'UV Maps',
  'Color Attributes',
  'Attributes',
  'Normals',
  'Texture Space',
  'Remesh',
  'Geometry Data',
  'Custom Properties',
] as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function dataTab(body: HTMLElement, ctx: TabContext): TabView {
  const { store } = ctx;
  let normalsOpen = false;
  let key = '';
  let widgets: Widget[] = [];

  const active = (): MeshObject | null => {
    const o = store.displayState.objects.find((x) => x.id === store.displayState.activeId);
    return o?.type === 'mesh' ? o : null;
  };

  function normals(o: MeshObject): Widget[] {
    const id = o.id;
    return [
      checkNumberWidget(
        'Auto Smooth',
        {
          get: () => active()?.autoSmooth ?? false,
          set: (v) => store.execute(SetAutoSmoothOp(id, { autoSmooth: v }, 'Auto Smooth')),
        },
        {
          get: () => active()?.autoSmoothAngleDeg ?? DEFAULT_AUTO_SMOOTH_ANGLE_DEG,
          preview: (v) => store.setPreview(v === null ? null : setAutoSmooth(store.state, id, { angleDeg: v })),
          commit: (v) => store.execute(SetAutoSmoothOp(id, { angleDeg: v }, 'Angle')),
          format: formatAngle,
          dragStep: 1,
          snapStep: 5,
          min: 0,
          max: 180,
        },
      ),
    ];
  }

  function build(): void {
    for (const w of widgets) w.dispose?.();
    widgets = [];
    const o = active();
    body.replaceChildren(contextPath(o ? [o.name, o.name] : []));
    if (!o) return;
    for (const title of PANELS) {
      const panel = el('div', 'bl-data-panel');
      const header = el('div', 'bl-data-header');
      const working = title === 'Normals';
      const open = working && normalsOpen;
      header.append(el('span', 'bl-data-arrow', open ? '▾' : '▸'), el('span', undefined, title));
      panel.append(header);
      if (working) {
        header.classList.add('is-interactive');
        header.addEventListener('click', () => {
          normalsOpen = !normalsOpen;
          key = '';
          update();
        });
        if (open) {
          const content = el('div', 'bl-mod-body');
          for (const w of normals(o)) {
            content.append(w.element);
            widgets.push(w);
          }
          panel.append(content);
        }
      } else {
        panel.classList.add('is-inactive');
      }
      body.append(panel);
    }
  }

  function update(): void {
    const s = store.state;
    const o = s.objects.find((x) => x.id === s.activeId);
    const next = `${o?.id}|${o?.name}|${o?.type}`;
    if (next !== key) {
      key = next;
      build();
    }
    for (const w of widgets) w.update();
  }

  return {
    update,
    dispose: () => {
      for (const w of widgets) w.dispose?.();
    },
  };
}
