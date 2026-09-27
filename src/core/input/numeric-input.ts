/**
 * Numeric input during a modal transform: typing a number makes the value exact.
 * Digits, "." (or ","), "-" (toggles the sign), Backspace, Tab (next component).
 * FIDELITY? Blender also accepts expressions and units ("2cm"); not supported here.
 */
export class NumericInput {
  private readonly text: string[];
  private readonly negative: boolean[];
  private index = 0;
  private started = false;

  constructor(private readonly components: number) {
    this.text = Array.from({ length: components }, () => '');
    this.negative = Array.from({ length: components }, () => false);
  }

  /** True once the user has typed something: the mouse no longer drives the value. */
  get active(): boolean {
    return this.started;
  }

  get currentIndex(): number {
    return this.index;
  }

  /** Returns true if the key was used. */
  key(code: string): boolean {
    const i = this.index;
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(code);
    if (digit) {
      this.text[i] = (this.text[i] ?? '') + digit[1]!;
      this.started = true;
      return true;
    }
    if (code === 'Period' || code === 'NumpadDecimal' || code === 'Comma') {
      if (!this.text[i]!.includes('.')) this.text[i] = (this.text[i] || '0') + '.';
      this.started = true;
      return true;
    }
    if (code === 'Minus' || code === 'NumpadSubtract') {
      this.negative[i] = !this.negative[i];
      this.started = true;
      return true;
    }
    if (code === 'Backspace') {
      if (!this.started) return false;
      if (this.text[i]) this.text[i] = this.text[i]!.slice(0, -1);
      else if (this.negative[i]) this.negative[i] = false;
      // Everything erased: back to mouse control.
      if (this.text.every((t) => t === '') && this.negative.every((n) => !n)) this.started = false;
      return true;
    }
    if (code === 'Tab' && this.components > 1) {
      this.index = (this.index + 1) % this.components;
      this.started = true;
      return true;
    }
    return false;
  }

  /** Typed value of a component (`empty` when nothing was typed in it, e.g. 1 for scale). */
  value(i = 0, empty = 0): number {
    const t = this.text[i] ?? '';
    const n = t === '' || t === '.' ? empty : Number(t);
    return this.negative[i] ? -n : n;
  }

  /** Text as shown in the header, with a caret on the component being edited. */
  display(i = 0): string {
    const t = `${this.negative[i] ? '-' : ''}${this.text[i] ?? ''}`;
    return i === this.index ? `[${t}|]` : t || '0';
  }
}
