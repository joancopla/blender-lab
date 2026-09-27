/**
 * Adjust Last Operation panel (bottom left of the 3D Viewport). Shows the
 * parameters of the last tool; changing one re-runs the tool from the state
 * before it and replaces its undo step, as in Blender.
 * FIDELITY? Blender shows it collapsed or expanded depending on the tool; here it
 * starts expanded.
 */
import { formatDistance } from './format';
import { NumberField } from './number-field';

export type AdjustField =
  | { readonly key: string; readonly label: string; readonly kind: 'distance'; readonly min?: number }
  | { readonly key: string; readonly label: string; readonly kind: 'int'; readonly min: number; readonly max: number }
  | { readonly key: string; readonly label: string; readonly kind: 'factor'; readonly min: number; readonly max: number }
  | { readonly key: string; readonly label: string; readonly kind: 'bool' };

export type AdjustValues = Record<string, number | boolean>;

export interface AdjustableOp {
  /** Operator name, as in Blender ("Inset Faces", "Bevel"...). */
  readonly title: string;
  readonly fields: readonly AdjustField[];
  readonly values: AdjustValues;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class AdjustPanel {
  readonly element: HTMLDivElement;
  private open = true;

  constructor(
    viewport: HTMLElement,
    private readonly onChange: (values: AdjustValues) => void,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'bl-adjust';
    this.element.hidden = true;
    for (const type of ['pointerdown', 'wheel', 'contextmenu'] as const) {
      this.element.addEventListener(type, (e) => e.stopPropagation());
    }
    viewport.append(this.element);
  }

  hide(): void {
    this.element.hidden = true;
    this.element.replaceChildren();
    this.element.parentElement?.classList.remove('has-adjust');
  }

  show(op: AdjustableOp): void {
    const el = this.element;
    el.replaceChildren();
    el.hidden = false;
    el.parentElement?.classList.add('has-adjust');
    const header = document.createElement('div');
    header.className = 'bl-adjust-header';
    header.textContent = `${this.open ? '▾' : '▸'} ${op.title}`;
    header.addEventListener('click', () => {
      this.open = !this.open;
      this.show(op);
    });
    el.append(header);
    if (!this.open) return;
    const values: AdjustValues = { ...op.values };
    for (const f of op.fields) {
      const row = document.createElement('div');
      row.className = 'bl-adjust-row';
      if (f.kind === 'bool') {
        const label = document.createElement('label');
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = values[f.key] === true;
        box.addEventListener('change', () => {
          values[f.key] = box.checked;
          this.onChange({ ...values });
        });
        label.append(box, document.createTextNode(` ${f.label}`));
        row.append(label);
      } else {
        const name = document.createElement('span');
        name.className = 'bl-adjust-label';
        name.textContent = f.label;
        const isInt = f.kind === 'int';
        const field = new NumberField({
          label: '',
          format: (v) => (isInt ? String(Math.round(v)) : f.kind === 'distance' ? formatDistance(v) : v.toFixed(3)),
          dragStep: isInt ? 0.1 : 0.005,
          snapStep: isInt ? 1 : 0.1,
          onPreview: () => {},
          onCommit: (v) => {
            let x = isInt ? Math.round(v) : v;
            if (f.kind === 'int' || f.kind === 'factor') x = clamp(x, f.min, f.max);
            if (f.kind === 'distance') x = Math.max(f.min ?? 0, x);
            values[f.key] = x;
            this.onChange({ ...values });
          },
          onCancel: () => field.setValue(values[f.key] as number),
        });
        field.setValue(values[f.key] as number);
        row.append(name, field.element);
      }
      el.append(row);
    }
  }
}
