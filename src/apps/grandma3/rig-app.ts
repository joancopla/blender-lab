/**
 * The DMX rig simulator as seen by the core (app contract): a stage with
 * fixtures, the selected fixture's patch and a DMX output with one fader per
 * channel. It is a generic teaching tool, not a copy of a grandMA3 window; the
 * words it uses (Universe, Address, Fixture) are the ones the program uses.
 */
import type { AppMountOptions, PreferenceDefinition, ReplicatedApp } from '../../core/app-contract';
import { HistoryStore, type LogEntry, type OperatorCall } from '../../core/history/store';
import { DMX_MAX, UNIVERSE_SIZE, absoluteAddress, fits, formatAddress, overlaps } from './dmx/dmx';
import { FIXTURE_TYPES, type Fixture, channelRange, channelValues, fixtureOutput, footprintOf } from './dmx/fixtures';
import { type RigDecorations, type RigSetup, type RigState, channel, fixtureById, initialState, setAddress, setChannel } from './state';
import './texts';
import './ui/rig.css';

const PAGE = 16;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const CHANNEL_NAMES = { dimmer: 'Dimmer', red: 'Red', green: 'Green', blue: 'Blue' } as const;
const TYPE_NAMES: Record<keyof typeof FIXTURE_TYPES, string> = { dimmer: 'Dimmer', ledPar4: 'LED PAR · 4 ch' };

export class RigApp implements ReplicatedApp<RigState, RigSetup, RigDecorations> {
  readonly preferences: readonly PreferenceDefinition[] = [];
  private store = new HistoryStore<RigState>({ universes: [], fixtures: [] });
  private setup: RigSetup = { fixtures: [], universes: 1 };
  private root: HTMLElement | null = null;
  private stage!: HTMLElement;
  private inspector!: HTMLElement;
  private output!: HTMLElement;
  private faders!: HTMLElement;
  private pageLabel!: HTMLElement;
  private tabs!: HTMLElement;
  private selected: string | null = null;
  private universe = 1;
  /** First channel of the fader page. */
  private pageStart = 1;
  private highlight: readonly string[] = [];
  private listeners = new Set<() => void>();

  mount(container: HTMLElement, _options: AppMountOptions): void {
    const root = el('div', 'rig');
    root.tabIndex = -1;
    this.stage = el('div', 'rig-stage');
    const bottom = el('div', 'rig-bottom');
    this.inspector = el('section', 'rig-inspector');
    this.output = el('section', 'rig-output');
    bottom.append(this.inspector, this.output);
    root.append(this.stage, bottom);
    container.append(root);
    this.root = root;

    // Output header: universe tabs and fader pages.
    const head = el('div', 'rig-output-head');
    head.append(el('h3', 'rig-title', 'DMX Output'));
    this.tabs = el('div', 'rig-tabs');
    const nav = el('div', 'rig-pages');
    const prev = el('button', 'rig-btn', '‹');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous channels');
    const next = el('button', 'rig-btn', '›');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next channels');
    this.pageLabel = el('span', 'rig-page-label');
    const go = el('input', 'rig-goto') as HTMLInputElement;
    go.type = 'number';
    go.min = '1';
    go.max = String(UNIVERSE_SIZE);
    go.placeholder = 'Ch';
    go.setAttribute('aria-label', 'Go to channel');
    prev.addEventListener('click', () => this.showPage(this.pageStart - PAGE));
    next.addEventListener('click', () => this.showPage(this.pageStart + PAGE));
    go.addEventListener('change', () => {
      const ch = Number(go.value);
      if (Number.isInteger(ch) && ch >= 1 && ch <= UNIVERSE_SIZE) this.showPage(ch);
      go.value = '';
    });
    nav.append(prev, this.pageLabel, next, go);
    head.append(this.tabs, nav);
    this.faders = el('div', 'rig-faders');
    this.output.append(head, this.faders);

    this.stage.addEventListener('click', (e) => {
      const g = (e.target as Element).closest<SVGGElement>('[data-fixture]');
      if (g) this.select(g.dataset.fixture!);
    });
    root.addEventListener('keydown', (e) => this.onKey(e));
    this.store.onChange(() => {
      this.render();
      for (const fn of this.listeners) fn();
    });
  }

  unmount(): void {
    this.root?.remove();
    this.root = null;
  }

  getState(): RigState {
    return this.store.state;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  load(setup: RigSetup): void {
    this.setup = setup;
    this.highlight = [];
    const first = setup.select ? fixtureById(initialState(setup), setup.select) : undefined;
    this.selected = first?.id ?? null;
    this.universe = first?.universe ?? 1;
    this.pageStart = first ? this.pageOf(first.address) : 1;
    this.store.reset(initialState(setup));
    this.renderFaders();
  }

  get log(): readonly LogEntry[] {
    return this.store.log;
  }

  decorate(decorations: RigDecorations | undefined): void {
    const next = decorations?.highlight ?? [];
    if (next.join() === this.highlight.join()) return;
    this.highlight = next;
    this.renderStage();
  }

  overlayHost(): HTMLElement {
    return this.root!;
  }

  inputHost(): HTMLElement {
    return this.root!;
  }

  // --- Actions -------------------------------------------------------------------

  private run(op: OperatorCall<RigState>): void {
    this.store.execute(op);
  }

  private select(id: string): void {
    const f = fixtureById(this.store.displayState, id);
    if (!f) return;
    this.selected = id;
    this.universe = f.universe;
    this.pageStart = this.pageOf(f.address);
    this.renderFaders();
    this.render();
  }

  private pageOf(ch: number): number {
    return Math.floor((Math.min(UNIVERSE_SIZE, Math.max(1, ch)) - 1) / PAGE) * PAGE + 1;
  }

  private showPage(ch: number): void {
    this.pageStart = this.pageOf(ch);
    this.renderFaders();
  }

  private onKey(e: KeyboardEvent): void {
    const typing = (e.target as HTMLElement).matches('input[type="number"]');
    if (typing || !(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) this.store.undo();
    else if ((k === 'z' && e.shiftKey) || k === 'y') this.store.redo();
    else return;
    e.preventDefault();
  }

  // --- Drawing -------------------------------------------------------------------

  private render(): void {
    this.renderStage();
    this.renderInspector();
    this.updateFaders();
  }

  private renderStage(): void {
    const s = this.store.displayState;
    const W = 800;
    const H = 270;
    const top = 58;
    let svg = `<svg class="rig-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stage">
      <defs><linearGradient id="rig-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>
      <radialGradient id="rig-pool"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect class="rig-floor" x="0" y="${H - 44}" width="${W}" height="44"/>`;
    const xOf = (f: Fixture) => 70 + f.x * (W - 140);
    // Beams under everything else.
    for (const f of s.fixtures) {
      const out = fixtureOutput(f, s.universes[f.universe - 1] ?? []);
      const x = xOf(f);
      const c = `rgb(${Math.round(55 + 200 * out.color.r)},${Math.round(55 + 200 * out.color.g)},${Math.round(55 + 200 * out.color.b)})`;
      svg += `<polygon class="rig-beam" points="${x - 10},${top + 34} ${x + 10},${top + 34} ${x + 56},${H - 26} ${x - 56},${H - 26}" style="fill:${c};opacity:${(out.intensity * 0.6).toFixed(3)}"/>`;
      svg += `<ellipse cx="${x}" cy="${H - 26}" rx="62" ry="12" style="fill:${c};opacity:${(out.intensity * 0.45).toFixed(3)}"/>`;
    }
    svg += `<line class="rig-truss" x1="24" y1="${top}" x2="${W - 24}" y2="${top}"/>`;
    for (let x = 34; x < W - 24; x += 24) svg += `<line class="rig-truss-x" x1="${x}" y1="${top - 6}" x2="${x + 12}" y2="${top + 6}"/>`;
    // DMX cables, one per universe, from the output on the left through its fixtures.
    for (let u = 1; u <= s.universes.length; u++) {
      const xs = s.fixtures.filter((f) => f.universe === u).map(xOf).sort((a, b) => a - b);
      const y = top - 18 - (u - 1) * 10;
      if (xs.length) svg += `<path class="rig-cable rig-cable-${u}" d="M8 ${y} H${xs[xs.length - 1]}"/>${xs.map((x) => `<line class="rig-cable rig-cable-${u}" x1="${x}" y1="${y}" x2="${x}" y2="${top + 4}"/>`).join('')}`;
      svg += `<text class="rig-cable-label" x="8" y="${y - 4}">Universe ${u}</text>`;
    }
    for (const f of s.fixtures) {
      const x = xOf(f);
      const out = fixtureOutput(f, s.universes[f.universe - 1] ?? []);
      const sel = f.id === this.selected;
      svg += `<g class="rig-fixture${sel ? ' is-selected' : ''}" data-fixture="${f.id}" tabindex="0" role="button" aria-label="Fixture ${f.number}, address ${formatAddress(f)}">
        <rect class="rig-hit" x="${x - 34}" y="${top - 6}" width="68" height="${H - top - 20}"/>
        <rect class="rig-body" x="${x - 20}" y="${top + 4}" width="40" height="32" rx="6"/>
        <rect class="rig-display" x="${x - 15}" y="${top + 9}" width="30" height="12" rx="2"/>
        <text class="rig-display-text" x="${x}" y="${top + 18}">${String(f.address).padStart(3, '0')}</text>
        <ellipse class="rig-lens" cx="${x}" cy="${top + 34}" rx="11" ry="4" style="opacity:${(0.35 + out.intensity * 0.65).toFixed(3)}"/>
        <text class="rig-number" x="${x}" y="${top + 54}">${f.number}</text>
        ${out.missing ? `<text class="rig-warn" x="${x + 24}" y="${top + 8}">!</text>` : ''}
        ${this.highlight.includes(f.id) ? `<circle class="rig-mark" cx="${x}" cy="${top + 22}" r="34"/>` : ''}
      </g>`;
    }
    svg += '</svg>';
    this.stage.innerHTML = svg;
  }

  private renderInspector(): void {
    const s = this.store.displayState;
    const f = this.selected ? fixtureById(s, this.selected) : undefined;
    const box = this.inspector;
    if (!f) {
      box.replaceChildren(el('h3', 'rig-title', 'Fixture'), el('p', 'rig-muted', 'Click a fixture on the stage.'));
      return;
    }
    const fp = footprintOf(f);
    const [first, last] = channelRange(f);
    const values = channelValues(f, s.universes[f.universe - 1] ?? []);
    const title = el('h3', 'rig-title', `Fixture ${f.number}`);
    const type = el('p', 'rig-muted', `${TYPE_NAMES[f.type]}`);
    const dl = el('dl', 'rig-props');
    const row = (k: string, v: string) => dl.append(el('dt', undefined, k), el('dd', undefined, v));
    row('Universe', String(f.universe));
    row('Address', formatAddress(f));
    row('Absolute', String(absoluteAddress(f)));
    row('Channels', `${first}–${last} (${fp})`);
    const chans = el('ol', 'rig-chans');
    FIXTURE_TYPES[f.type].channels.forEach((fn, i) => {
      const li = el('li');
      const v = values[i];
      li.append(el('span', 'rig-ch-n', String(first + i)), el('span', 'rig-ch-fn', CHANNEL_NAMES[fn]), el('span', 'rig-ch-v', v === null ? '—' : String(v)));
      if (v === null) li.classList.add('is-missing');
      chans.append(li);
    });
    box.replaceChildren(title, type, dl, chans);

    if (!fits(f.address, fp)) box.append(el('p', 'rig-alert', `Channel ${last} does not exist: a universe has ${UNIVERSE_SIZE} channels.`));
    const clash = s.fixtures.filter((o) => o.id !== f.id && o.universe === f.universe && overlaps({ address: f.address, footprint: fp }, { address: o.address, footprint: footprintOf(o) }));
    if (clash.length) box.append(el('p', 'rig-alert', `Shares channels with Fixture ${clash.map((o) => o.number).join(', ')}.`));

    if (this.setup.patch) {
      const patch = el('div', 'rig-patch');
      const minus = el('button', 'rig-btn', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', 'Address minus one');
      const plus = el('button', 'rig-btn', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', 'Address plus one');
      const input = el('input', 'rig-address') as HTMLInputElement;
      input.type = 'number';
      input.min = '1';
      input.max = String(UNIVERSE_SIZE);
      input.value = String(f.address);
      input.setAttribute('aria-label', `Address of Fixture ${f.number}`);
      minus.addEventListener('click', () => this.run(setAddress(f.id, f.address - 1)));
      plus.addEventListener('click', () => this.run(setAddress(f.id, f.address + 1)));
      input.addEventListener('change', () => {
        const a = Number(input.value);
        this.run(setAddress(f.id, Number.isInteger(a) ? a : f.address));
        input.value = String(fixtureById(this.store.state, f.id)?.address ?? f.address);
      });
      patch.append(el('span', 'rig-patch-label', 'Patch address'), minus, input, plus);
      box.append(patch);
    }
  }

  /** Builds the faders of the current universe and page. */
  private renderFaders(): void {
    if (!this.root) return;
    const n = this.store.displayState.universes.length || this.setup.universes;
    this.tabs.replaceChildren(
      ...Array.from({ length: n }, (_, i) => {
        const b = el('button', `rig-tab${i + 1 === this.universe ? ' is-on' : ''}`, `Universe ${i + 1}`);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(i + 1 === this.universe));
        b.addEventListener('click', () => {
          this.universe = i + 1;
          this.renderFaders();
        });
        return b;
      }),
    );
    this.pageLabel.textContent = `${this.pageStart}–${Math.min(UNIVERSE_SIZE, this.pageStart + PAGE - 1)}`;
    const strips: HTMLElement[] = [];
    for (let ch = this.pageStart; ch < this.pageStart + PAGE && ch <= UNIVERSE_SIZE; ch++) {
      const strip = el('div', 'rig-fader');
      strip.dataset.ch = String(ch);
      const value = el('input', 'rig-value') as HTMLInputElement;
      value.type = 'number';
      value.min = '0';
      value.max = String(DMX_MAX);
      value.setAttribute('aria-label', `Channel ${ch} value`);
      const range = el('input', 'rig-range') as HTMLInputElement;
      range.type = 'range';
      range.min = '0';
      range.max = String(DMX_MAX);
      range.setAttribute('aria-label', `Channel ${ch}`);
      const u = this.universe;
      // Dragging shows a preview; the value is committed (one undo step) on release.
      range.addEventListener('input', () => this.store.setPreview(setChannel(u, ch, Number(range.value)).apply(this.store.state)));
      range.addEventListener('change', () => this.run(setChannel(u, ch, Number(range.value))));
      value.addEventListener('change', () => this.run(setChannel(u, ch, Number(value.value) || 0)));
      const owner = el('span', 'rig-owner');
      strip.append(value, range, el('span', 'rig-ch', String(ch)), owner);
      strips.push(strip);
    }
    this.faders.replaceChildren(...strips);
    this.updateFaders();
  }

  /** Updates values and fixture tags without rebuilding (a fader may be under the pointer). */
  private updateFaders(): void {
    const s = this.store.displayState;
    const sel = this.selected ? fixtureById(s, this.selected) : undefined;
    for (const strip of this.faders.querySelectorAll<HTMLElement>('.rig-fader')) {
      const ch = Number(strip.dataset.ch);
      const v = channel(s, this.universe, ch);
      const range = strip.querySelector<HTMLInputElement>('.rig-range')!;
      const value = strip.querySelector<HTMLInputElement>('.rig-value')!;
      if (document.activeElement !== range || range.value !== String(v)) range.value = String(v);
      if (document.activeElement !== value) value.value = String(v);
      const owners = s.fixtures.filter((f) => f.universe === this.universe && ch >= f.address && ch < f.address + footprintOf(f));
      strip.querySelector('.rig-owner')!.textContent = owners.map((f) => `F${f.number}`).join(' ');
      strip.classList.toggle('is-owned', owners.length > 0);
      strip.classList.toggle('is-selected', !!sel && sel.universe === this.universe && ch >= sel.address && ch < sel.address + footprintOf(sel));
    }
  }
}

