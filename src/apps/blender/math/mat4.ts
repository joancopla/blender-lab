/**
 * Immutable 4x4 affine matrices, row-major (m[row * 4 + col]), acting on column
 * vectors: p' = M p. Blender space. Used where rotation + non-uniform scale
 * must be inverted as a whole (e.g. the Mirror modifier's Mirror Object).
 */
import { type Quat, rotate } from './quat';
import { type Vec3, vec3 } from './vec3';

export type Mat4 = readonly number[];

export const IDENTITY4: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Object matrix: translation * rotation * scale (Blender's object_to_world). */
export function fromTRS(t: Vec3, r: Quat, s: Vec3): Mat4 {
  const cx = rotate(r, vec3(s.x, 0, 0));
  const cy = rotate(r, vec3(0, s.y, 0));
  const cz = rotate(r, vec3(0, 0, s.z));
  return [cx.x, cy.x, cz.x, t.x, cx.y, cy.y, cz.y, t.y, cx.z, cy.z, cz.z, t.z, 0, 0, 0, 1];
}

/** Scale matrix (e.g. a reflection with -1 on one axis). */
export const scaling = (s: Vec3): Mat4 => [s.x, 0, 0, 0, 0, s.y, 0, 0, 0, 0, s.z, 0, 0, 0, 0, 1];

/** a * b (b applied first). */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[r * 4 + k]! * b[k * 4 + c]!;
      out[r * 4 + c] = sum;
    }
  }
  return out;
}

/** General inverse (Gauss-Jordan). Returns the identity for singular matrices. */
export function invert(m: Mat4): Mat4 {
  const a = [...m];
  const inv = [...IDENTITY4];
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    for (let r = col + 1; r < 4; r++) if (Math.abs(a[r * 4 + col]!) > Math.abs(a[pivot * 4 + col]!)) pivot = r;
    if (Math.abs(a[pivot * 4 + col]!) < 1e-12) return IDENTITY4;
    if (pivot !== col) {
      for (let c = 0; c < 4; c++) {
        [a[col * 4 + c], a[pivot * 4 + c]] = [a[pivot * 4 + c]!, a[col * 4 + c]!];
        [inv[col * 4 + c], inv[pivot * 4 + c]] = [inv[pivot * 4 + c]!, inv[col * 4 + c]!];
      }
    }
    const p = a[col * 4 + col]!;
    for (let c = 0; c < 4; c++) {
      a[col * 4 + c] = a[col * 4 + c]! / p;
      inv[col * 4 + c] = inv[col * 4 + c]! / p;
    }
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const f = a[r * 4 + col]!;
      if (f === 0) continue;
      for (let c = 0; c < 4; c++) {
        a[r * 4 + c] = a[r * 4 + c]! - f * a[col * 4 + c]!;
        inv[r * 4 + c] = inv[r * 4 + c]! - f * inv[col * 4 + c]!;
      }
    }
  }
  return inv;
}

export function transformPoint(m: Mat4, p: Vec3): Vec3 {
  return vec3(
    m[0]! * p.x + m[1]! * p.y + m[2]! * p.z + m[3]!,
    m[4]! * p.x + m[5]! * p.y + m[6]! * p.z + m[7]!,
    m[8]! * p.x + m[9]! * p.y + m[10]! * p.z + m[11]!,
  );
}

/** Column `axis` (0..2) of the linear part: where the local axis points. */
export const axisColumn = (m: Mat4, axis: 0 | 1 | 2): Vec3 => vec3(m[axis]!, m[4 + axis]!, m[8 + axis]!);

export const translationOf = (m: Mat4): Vec3 => vec3(m[3]!, m[7]!, m[11]!);
