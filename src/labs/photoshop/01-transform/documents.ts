/**
 * Practice documents of the Transform lab. Every pixel is painted by code: no
 * external images (specs/photoshop/README.md).
 */
import type { LayerContent, PsSetup } from '../../../apps/photoshop/document/state';
import { type Quad, pt } from '../../../apps/photoshop/geometry';

export const DOC_WIDTH = 1200;
export const DOC_HEIGHT = 800;

/** The billboard on the wall, seen from one side: where a poster has to go. */
export const BILLBOARD: Quad = [pt(690, 150), pt(1090, 232), pt(1090, 548), pt(690, 630)];
/** The empty picture frame on the wall (its inside). */
export const FRAME = { x: 120, y: 400, w: 330, h: 220 };

function polygon(ctx: CanvasRenderingContext2D, q: Quad): void {
  ctx.beginPath();
  ctx.moveTo(q[0].x, q[0].y);
  for (const p of q.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
}

const wall: LayerContent = {
  id: 'wall',
  width: DOC_WIDTH,
  height: DOC_HEIGHT,
  paint(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, DOC_HEIGHT);
    sky.addColorStop(0, '#39424e');
    sky.addColorStop(1, '#232830');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, DOC_WIDTH, DOC_HEIGHT);
    // Bricks.
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    for (let y = 0; y < DOC_HEIGHT - 90; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(DOC_WIDTH, y);
      for (let x = (y / 40) % 2 === 0 ? 0 : 50; x < DOC_WIDTH; x += 100) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 40);
      }
      ctx.stroke();
    }
    // Pavement.
    ctx.fillStyle = '#1a1d22';
    ctx.fillRect(0, DOC_HEIGHT - 90, DOC_WIDTH, 90);
    // Billboard: posts, then the board with its corner marks.
    ctx.fillStyle = '#14161a';
    ctx.fillRect(760, 600, 16, 120);
    ctx.fillRect(1010, 540, 14, 180);
    polygon(ctx, BILLBOARD);
    ctx.fillStyle = '#c9ccd1';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#14161a';
    ctx.stroke();
    ctx.fillStyle = '#e4572e';
    for (const p of BILLBOARD) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Picture frame.
    ctx.fillStyle = '#d9d4c7';
    ctx.fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#7a5a36';
    ctx.strokeRect(FRAME.x - 7, FRAME.y - 7, FRAME.w + 14, FRAME.h + 14);
  },
};

const poster: LayerContent = {
  id: 'poster',
  width: 400,
  height: 260,
  paint(ctx) {
    const g = ctx.createLinearGradient(0, 0, 400, 260);
    g.addColorStop(0, '#ff7a59');
    g.addColorStop(1, '#b23a7a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 400, 260);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(310, 80, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b1b3d';
    ctx.beginPath();
    ctx.moveTo(0, 260);
    ctx.lineTo(0, 190);
    ctx.lineTo(90, 130);
    ctx.lineTo(170, 185);
    ctx.lineTo(250, 120);
    ctx.lineTo(400, 210);
    ctx.lineTo(400, 260);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 54px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('FESTA', 22, 20);
    ctx.font = '600 20px Arial, sans-serif';
    ctx.fillText('MAJOR · 24 JUNY', 24, 84);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(3, 3, 394, 254);
  },
};

const sticker: LayerContent = {
  id: 'sticker',
  width: 220,
  height: 220,
  paint(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(110, 110, 108, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f80ed';
    ctx.beginPath();
    ctx.arc(110, 110, 96, 0, Math.PI * 2);
    ctx.fill();
    // Five-point star.
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 70 : 30;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(110 + r * Math.cos(a), 110 + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
  },
};

const arrow: LayerContent = {
  id: 'arrow',
  width: 240,
  height: 110,
  paint(ctx) {
    // Points to the left.
    ctx.fillStyle = '#f2c94c';
    ctx.strokeStyle = '#1a1d22';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 55);
    ctx.lineTo(90, 6);
    ctx.lineTo(90, 36);
    ctx.lineTo(234, 36);
    ctx.lineTo(234, 74);
    ctx.lineTo(90, 74);
    ctx.lineTo(90, 104);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
};

/** Free mode: the wall and three layers to transform. */
export function freeDocument(): PsSetup {
  return {
    name: 'mural.psd',
    width: DOC_WIDTH,
    height: DOC_HEIGHT,
    layers: [
      { id: 'background', name: 'Fondo', content: wall, background: true },
      { id: 'poster', name: 'Cartell', content: poster, at: pt(150, 90) },
      { id: 'arrow', name: 'Fletxa', content: arrow, at: pt(470, 640) },
      { id: 'sticker', name: 'Adhesiu', content: sticker, at: pt(500, 330) },
    ],
    active: 'poster',
  };
}
