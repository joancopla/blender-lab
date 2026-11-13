/**
 * Draws the document: each visible layer's content warped to its four corners,
 * bottom to top, on a Canvas 2D context in document pixels.
 *
 * A parallelogram is drawn by the canvas itself (an affine transform). Any
 * other quad needs a projective warp, done here pixel by pixel with bilinear
 * sampling.
 */
import type { LayerContent, PsLayer } from '../document/state';
import { type Mat3, type Quad, isConvex, isParallelogram, quadBounds, quadToRect } from '../geometry';

interface Bitmap {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  /** Premultiplied RGBA, read on first projective use. */
  pixels: Float32Array | null;
}

export class Compositor {
  private bitmaps = new Map<string, Bitmap>();
  private scratch = document.createElement('canvas');

  /** Paints the contents a document uses (replaces the previous ones). */
  setContents(contents: readonly LayerContent[]): void {
    this.bitmaps.clear();
    for (const c of contents) {
      const canvas = document.createElement('canvas');
      canvas.width = c.width;
      canvas.height = c.height;
      const ctx = canvas.getContext('2d');
      if (ctx) c.paint(ctx);
      this.bitmaps.set(c.id, { canvas, width: c.width, height: c.height, pixels: null });
    }
  }

  /** The painted content, for thumbnails. */
  contentCanvas(id: string): HTMLCanvasElement | undefined {
    return this.bitmaps.get(id)?.canvas;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, layers: readonly (PsLayer & { readonly visible: boolean })[]): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const layer of layers) {
      const bitmap = this.bitmaps.get(layer.contentId);
      if (!layer.visible || !bitmap || layer.opacity <= 0) continue;
      ctx.globalAlpha = layer.opacity / 100;
      if (isParallelogram(layer.quad, 1e-3)) this.drawAffine(ctx, bitmap, layer.quad);
      else if (isConvex(layer.quad)) this.drawProjective(ctx, bitmap, layer.quad, width, height);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawAffine(ctx: CanvasRenderingContext2D, b: Bitmap, q: Quad): void {
    const [tl, tr, , bl] = q;
    ctx.setTransform((tr.x - tl.x) / b.width, (tr.y - tl.y) / b.width, (bl.x - tl.x) / b.height, (bl.y - tl.y) / b.height, tl.x, tl.y);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(b.canvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawProjective(ctx: CanvasRenderingContext2D, b: Bitmap, q: Quad, width: number, height: number): void {
    const bounds = quadBounds(q);
    const x0 = Math.max(0, Math.floor(bounds.x));
    const y0 = Math.max(0, Math.floor(bounds.y));
    const x1 = Math.min(width, Math.ceil(bounds.x + bounds.w));
    const y1 = Math.min(height, Math.ceil(bounds.y + bounds.h));
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const out = warp(pixelsOf(b), b.width, b.height, quadToRect(q, { x: 0, y: 0, w: b.width, h: b.height }), x0, y0, w, h);
    if (this.scratch.width !== w || this.scratch.height !== h) {
      this.scratch.width = w;
      this.scratch.height = h;
    }
    const sctx = this.scratch.getContext('2d');
    if (!sctx) return;
    sctx.putImageData(out, 0, 0);
    ctx.drawImage(this.scratch, x0, y0);
  }
}

function pixelsOf(b: Bitmap): Float32Array {
  if (b.pixels) return b.pixels;
  const data = b.canvas.getContext('2d')!.getImageData(0, 0, b.width, b.height).data;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]! / 255;
    out[i] = data[i]! * a;
    out[i + 1] = data[i + 1]! * a;
    out[i + 2] = data[i + 2]! * a;
    out[i + 3] = data[i + 3]!;
  }
  b.pixels = out;
  return out;
}

/**
 * Fills a w × h image whose top left pixel is (x0, y0) in the document: each
 * pixel centre goes through `inverse` to the content and is sampled there.
 * Samples beyond the content count as transparent, which softens the edge.
 */
function warp(src: Float32Array, sw: number, sh: number, inverse: Mat3, x0: number, y0: number, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  const d = out.data;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = inverse;
  for (let y = 0; y < h; y++) {
    const py = y0 + y + 0.5;
    for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5;
      const k = m6 * px + m7 * py + m8;
      if (k === 0) continue;
      // Content coordinates of the pixel centre, in texel-centre space.
      const u = (m0 * px + m1 * py + m2) / k - 0.5;
      const v = (m3 * px + m4 * py + m5) / k - 0.5;
      if (u <= -1 || v <= -1 || u >= sw || v >= sh) continue;
      const ix = Math.floor(u);
      const iy = Math.floor(v);
      const fx = u - ix;
      const fy = v - iy;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let j = 0; j < 2; j++) {
        const sy = iy + j;
        if (sy < 0 || sy >= sh) continue;
        const wy = j === 0 ? 1 - fy : fy;
        for (let i = 0; i < 2; i++) {
          const sx = ix + i;
          if (sx < 0 || sx >= sw) continue;
          const wgt = wy * (i === 0 ? 1 - fx : fx);
          const o = (sy * sw + sx) * 4;
          r += src[o]! * wgt;
          g += src[o + 1]! * wgt;
          b += src[o + 2]! * wgt;
          a += src[o + 3]! * wgt;
        }
      }
      if (a <= 0) continue;
      const o = (y * w + x) * 4;
      const un = 255 / a;
      d[o] = r * un;
      d[o + 1] = g * un;
      d[o + 2] = b * un;
      d[o + 3] = a;
    }
  }
  return out;
}
