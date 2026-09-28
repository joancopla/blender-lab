/**
 * The studio HDRI of Material Preview, generated in code (no image file): a
 * big softbox in front, a strip light behind and a dark room. Equirectangular
 * in three.js's convention (Y up): u = atan2(z, x) / 2π + 0.5, v = asin(y) / π + 0.5.
 *
 * Adaptat de cifog-lab (xavikai), labs/lighting/light.js (hdriRadiance 'studio').
 * FIDELITY? Blender's default Material Preview HDRI is another image (a
 * photographed environment); this one keeps the same idea: a lit studio.
 */

const box = (az: number, el: number, ca: number, ce: number, wa: number, we: number) =>
  Math.abs(az - ca) < wa && Math.abs(el - ce) < we;
const rad = (d: number) => (d * Math.PI) / 180;

/** Linear RGB radiance of the studio in a direction (three.js space, Y up). */
export function studioRadiance(x: number, y: number, z: number): [number, number, number] {
  const az = Math.atan2(x, z);
  const el = Math.asin(Math.max(-1, Math.min(1, y)));
  if (box(az, el, 0, rad(20), rad(22), rad(18))) return [9, 9, 8.6]; // big softbox
  if (box(az, el, Math.PI * 0.75, rad(15), rad(6), rad(25))) return [2.2, 2.3, 2.5]; // strip light behind
  return el < 0 ? [0.03, 0.03, 0.03] : [0.05, 0.05, 0.055];
}

/** RGBA float pixels of the equirectangular studio image (row 0 at the bottom). */
export function studioPixels(width = 256, height = 128): Float32Array {
  const px = new Float32Array(width * height * 4);
  for (let j = 0; j < height; j++) {
    const th = ((j + 0.5) / height - 0.5) * Math.PI;
    for (let i = 0; i < width; i++) {
      const phi = ((i + 0.5) / width - 0.5) * 2 * Math.PI;
      const [r, g, b] = studioRadiance(Math.cos(th) * Math.cos(phi), Math.sin(th), Math.cos(th) * Math.sin(phi));
      const k = (j * width + i) * 4;
      px[k] = r;
      px[k + 1] = g;
      px[k + 2] = b;
      px[k + 3] = 1;
    }
  }
  return px;
}
