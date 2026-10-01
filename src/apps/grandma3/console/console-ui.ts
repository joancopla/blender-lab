/**
 * Command line and the classroom controller (a COLORNIE "DMX Controller":
 * encoders, Master, XFade, six executor faders and buttons, Go−/Pause/Go+ and
 * the keypad). Only the keypad builds commands; the other controls are drawn
 * so the layout matches the real one.
 */
import { t } from '../../../core/i18n';
import { type CommandKey, type Token, commandText, popKey, pushKey } from './command';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Keypad rows as on the controller (four columns, Please under the 3). */
const KEYPAD: readonly (readonly (string | null)[])[] = [
  ['7', '8', '9', '+'],
  ['4', '5', '6', 'Thru'],
  ['1', '2', '3', '−'],
  ['0', '.', 'If', 'At'],
  ['Store', 'Clear', 'Please', null],
];
const COMMAND_KEYS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'Thru', '+', '−', 'At']);
/** A long press of Clear empties the programmer. */
export const CLEAR_LONG_MS = 600;

export interface ConsoleHandlers {
  /** Runs the command; returns an error key (ma3.console.errors.*) or null. */
  run(tokens: readonly Token[]): string | null;
  clear(long: boolean): void;
}

export class ConsoleUI {
  readonly root: HTMLElement;
  private tokens: Token[] = [];
  private line: HTMLElement;
  private result: HTMLElement;
  private clearTimer = 0;
  private clearLong = false;

  constructor(private readonly handlers: ConsoleHandlers) {
    this.root = el('section', 'rig-console');
    const cmd = el('div', 'rig-cmd');
    cmd.setAttribute('aria-live', 'polite');
    this.line = el('span', 'rig-cmd-text');
    cmd.append(el('span', 'rig-cmd-prompt', '[Fixture]>'), this.line);
    this.result = el('p', 'rig-cmd-result');
    this.result.setAttribute('role', 'status');

    const ctrl = el('div', 'rig-ctrl');
    const encs = el('div', 'rig-encs');
    encs.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) encs.append(el('i', 'rig-enc'));
    const left = el('div', 'rig-ctrl-left');
    left.append(this.faders(['Master', 'XFade'], [0.7, 0]), this.keys(['Go−', 'Pause', 'Go+'], 'rig-go'));
    const exec = el('div', 'rig-ctrl-exec');
    exec.append(this.faders(['', '', '', '', '', ''], [0, 0, 0, 0, 0, 0]), this.keys(['1', '2', '3', '4', '5', '6'], 'rig-xbtns', 'Exec'));
    const pad = el('div', 'rig-keypad');
    for (const k of KEYPAD.flat()) pad.append(k ? this.key(k) : el('span'));
    ctrl.append(encs, left, exec, pad);

    this.root.append(cmd, this.result, ctrl);
    this.render();
  }

  /** Starts over (stage load). */
  reset(): void {
    this.tokens = [];
    this.result.textContent = '';
    this.result.className = 'rig-cmd-result';
    this.render();
  }

  /** Physical keyboard while the program has the focus. Returns true if used. */
  keyboard(e: KeyboardEvent): boolean {
    if (/^[0-9.]$/.test(e.key)) this.press(e.key);
    else if (e.key === '+') this.press('+');
    else if (e.key === '-') this.press('−');
    else if (e.key === 'Enter') this.press('Please');
    else if (e.key === 'Backspace') {
      this.tokens = popKey(this.tokens);
      this.render();
    } else return false;
    return true;
  }

  private press(k: string): void {
    if (COMMAND_KEYS.has(k)) {
      this.tokens = pushKey(this.tokens, k as CommandKey);
      this.render();
      return;
    }
    if (k === 'Please') {
      const typed = this.tokens;
      this.tokens = [];
      this.render();
      if (typed.length === 0) return;
      const error = this.handlers.run(typed);
      this.say(error ? t(`ma3.console.errors.${error}`, { cmd: commandText(typed) }) : commandText(typed), error !== null);
      return;
    }
    this.say(t('ma3.console.otherLab', { key: k }), false);
  }

  private clearDown(): void {
    this.clearLong = false;
    window.clearTimeout(this.clearTimer);
    this.clearTimer = window.setTimeout(() => {
      this.clearLong = true;
      this.tokens = [];
      this.render();
      this.handlers.clear(true);
      this.say(t('ma3.console.clearedAll'), false);
    }, CLEAR_LONG_MS);
  }

  private clearUp(): void {
    window.clearTimeout(this.clearTimer);
    if (this.clearLong) return;
    // FIDELITY? With text in the command line, Clear deletes the text first.
    if (this.tokens.length > 0) {
      this.tokens = [];
      this.render();
      this.say(t('ma3.console.clearedLine'), false);
      return;
    }
    this.handlers.clear(false);
    this.say(t('ma3.console.clearedSelection'), false);
  }

  private say(text: string, error: boolean): void {
    this.result.textContent = text;
    this.result.className = `rig-cmd-result${error ? ' is-error' : ''}`;
  }

  private render(): void {
    this.line.textContent = commandText(this.tokens);
  }

  private key(k: string, label = k, cls = ''): HTMLButtonElement {
    const b = el('button', `rig-key${/^[0-9.]$/.test(k) ? '' : ' is-fn'}${cls ? ` ${cls}` : ''}`, label);
    b.type = 'button';
    b.dataset.key = k;
    if (k === 'Clear') {
      b.addEventListener('pointerdown', () => this.clearDown());
      b.addEventListener('pointerup', () => this.clearUp());
      b.addEventListener('pointerleave', () => window.clearTimeout(this.clearTimer));
      // Keyboard activation (Enter/Space on the focused key) is a short press.
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          this.clearLong = false;
          this.clearUp();
        }
      });
    } else {
      b.addEventListener('click', () => this.press(k));
    }
    return b;
  }

  private keys(list: readonly string[], cls: string, prefix = ''): HTMLElement {
    const box = el('div', cls);
    for (const k of list) box.append(this.key(prefix ? `${prefix} ${k}` : k, k));
    return box;
  }

  private faders(labels: readonly string[], levels: readonly number[]): HTMLElement {
    const box = el('div', 'rig-mini-faders');
    box.setAttribute('aria-hidden', 'true');
    labels.forEach((label, i) => {
      const f = el('div', 'rig-mini-fader');
      const slot = el('span', 'rig-mini-slot');
      const cap = el('i', 'rig-mini-cap');
      cap.style.bottom = `${(levels[i] ?? 0) * 100}%`;
      slot.append(cap);
      f.append(slot, el('small', undefined, label));
      box.append(f);
    });
    return box;
  }
}
