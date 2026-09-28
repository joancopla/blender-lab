/**
 * Blender-like number field: drag horizontally to change the value (Ctrl snaps,
 * Shift is precise), or click to type a value (Enter/click outside confirms,
 * Esc cancels, Tab goes to the next field).
 * FIDELITY? Drag speed, snapping steps and the text shown while editing.
 */
import { evaluateExpression } from './expression';

export interface NumberFieldOptions {
  readonly label: string;
  format(value: number): string;
  /** Value change per pixel of horizontal drag. */
  readonly dragStep: number;
  /** Ctrl while dragging snaps to multiples of this. */
  readonly snapStep: number;
  onPreview(value: number): void;
  onCommit(value: number): void;
  onCancel(): void;
  /** Tab while typing: move to the next field. */
  onTab?(): void;
}

const DRAG_THRESHOLD_PX = 3;
const PRECISION = 0.1;

/** Full-precision text for editing: 7.35891 -> "7.35891", 2 -> "2". */
const editText = (v: number) => String(Number(v.toFixed(6)));

export class NumberField {
  readonly element: HTMLDivElement;
  private readonly labelEl: HTMLSpanElement;
  private readonly valueEl: HTMLSpanElement;
  private value = 0;
  private drag: { pointerId: number; lastX: number; offset: number; start: number; dragging: boolean } | null = null;
  private input: HTMLInputElement | null = null;

  constructor(private readonly opts: NumberFieldOptions) {
    this.element = document.createElement('div');
    this.element.className = 'bl-num';
    this.labelEl = document.createElement('span');
    this.labelEl.className = 'bl-num-label';
    this.labelEl.textContent = opts.label;
    this.valueEl = document.createElement('span');
    this.valueEl.className = 'bl-num-value';
    this.element.append(this.labelEl, this.valueEl);

    this.element.addEventListener('pointerdown', this.onDown);
    this.element.addEventListener('pointermove', this.onMove);
    this.element.addEventListener('pointerup', this.onUp);
    this.element.addEventListener('pointercancel', () => this.cancelDrag());
    // Esc cancels a drag; the field has no focus, so listen on the window (capture, before the viewport).
    window.addEventListener('keydown', this.onEscape, { capture: true });
  }

  private onEscape = (e: KeyboardEvent): void => {
    if (this.drag && e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      this.cancelDrag();
    }
  };

  /** Call when the field is thrown away. */
  dispose(): void {
    window.removeEventListener('keydown', this.onEscape, { capture: true });
  }

  get editing(): boolean {
    return this.input !== null || this.drag !== null;
  }

  setValue(v: number): void {
    if (this.editing) return;
    this.value = v;
    this.valueEl.textContent = this.opts.format(v);
  }

  /** Starts typing in this field (Tab from the previous one). */
  startEdit(): void {
    if (this.input) return;
    const input = document.createElement('input');
    input.className = 'bl-num-input';
    input.value = editText(this.value);
    this.input = input;
    this.element.classList.add('is-editing');
    this.element.append(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (commit: boolean) => {
      if (done) return;
      done = true;
      const v = evaluateExpression(input.value);
      input.remove();
      this.input = null;
      this.element.classList.remove('is-editing');
      if (commit && v !== null) this.opts.onCommit(v);
      else this.opts.onCancel();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
      else if (e.key === 'Tab') {
        e.preventDefault();
        finish(true);
        this.opts.onTab?.();
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  private onDown = (e: PointerEvent): void => {
    e.stopPropagation();
    if (this.input) return;
    if (e.button === 2 && this.drag) {
      this.cancelDrag();
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    this.drag = { pointerId: e.pointerId, lastX: e.clientX, offset: 0, start: this.value, dragging: false };
    try {
      this.element.setPointerCapture(e.pointerId);
    } catch {
      // Pointer already released (or synthetic): dragging still works inside the field.
    }
  };

  private onMove = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    d.offset += dx * (e.shiftKey ? PRECISION : 1);
    if (!d.dragging && Math.abs(d.offset) < DRAG_THRESHOLD_PX) return;
    d.dragging = true;
    this.element.classList.add('is-dragging');
    let v = d.start + d.offset * this.opts.dragStep;
    if (e.ctrlKey) v = Math.round(v / this.opts.snapStep) * this.opts.snapStep;
    this.valueEl.textContent = this.opts.format(v);
    this.opts.onPreview(v);
  };

  private onUp = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.element.classList.remove('is-dragging');
    if (d.dragging) {
      let v = d.start + d.offset * this.opts.dragStep;
      if (e.ctrlKey) v = Math.round(v / this.opts.snapStep) * this.opts.snapStep;
      this.opts.onCommit(v);
    } else {
      this.startEdit();
    }
  };

  private cancelDrag(): void {
    if (!this.drag) return;
    this.drag = null;
    this.element.classList.remove('is-dragging');
    this.opts.onCancel();
  }
}
