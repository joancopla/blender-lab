/**
 * The options bar: the Move tool's options, or, while a transform runs, the
 * position, size, angle and skew of the box with Cancel and Commit.
 * Fields are built once per mode and refreshed, so a field being typed in is
 * never rebuilt.
 */
import type { PsController } from '../photoshop-app';
import { type Readout, fromReadout, readout } from '../transform/transform';
import { ICONS, REFERENCE_GRID } from './icons';
import { OPTIONS, formatNumber, parseNumber } from './labels';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** A control that is drawn but does nothing in this lab. */
function inert(html: string, title: string, cls = 'ps-opt-icon'): HTMLElement {
  const b = el('span', `${cls} is-inert`);
  b.innerHTML = html;
  b.title = title;
  return b;
}

type FieldKey = keyof Readout;

const FIELDS: readonly { key: FieldKey; label: string; unit: string; icon?: string }[] = [
  { key: 'x', label: OPTIONS.x, unit: ' px' },
  { key: 'y', label: OPTIONS.y, unit: ' px' },
  { key: 'w', label: OPTIONS.w, unit: '%' },
  { key: 'h', label: OPTIONS.h, unit: '%' },
  { key: 'angle', label: '', unit: ' °', icon: ICONS.angle },
  { key: 'skew', label: OPTIONS.skewH, unit: ' °' },
];

export class OptionsBar {
  readonly element = el('div', 'ps-options');
  private mode: 'move' | 'transform' | null = null;
  private inputs = new Map<FieldKey, HTMLInputElement>();
  /** FIDELITY? "Mantener proporción" is on by default. */
  private linked = true;
  private link: HTMLButtonElement | null = null;

  constructor(private readonly app: PsController) {}

  render(): void {
    const session = this.app.session();
    const mode = session ? 'transform' : 'move';
    if (mode !== this.mode) {
      this.mode = mode;
      this.inputs.clear();
      this.element.replaceChildren(...(mode === 'transform' ? this.buildTransform() : this.buildMove()));
    }
    const box = this.app.box();
    if (!session || !box) return;
    const r = readout(session.start, box);
    for (const f of FIELDS) {
      const input = this.inputs.get(f.key)!;
      if (document.activeElement !== input) input.value = `${formatNumber(r[f.key])}${f.unit}`;
    }
  }

  private buildMove(): HTMLElement[] {
    const tool = inert(ICONS.move, '', 'ps-opt-tool');
    const auto = el('label', 'ps-opt-check is-inert');
    const box = el('input');
    box.type = 'checkbox';
    box.disabled = true;
    auto.append(box, el('span', undefined, OPTIONS.autoSelect));
    const target = el('span', 'ps-opt-select is-inert', OPTIONS.autoSelectLayer);
    const controls = el('label', 'ps-opt-check is-inert');
    const box2 = el('input');
    box2.type = 'checkbox';
    box2.disabled = true;
    controls.append(box2, el('span', undefined, OPTIONS.showTransformControls));
    return [tool, auto, target, el('span', 'ps-opt-sep'), controls];
  }

  private buildTransform(): HTMLElement[] {
    const out: HTMLElement[] = [inert(ICONS.move, '', 'ps-opt-tool'), inert(REFERENCE_GRID, OPTIONS.referencePoint)];
    for (const f of FIELDS) {
      const wrap = el('label', 'ps-opt-field');
      if (f.icon) {
        const icon = el('span', 'ps-opt-label');
        icon.innerHTML = f.icon;
        icon.title = OPTIONS.rotate;
        wrap.append(icon);
      } else wrap.append(el('span', 'ps-opt-label', f.label));
      const input = el('input');
      input.type = 'text';
      input.spellcheck = false;
      input.setAttribute('aria-label', f.label || OPTIONS.rotate);
      input.addEventListener('focus', () => input.select());
      input.addEventListener('change', () => this.typed(f.key, input.value));
      input.addEventListener('keydown', (e) => {
        // FIDELITY? Intro in a field applies the value and keeps the transform open.
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          input.blur();
        }
      });
      this.inputs.set(f.key, input);
      wrap.append(input);
      out.push(wrap);
      if (f.key === 'x') out.push(inert(ICONS.delta, OPTIONS.relative));
      if (f.key === 'w') {
        const link = el('button', 'ps-opt-icon ps-opt-link');
        link.type = 'button';
        link.innerHTML = ICONS.chain;
        link.title = OPTIONS.link;
        link.setAttribute('aria-pressed', String(this.linked));
        link.addEventListener('click', () => {
          this.linked = !this.linked;
          link.setAttribute('aria-pressed', String(this.linked));
        });
        this.link = link;
        out.push(link);
      }
    }
    // Vertical skew, interpolation and warp are drawn but not part of this lab.
    const skewV = el('label', 'ps-opt-field is-inert');
    const v = el('input');
    v.type = 'text';
    v.value = `${formatNumber(0)} °`;
    v.disabled = true;
    skewV.append(el('span', 'ps-opt-label', OPTIONS.skewV), v);
    const interpolation = el('span', 'ps-opt-interp is-inert');
    interpolation.append(el('span', 'ps-opt-label', OPTIONS.interpolation), el('span', 'ps-opt-select', OPTIONS.bicubicAutomatic));
    const cancel = el('button', 'ps-opt-icon ps-opt-action');
    cancel.type = 'button';
    cancel.innerHTML = ICONS.cancel;
    cancel.title = OPTIONS.cancel;
    cancel.setAttribute('aria-label', OPTIONS.cancel);
    cancel.addEventListener('click', () => this.app.cancel());
    const commit = el('button', 'ps-opt-icon ps-opt-action');
    commit.type = 'button';
    commit.innerHTML = ICONS.commit;
    commit.title = OPTIONS.commit;
    commit.setAttribute('aria-label', OPTIONS.commit);
    commit.addEventListener('click', () => this.app.commit());
    out.push(skewV, interpolation, el('span', 'ps-opt-sep'), inert(ICONS.warp, OPTIONS.warpSwitch), cancel, commit);
    return out;
  }

  /** A value typed in a field: the box is rebuilt from the options bar values. */
  private typed(key: FieldKey, text: string): void {
    const session = this.app.session();
    const box = this.app.box();
    const value = parseNumber(text);
    if (!session || !box || value === null) return this.render();
    const now = readout(session.start, box);
    let next: Readout = { ...now, [key]: value };
    if ((key === 'w' || key === 'h') && value === 0) return this.render();
    // With the link on, width and height change together.
    if (this.linked && this.link) {
      if (key === 'w' && now.w !== 0) next = { ...next, h: (now.h * value) / now.w };
      if (key === 'h' && now.h !== 0) next = { ...next, w: Math.abs((now.w * value) / now.h) };
    }
    if (key === 'w') next = { ...next, w: Math.abs(next.w) };
    if (key === 'skew') next = { ...next, skew: Math.max(-89, Math.min(89, value)) };
    this.app.adjustBox(fromReadout(session.start, next));
  }
}
