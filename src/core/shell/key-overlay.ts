/**
 * Key overlay (lab UI, not part of Blender): shows the keys and clicks the
 * student presses, like the Screencast Keys add-on. Bottom left of the viewport.
 */
import { type MouseAction, type Mods, describeKey, describeMouse } from './key-names';

const MAX_ITEMS = 5;
const LIFETIME_MS = 2500;

interface Item {
  text: string;
  count: number;
  el: HTMLDivElement;
  timer: number;
}

export class KeyOverlay {
  readonly element: HTMLDivElement;
  private items: Item[] = [];
  private enabled = true;
  private readonly listeners = new Set<(text: string) => void>();

  constructor(parent: HTMLElement, watch: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'lab-keys';
    this.element.setAttribute('aria-hidden', 'true');
    parent.append(this.element);

    const mods = (e: KeyboardEvent | MouseEvent): Mods => ({ ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey });
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.repeat) return;
        const text = describeKey(e.code, mods(e));
        if (text) this.push(text);
      },
      { capture: true },
    );
    watch.addEventListener(
      'pointerdown',
      (e) => {
        const action: MouseAction | null = e.button === 0 ? 'left' : e.button === 1 ? 'middle' : e.button === 2 ? 'right' : null;
        if (action) this.push(describeMouse(action, mods(e)));
      },
      { capture: true },
    );
    watch.addEventListener(
      'wheel',
      (e) => {
        if (e.deltaY !== 0) this.push(describeMouse(e.deltaY < 0 ? 'wheelUp' : 'wheelDown', mods(e)));
      },
      { capture: true, passive: true },
    );
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.element.hidden = !on;
    if (!on) {
      for (const i of this.items) window.clearTimeout(i.timer);
      this.items = [];
      this.element.replaceChildren();
    }
  }

  /** Every key or click seen, even while the overlay is hidden (stage panel key chips). */
  onPress(fn: (text: string) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private push(text: string): void {
    for (const fn of this.listeners) fn(text);
    if (!this.enabled) return;
    const last = this.items[this.items.length - 1];
    if (last && last.text === text) {
      last.count++;
      last.el.textContent = `${text} ×${last.count}`;
      window.clearTimeout(last.timer);
      last.timer = this.expire(last);
      return;
    }
    const el = document.createElement('div');
    el.className = 'lab-keys-item';
    el.textContent = text;
    this.element.append(el);
    const item: Item = { text, count: 1, el, timer: 0 };
    item.timer = this.expire(item);
    this.items.push(item);
    while (this.items.length > MAX_ITEMS) this.remove(this.items[0]!);
  }

  private expire(item: Item): number {
    return window.setTimeout(() => this.remove(item), LIFETIME_MS);
  }

  private remove(item: Item): void {
    window.clearTimeout(item.timer);
    item.el.remove();
    this.items = this.items.filter((i) => i !== item);
  }
}
