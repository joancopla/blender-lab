/**
 * The blueprint of the final challenge (DESIGN.md): an object in three views
 * (front, side, top). Every line belongs to a stage of a lab; lines of stages
 * already passed are drawn in the accent colour, pending ones faint and dashed.
 * The drawing itself is data provided by the labs; this module only decides
 * which lines are earned and draws them as SVG.
 */

export type BlueprintView = 'front' | 'side' | 'top';
export const BLUEPRINT_VIEWS: readonly BlueprintView[] = ['front', 'side', 'top'];

/**
 * - visible: an outline you can see from that view;
 * - hidden: an edge behind something (always dashed, as in technical drawing);
 * - axis: centre line (dash-dot);
 * - dimension: a measurement line with its value.
 */
export type BlueprintLineKind = 'visible' | 'hidden' | 'axis' | 'dimension';

export interface BlueprintLine {
  readonly id: string;
  readonly view: BlueprintView;
  /** SVG path data in the view's viewBox units (y grows downwards). */
  readonly d: string;
  readonly kind: BlueprintLineKind;
  /** Text of a dimension, drawn at (x, y). */
  readonly label?: { readonly x: number; readonly y: number; readonly text: string };
  /** The stage that earns this line. */
  readonly lab: string;
  readonly stage: string;
}

export interface Blueprint {
  /** SVG viewBox of each view. */
  readonly viewBox: Readonly<Record<BlueprintView, string>>;
  readonly lines: readonly BlueprintLine[];
}

export type IsCompleted = (labId: string, stageId: string) => boolean;

/** Ids of the lines already earned. */
export function earnedLineIds(blueprint: Blueprint, isCompleted: IsCompleted): Set<string> {
  return new Set(blueprint.lines.filter((l) => isCompleted(l.lab, l.stage)).map((l) => l.id));
}

/** Lines earned now that were not earned before (to animate them). */
export function newlyEarned(before: ReadonlySet<string>, after: ReadonlySet<string>): string[] {
  return [...after].filter((id) => !before.has(id));
}

/** Share of the blueprint already drawn, 0..1. */
export function blueprintProgress(blueprint: Blueprint, earned: ReadonlySet<string>): number {
  return blueprint.lines.length === 0 ? 0 : earned.size / blueprint.lines.length;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Draws one view. Lines carry data-line and data-lab for later updates. */
export function renderBlueprintView(blueprint: Blueprint, view: BlueprintView, earned: ReadonlySet<string>): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', blueprint.viewBox[view]);
  svg.setAttribute('class', 'bp-svg');
  svg.setAttribute('aria-hidden', 'true');
  for (const line of blueprint.lines) {
    if (line.view !== view) continue;
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `bp-line bp-${line.kind}`);
    g.dataset.line = line.id;
    g.dataset.lab = line.lab;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', line.d);
    g.append(path);
    if (line.label) {
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', String(line.label.x));
      text.setAttribute('y', String(line.label.y));
      text.textContent = line.label.text;
      g.append(text);
    }
    svg.append(g);
  }
  updateBlueprint(svg, earned);
  return svg;
}

/** Same duration as the bp-draw animation in shell.css. */
const DRAW_MS = 800;

const prefersReducedMotion =() => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Marks earned lines; `animate` lines draw themselves (once, under a second). */
export function updateBlueprint(root: Element, earned: ReadonlySet<string>, animate: readonly string[] = []): void {
  for (const g of root.querySelectorAll<SVGGElement>('.bp-line')) {
    const id = g.dataset.line!;
    g.classList.toggle('is-earned', earned.has(id));
    if (!animate.includes(id) || prefersReducedMotion()) continue;
    const path = g.querySelector('path')!;
    // pathLength=1 makes the dash trick independent of the line's length; it is
    // removed afterwards so hidden lines get their own dashes back.
    path.setAttribute('pathLength', '1');
    g.classList.add('is-drawing');
    const done = () => {
      g.classList.remove('is-drawing');
      path.removeAttribute('pathLength');
    };
    path.addEventListener('animationend', done, { once: true });
    // Background tabs may never run the animation: finish anyway.
    window.setTimeout(done, DRAW_MS + 400);
  }
}

/** Emphasises one lab's lines (null: none). */
export function highlightLab(root: Element, labId: string | null): void {
  root.classList.toggle('bp-has-highlight', labId !== null);
  for (const g of root.querySelectorAll<SVGGElement>('.bp-line')) {
    g.classList.toggle('is-highlight', labId !== null && g.dataset.lab === labId);
  }
}
