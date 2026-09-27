/**
 * 3D Viewport sidebar (N panel), tab Item > Transform: Location, Rotation
 * (XYZ Euler, degrees), Scale and Dimensions of the active object. Every change
 * goes through an operator, so it can be undone.
 * FIDELITY? Layout, labels, lock icons, tabs and colours are approximations.
 */
import { type Axis, SetTransformOp, type TransformField, readField, setField } from '../operators/set-transform';
import { type SceneState, activeObject } from '../scene/scene';
import type { SceneStore } from '../../../core/history/store';
import { formatAngle, formatDistance, formatScale } from './format';
import { NumberField } from './number-field';

interface FieldSpec {
  readonly field: TransformField;
  readonly title: string;
  format(v: number): string;
  readonly dragStep: number;
  readonly snapStep: number;
  readonly lock: boolean;
}

const SPECS: readonly FieldSpec[] = [
  { field: 'location', title: 'Location:', format: formatDistance, dragStep: 0.01, snapStep: 0.1, lock: true },
  { field: 'rotation', title: 'Rotation:', format: formatAngle, dragStep: 1, snapStep: 5, lock: true },
  { field: 'scale', title: 'Scale:', format: formatScale, dragStep: 0.01, snapStep: 0.1, lock: true },
  { field: 'dimensions', title: 'Dimensions:', format: formatDistance, dragStep: 0.01, snapStep: 0.1, lock: false },
];

const LOCK_ICON =
  '<svg viewBox="0 0 16 16"><rect x="4" y="7" width="8" height="6" rx="1" fill="none" stroke="currentColor"/><path d="M6 7V5.5a2 2 0 0 1 4 0V7" fill="none" stroke="currentColor"/></svg>';

export const SIDEBAR_WIDTH_PX = 250;

export class Sidebar {
  readonly element: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly fields: { spec: FieldSpec; axis: Axis; field: NumberField }[] = [];
  private shown = false;

  constructor(
    private readonly viewport: HTMLElement,
    private readonly store: SceneStore,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'bl-sidebar';
    this.element.hidden = true;
    this.element.style.setProperty('--sidebar-w', `${SIDEBAR_WIDTH_PX}px`);
    // The sidebar is its own region: no viewport selection or zoom through it.
    for (const type of ['pointerdown', 'wheel', 'contextmenu'] as const) {
      this.element.addEventListener(type, (e) => e.stopPropagation());
    }

    this.content = document.createElement('div');
    this.content.className = 'bl-sidebar-content';
    const tabs = document.createElement('div');
    tabs.className = 'bl-sidebar-tabs';
    for (const name of ['Item', 'Tool', 'View']) {
      const t = document.createElement('span');
      t.className = name === 'Item' ? 'bl-sidebar-tab is-active' : 'bl-sidebar-tab';
      t.textContent = name;
      tabs.append(t);
    }
    this.element.append(this.content, tabs);
    this.buildTransformPanel();
    viewport.append(this.element);
  }

  get visible(): boolean {
    return this.shown;
  }

  toggle(): void {
    this.shown = !this.shown;
    this.element.hidden = !this.shown;
    this.viewport.classList.toggle('has-sidebar', this.shown);
  }

  private buildTransformPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'bl-panel';
    const header = document.createElement('div');
    header.className = 'bl-panel-header';
    header.textContent = 'Transform';
    const body = document.createElement('div');
    body.className = 'bl-panel-body';
    panel.append(header, body);

    for (const spec of SPECS) {
      const title = document.createElement('div');
      title.className = 'bl-prop-title';
      title.textContent = spec.title;
      body.append(title);
      ([0, 1, 2] as const).forEach((axis) => {
        const row = document.createElement('div');
        row.className = 'bl-prop-row';
        const field = new NumberField({
          label: ['X', 'Y', 'Z'][axis]!,
          format: spec.format,
          dragStep: spec.dragStep,
          snapStep: spec.snapStep,
          onPreview: (v) => this.preview(spec.field, axis, v),
          onCommit: (v) => this.commit(spec.field, axis, v),
          onCancel: () => this.store.setPreview(null),
          onTab: () => this.focusNext(spec.field, axis),
        });
        row.append(field.element);
        const lock = document.createElement('span');
        lock.className = 'bl-lock';
        if (spec.lock) lock.innerHTML = LOCK_ICON;
        row.append(lock);
        body.append(row);
        this.fields.push({ spec, axis, field });
      });
      if (spec.field === 'rotation') {
        const mode = document.createElement('div');
        mode.className = 'bl-prop-row';
        const dd = document.createElement('span');
        dd.className = 'bl-dropdown bl-rotation-mode';
        dd.textContent = 'XYZ Euler';
        mode.append(dd);
        body.append(mode);
      }
    }
    this.content.append(panel);
  }

  private preview(field: TransformField, axis: Axis, v: number): void {
    const id = this.store.state.activeId;
    if (id) this.store.setPreview(setField(this.store.state, id, field, axis, v));
  }

  private commit(field: TransformField, axis: Axis, v: number): void {
    const id = this.store.state.activeId;
    if (id) this.store.execute(SetTransformOp(id, field, axis, v));
    else this.store.setPreview(null);
  }

  private focusNext(field: TransformField, axis: Axis): void {
    const i = this.fields.findIndex((f) => f.spec.field === field && f.axis === axis);
    this.fields[(i + 1) % this.fields.length]?.field.startEdit();
  }

  /** Shows the values of the active object (the preview while dragging or during G/R/S). */
  update(scene: SceneState): void {
    const active = activeObject(scene);
    this.content.hidden = !active;
    if (!active) return;
    for (const { spec, axis, field } of this.fields) field.setValue(readField(active, spec.field, axis));
  }
}
