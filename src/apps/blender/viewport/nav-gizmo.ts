/**
 * Navigation gizmo (top right of the viewport): clickable axis balls that also
 * orbit when dragged, and the zoom / pan / camera / projection buttons below.
 * FIDELITY? Sizes, colours, button order and the "click the aligned axis again
 * for the opposite view" behaviour.
 */
import { type Quat, conjugate, rotate } from '../math/quat';
import { type Vec3, vec3 } from '../math/vec3';
import type { DisplayedView, Navigator } from './navigator';
import { THEME } from './theme';
import { type AxisView, OPPOSITE_AXIS_VIEW } from './view-state';

/** Preferences > Interface > Navigation Controls size, in px (diameter). */
const GIZMO_SIZE = 80;
const R = GIZMO_SIZE / 2;
const BALL_R = 9;
const AXIS_LEN = R - BALL_R - 2;
const DRAG_THRESHOLD = 3;

interface Ball {
  axis: 'x' | 'y' | 'z';
  positive: boolean;
  dir: Vec3;
  view: AxisView;
}

const BALLS: Ball[] = [
  { axis: 'x', positive: true, dir: vec3(1, 0, 0), view: 'right' },
  { axis: 'x', positive: false, dir: vec3(-1, 0, 0), view: 'left' },
  { axis: 'y', positive: true, dir: vec3(0, 1, 0), view: 'back' },
  { axis: 'y', positive: false, dir: vec3(0, -1, 0), view: 'front' },
  { axis: 'z', positive: true, dir: vec3(0, 0, 1), view: 'top' },
  { axis: 'z', positive: false, dir: vec3(0, 0, -1), view: 'bottom' },
];

const AXIS_COLOR = { x: THEME.axisX, y: THEME.axisY, z: THEME.axisZ };

interface ProjectedBall extends Ball {
  x: number;
  y: number;
  depth: number;
}

const SVG = {
  zoom: '<svg viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.6 9.6l4.2 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pan: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M6 2.2c.6 0 1 .4 1 1V7h.5V1.9c0-.6.4-1 1-1s1 .4 1 1V7h.5V2.7c0-.6.4-1 1-1s1 .4 1 1V8.5h.4V5.2c0-.6.4-1 1-1s1 .4 1 1V10c0 3-2 5.2-5 5.2H8.6c-1.7 0-2.8-.7-3.8-2L2.2 9.6c-.4-.5-.3-1.1.1-1.4.5-.4 1.1-.3 1.5.1L5 9.7V3.2c0-.6.4-1 1-1z"/></svg>',
  camera: '<svg viewBox="0 0 16 16"><path fill="currentColor" d="M2 5h8a1 1 0 0 1 1 1v1.2l3-1.8v5.2l-3-1.8V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/></svg>',
  perspective:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M5 3h6l4 10H1z"/><path d="M8 3v10M6.5 3L4.5 13M9.5 3l2 10M3.2 7.5h9.6"/></svg>',
  orthographic:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="2" y="2" width="12" height="12"/><path d="M6 2v12M10 2v12M2 6h12M2 10h12"/></svg>',
};

export class NavGizmo {
  readonly element: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly projectionButton: HTMLButtonElement;
  private rotation: Quat | null = null;
  private hoverInside = false;
  private hoverBall: ProjectedBall | null = null;
  private press: { x: number; y: number; ball: ProjectedBall | null; dragging: boolean; pointerId: number } | null = null;

  constructor(private readonly navigator: Navigator) {
    this.element = document.createElement('div');
    this.element.className = 'bl-navgizmo';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bl-navgizmo-axes';
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = GIZMO_SIZE * dpr;
    this.canvas.height = GIZMO_SIZE * dpr;
    this.canvas.style.width = `${GIZMO_SIZE}px`;
    this.canvas.style.height = `${GIZMO_SIZE}px`;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.element.appendChild(this.canvas);

    const buttons = document.createElement('div');
    buttons.className = 'bl-navgizmo-buttons';
    buttons.append(
      this.dragButton('zoom', 'Zoom in/out in the view', (_dx, dy) => navigator.dragZoom(dy)),
      this.dragButton('pan', 'Move the view', (dx, dy) => navigator.dragPan(dx, dy)),
      this.clickButton('camera', 'Toggle the camera view', () => navigator.apply({ type: 'toggleCamera' })),
    );
    this.projectionButton = this.clickButton(
      'perspective',
      'Switch the current view from perspective/orthographic projection',
      () => navigator.apply({ type: 'toggleProjection' }),
    );
    buttons.append(this.projectionButton);
    this.element.appendChild(buttons);

    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    this.canvas.addEventListener('pointerleave', () => {
      this.hoverInside = false;
      this.hoverBall = null;
      this.redraw();
    });
    // The gizmo is not part of the viewport's own navigation input.
    this.element.addEventListener('wheel', (e) => e.stopPropagation());
  }

  /** Called on every viewport draw. */
  update(view: DisplayedView): void {
    this.rotation = view.rotation;
    const ortho = view.projection === 'orthographic' && !view.camera;
    this.projectionButton.innerHTML = ortho ? SVG.orthographic : SVG.perspective;
    this.redraw();
  }

  private projected(): ProjectedBall[] {
    if (!this.rotation) return [];
    const toView = conjugate(this.rotation);
    return BALLS.map((b) => {
      const v = rotate(toView, b.dir);
      return { ...b, x: R + v.x * AXIS_LEN, y: R - v.y * AXIS_LEN, depth: v.z };
    }).sort((a, b) => a.depth - b.depth); // back to front
  }

  private hit(x: number, y: number): ProjectedBall | null {
    const balls = this.projected();
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i]!;
      if (Math.hypot(x - b.x, y - b.y) <= BALL_R + 1) return b;
    }
    return null;
  }

  private redraw(): void {
    const g = this.ctx;
    g.clearRect(0, 0, GIZMO_SIZE, GIZMO_SIZE);
    if (this.hoverInside || this.press) {
      g.fillStyle = 'rgba(255, 255, 255, 0.12)';
      g.beginPath();
      g.arc(R, R, R - 1, 0, Math.PI * 2);
      g.fill();
    }
    const balls = this.projected();
    for (const b of balls) {
      const color = AXIS_COLOR[b.axis];
      const hovered = this.hoverBall?.view === b.view;
      if (b.positive) {
        g.strokeStyle = color;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(R, R);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      g.beginPath();
      g.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      if (b.positive) {
        g.fillStyle = color;
        g.fill();
      } else {
        g.fillStyle = color + '55';
        g.fill();
        g.strokeStyle = color;
        g.lineWidth = 1.5;
        g.stroke();
      }
      if (hovered) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.5;
        g.stroke();
      }
      if (b.positive) {
        g.fillStyle = 'rgba(0, 0, 0, 0.85)';
        g.font = 'bold 11px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(b.axis.toUpperCase(), b.x, b.y + 0.5);
      }
    }
  }

  private local(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const p = this.local(e);
    if (Math.hypot(p.x - R, p.y - R) > R) return;
    e.stopPropagation();
    e.preventDefault();
    this.press = { x: e.clientX, y: e.clientY, ball: this.hit(p.x, p.y), dragging: false, pointerId: e.pointerId };
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent): void => {
    const p = this.local(e);
    const pr = this.press;
    if (pr && e.pointerId === pr.pointerId) {
      const dx = e.clientX - pr.x;
      const dy = e.clientY - pr.y;
      if (!pr.dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD) pr.dragging = true;
      if (pr.dragging) {
        this.navigator.dragOrbit(dx, dy);
        pr.x = e.clientX;
        pr.y = e.clientY;
      }
      return;
    }
    this.hoverInside = Math.hypot(p.x - R, p.y - R) <= R;
    const ball = this.hoverInside ? this.hit(p.x, p.y) : null;
    if (ball?.view !== this.hoverBall?.view) {
      this.hoverBall = ball;
    }
    this.canvas.style.cursor = this.hoverInside ? 'pointer' : '';
    this.redraw();
  };

  private onUp = (e: PointerEvent): void => {
    const pr = this.press;
    if (!pr || e.pointerId !== pr.pointerId) return;
    this.press = null;
    if (!pr.dragging && pr.ball) {
      const current = this.navigator.state.axisView;
      const view = current === pr.ball.view ? OPPOSITE_AXIS_VIEW[pr.ball.view] : pr.ball.view;
      this.navigator.apply({ type: 'axisView', axis: view });
    }
    this.redraw();
  };

  private clickButton(icon: keyof typeof SVG, title: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bl-navgizmo-button';
    b.title = title;
    b.innerHTML = SVG[icon];
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', onClick);
    return b;
  }

  private dragButton(icon: keyof typeof SVG, title: string, onDrag: (dx: number, dy: number) => void): HTMLButtonElement {
    const b = this.clickButton(icon, title, () => {});
    let last: { x: number; y: number; id: number } | null = null;
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      b.setPointerCapture(e.pointerId);
      b.classList.add('is-active');
    });
    b.addEventListener('pointermove', (e) => {
      if (!last || e.pointerId !== last.id) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY, id: last.id };
      if (dx || dy) onDrag(dx, dy);
    });
    const end = () => {
      last = null;
      b.classList.remove('is-active');
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    return b;
  }
}
