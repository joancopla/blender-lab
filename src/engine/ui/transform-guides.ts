/**
 * Guides drawn while a modal transform runs: the constraint axis lines in the
 * axis colour and the dashed line from the pivot to the mouse (Rotate, Resize).
 * FIDELITY? Line widths, dash pattern and colours.
 */
import type { Guides } from '../operators/transform';
import type { ViewportSize } from '../viewport/projection';
import { type ViewProjection, projectSegment } from '../viewport/screen';
import { THEME } from '../viewport/theme';

const SVG_NS = 'http://www.w3.org/2000/svg';
const AXIS_COLORS = [THEME.axisX, THEME.axisY, THEME.axisZ] as const;

export class TransformGuides {
  private readonly svg: SVGSVGElement;

  constructor(viewport: HTMLElement) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.classList.add('bl-transform-guides');
    viewport.append(this.svg);
  }

  update(guides: Guides | null, vp: ViewProjection | null, size: ViewportSize): void {
    this.svg.replaceChildren();
    if (!guides || !vp) return;
    this.svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
    for (const line of guides.lines) {
      const seg = projectSegment(vp, size, line.a, line.b);
      if (!seg) continue;
      this.svg.append(this.line(seg.a, seg.b, AXIS_COLORS[line.axis], ''));
    }
    if (guides.dashed) {
      const { from, to } = guides.dashed;
      this.svg.append(this.line(from, to, '#000000', '4 4'), this.line(from, to, '#ffffff', '4 4', 4));
    }
  }

  private line(
    a: { x: number; y: number },
    b: { x: number; y: number },
    color: string,
    dash: string,
    dashOffset = 0,
  ): SVGLineElement {
    const l = document.createElementNS(SVG_NS, 'line');
    l.setAttribute('x1', String(a.x));
    l.setAttribute('y1', String(a.y));
    l.setAttribute('x2', String(b.x));
    l.setAttribute('y2', String(b.y));
    l.setAttribute('stroke', color);
    l.setAttribute('stroke-width', '1');
    if (dash) {
      l.setAttribute('stroke-dasharray', dash);
      l.setAttribute('stroke-dashoffset', String(dashOffset));
    }
    return l;
  }
}
