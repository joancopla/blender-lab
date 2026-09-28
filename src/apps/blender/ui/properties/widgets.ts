/**
 * Property widgets for Properties Editor panels, in Blender's split layout
 * (label on the left, control on the right). Each widget is built once and
 * then refreshed with `update`, so a field being dragged or typed in is never
 * rebuilt under the pointer.
 */
import { type MenuItem, attachMenu } from '../menu';
import { NumberField } from '../number-field';

export interface Widget {
  readonly element: HTMLElement;
  update(): void;
  dispose?(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Keeps keyboard focus off a button: Enter or Space later would press it again. */
const noFocus = (b: HTMLElement) => b.addEventListener('mousedown', (e) => e.preventDefault());

function splitRow(label: string, control: HTMLElement): HTMLElement {
  const row = el('div', 'bl-mp-row');
  row.append(el('span', 'bl-mp-label', label), control);
  return row;
}

export interface NumberSpec {
  readonly label: string;
  get(): number;
  /** Shows the value while dragging (null: back to the committed state). */
  preview(v: number | null): void;
  commit(v: number): void;
  format(v: number): string;
  readonly dragStep: number;
  readonly snapStep: number;
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  /** Label inside the field instead of on the left (X / Y / Z of a vector). */
  readonly inner?: string;
}

export function numberWidget(spec: NumberSpec): Widget {
  const fix = (v: number) => {
    let out = spec.integer ? Math.round(v) : v;
    if (spec.min !== undefined) out = Math.max(spec.min, out);
    if (spec.max !== undefined) out = Math.min(spec.max, out);
    return out;
  };
  const field = new NumberField({
    label: spec.inner ?? '',
    format: (v) => spec.format(fix(v)),
    dragStep: spec.dragStep,
    snapStep: spec.snapStep,
    onPreview: (v) => spec.preview(fix(v)),
    onCommit: (v) => spec.commit(fix(v)),
    onCancel: () => spec.preview(null),
  });
  const element = splitRow(spec.label, field.element);
  return {
    element,
    update: () => field.setValue(spec.get()),
    dispose: () => field.dispose(),
  };
}

/** A checkbox in the right column, with its label next to it (Blender's split layout). */
export function checkboxWidget(label: string, get: () => boolean, set: (v: boolean) => void, disabled = false): Widget {
  const box = el('button', 'bl-mp-check');
  box.type = 'button';
  box.setAttribute('role', 'checkbox');
  box.disabled = disabled;
  noFocus(box);
  const mark = el('span', 'bl-mp-check-box');
  box.append(mark, el('span', undefined, label));
  box.addEventListener('click', () => set(!get()));
  const element = splitRow('', box);
  return {
    element,
    update: () => {
      const on = get();
      box.classList.toggle('is-on', on);
      box.setAttribute('aria-checked', String(on));
      mark.textContent = on ? '✓' : '';
    },
  };
}

export interface Choice<T> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * A row of linked buttons, one of them pressed (Catmull-Clark | Simple).
 * `stacked`: the label goes above and the buttons use the full width (when
 * there are too many for the right column).
 */
export function segmentedWidget<T>(
  label: string,
  choices: readonly Choice<T>[],
  get: () => T,
  set: (v: T) => void,
  stacked = false,
): Widget {
  const group = el('div', 'bl-mp-segmented');
  const buttons = choices.map((c) => {
    const b = el('button', 'bl-mp-seg', c.label);
    b.type = 'button';
    b.disabled = c.disabled ?? false;
    noFocus(b);
    b.addEventListener('click', () => set(c.value));
    group.append(b);
    return b;
  });
  let element: HTMLElement = group;
  if (label && stacked) {
    element = el('div', 'bl-mp-stacked');
    element.append(el('span', 'bl-mp-label', label), group);
  } else if (label) {
    element = splitRow(label, group);
  }
  return {
    element,
    update: () => {
      const v = get();
      choices.forEach((c, i) => buttons[i]!.classList.toggle('is-on', c.value === v));
    },
  };
}

/** Three toggles X / Y / Z (Mirror's Axis, Bisect and Flip). */
export function axisWidget(
  label: string,
  get: () => readonly [boolean, boolean, boolean],
  set: (v: [boolean, boolean, boolean]) => void,
): Widget {
  const group = el('div', 'bl-mp-segmented');
  const buttons = (['X', 'Y', 'Z'] as const).map((axis, i) => {
    const b = el('button', 'bl-mp-seg', axis);
    b.type = 'button';
    noFocus(b);
    b.addEventListener('click', () => {
      const v = [...get()] as [boolean, boolean, boolean];
      v[i] = !v[i];
      set(v);
    });
    group.append(b);
    return b;
  });
  return {
    element: splitRow(label, group),
    update: () => {
      const v = get();
      buttons.forEach((b, i) => b.classList.toggle('is-on', v[i]!));
    },
  };
}

/** A drop-down button showing the current choice (Fit Type, Width Type, Mode). */
export function dropdownWidget<T>(label: string, choices: readonly Choice<T>[], get: () => T, set: (v: T) => void): Widget {
  const button = el('button', 'bl-mp-dropdown');
  button.type = 'button';
  noFocus(button);
  attachMenu(button, () =>
    choices.map((c): MenuItem => (c.disabled ? { label: c.label, disabled: true } : { label: c.label, action: () => set(c.value) })),
  );
  return {
    element: splitRow(label, button),
    update: () => {
      button.textContent = choices.find((c) => c.value === get())?.label ?? '';
    },
  };
}

/** An object field: the picked object's name, a menu to pick another and × to clear it. */
export function objectWidget(
  label: string,
  get: () => string | null,
  options: () => readonly { id: string; name: string }[],
  set: (id: string | null) => void,
): Widget {
  const box = el('div', 'bl-mp-object');
  const pick = el('button', 'bl-mp-dropdown');
  pick.type = 'button';
  noFocus(pick);
  attachMenu(pick, () => options().map((o): MenuItem => ({ label: o.name, action: () => set(o.id) })));
  const clear = el('button', 'bl-mp-clear', '×');
  clear.type = 'button';
  clear.title = 'Clear';
  noFocus(clear);
  clear.addEventListener('click', () => set(null));
  box.append(pick, clear);
  return {
    element: splitRow(label, box),
    update: () => {
      const id = get();
      pick.textContent = options().find((o) => o.id === id)?.name ?? '';
      clear.hidden = id === null;
    },
  };
}

/**
 * A collapsible subpanel ("Advanced", "Relative Offset"...). With `check`, its
 * header has a checkbox that turns the whole group on or off, as in Blender.
 */
export function subpanelWidget(
  title: string,
  open: { get(): boolean; set(v: boolean): void },
  children: readonly Widget[],
  check?: { get(): boolean; set(v: boolean): void },
): Widget {
  const box = el('div', 'bl-mp-sub');
  const header = el('div', 'bl-mp-sub-header');
  const arrow = el('button', 'bl-mod-arrow');
  arrow.type = 'button';
  noFocus(arrow);
  arrow.addEventListener('click', () => {
    open.set(!open.get());
    sync();
  });
  header.append(arrow);
  let mark: HTMLElement | null = null;
  if (check) {
    const b = el('button', 'bl-mp-check bl-mp-sub-check');
    b.type = 'button';
    b.setAttribute('role', 'checkbox');
    noFocus(b);
    mark = el('span', 'bl-mp-check-box');
    b.append(mark);
    b.addEventListener('click', () => check.set(!check.get()));
    header.append(b);
  }
  const name = el('span', 'bl-mp-sub-title', title);
  name.addEventListener('click', () => {
    open.set(!open.get());
    sync();
  });
  header.append(name);
  const body = el('div', 'bl-mp-sub-body');
  for (const c of children) body.append(c.element);
  box.append(header, body);
  const sync = () => {
    const on = open.get();
    arrow.textContent = on ? '▾' : '▸';
    body.hidden = !on;
  };
  sync();
  return {
    element: box,
    update: () => {
      if (check && mark) {
        const on = check.get();
        mark.textContent = on ? '✓' : '';
        mark.parentElement!.classList.toggle('is-on', on);
        body.classList.toggle('is-inactive', !on);
      }
      for (const c of children) c.update();
    },
    dispose: () => {
      for (const c of children) c.dispose?.();
    },
  };
}
