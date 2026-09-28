/**
 * Shape check by silhouettes: the student's mesh and a reference are drawn in
 * black and white in the Front, Right and Top views at low resolution, and
 * compared with IoU (intersection over union). Topology does not have to match.
 * Rasterised on the CPU: small, deterministic and testable (same result as an
 * off-screen render at this resolution).
 */
import { rotate } from '../math/quat';
import { type Vec3, add, mul } from '../math/vec3';
import { triangulateFace } from '../mesh/geometry';
import type { MeshData } from '../mesh/mesh-data';
import { evaluatedMesh } from '../modifiers/stack';
import { type MeshObject, type SceneState, meshOf, objectRotation } from '../scene/scene';

export type SilhouetteView = 'front' | 'right' | 'top';
export const SILHOUETTE_VIEWS: readonly SilhouetteView[] = ['front', 'right', 'top'];

export type Triangle = readonly [Vec3, Vec3, Vec3];

/** Screen coordinates of a world point in each view (x right, y up). */
const PROJECT: Record<SilhouetteView, (p: Vec3) => [number, number]> = {
  front: (p) => [p.x, p.z],
  right: (p) => [p.y, p.z],
  top: (p) => [p.x, p.y],
};

/** World-space triangles of a mesh placed like an object. */
export function worldTriangles(m: MeshData, place?: Pick<MeshObject, 'location' | 'rotationDeg' | 'scale'>): Triangle[] {
  const q = place ? objectRotation({ rotationDeg: place.rotationDeg } as MeshObject) : null;
  const w = (v: Vec3) => (place && q ? add(place.location, rotate(q, mul(v, place.scale))) : v);
  const out: Triangle[] = [];
  m.faces.forEach((_, f) => {
    for (const [a, b, c] of triangulateFace(m, f)) out.push([w(m.verts[a]!), w(m.verts[b]!), w(m.verts[c]!)]);
  });
  return out;
}

/** The object's base mesh in world space (what Edit Mode edits). */
export const objectTriangles = (o: MeshObject): Triangle[] => worldTriangles(meshOf(o), o);

/** The object as drawn: its modifiers' result, in world space. */
export const evaluatedTriangles = (o: MeshObject, scene: SceneState): Triangle[] => worldTriangles(evaluatedMesh(o, scene), o);

interface Frame {
  readonly x0: number;
  readonly y0: number;
  readonly size: number;
}

function frameFor(view: SilhouetteView, sets: readonly (readonly Triangle[])[]): Frame {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const tris of sets) {
    for (const tri of tris) {
      for (const p of tri) {
        const [x, y] = PROJECT[view](p);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, size: 1 };
  const size = Math.max(x1 - x0, y1 - y0, 1e-6) * 1.1;
  return { x0: (x0 + x1) / 2 - size / 2, y0: (y0 + y1) / 2 - size / 2, size };
}

/** Rasterises triangles into a res x res mask (row 0 at the bottom). */
export function rasterize(tris: readonly Triangle[], view: SilhouetteView, frame: Frame, res: number): Uint8Array {
  const mask = new Uint8Array(res * res);
  const px = (v: number, o: number) => ((v - o) / frame.size) * res;
  for (const tri of tris) {
    const [a, b, c] = tri.map((p) => {
      const [x, y] = PROJECT[view](p);
      return [px(x, frame.x0), px(y, frame.y0)] as const;
    }) as [readonly [number, number], readonly [number, number], readonly [number, number]];
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (Math.abs(area) < 1e-12) continue;
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(res - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(res - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        const w0 = (b[0] - a[0]) * (cy - a[1]) - (b[1] - a[1]) * (cx - a[0]);
        const w1 = (c[0] - b[0]) * (cy - b[1]) - (c[1] - b[1]) * (cx - b[0]);
        const w2 = (a[0] - c[0]) * (cy - c[1]) - (a[1] - c[1]) * (cx - c[0]);
        const inside = area > 0 ? w0 >= 0 && w1 >= 0 && w2 >= 0 : w0 <= 0 && w1 <= 0 && w2 <= 0;
        if (inside) mask[y * res + x] = 1;
      }
    }
  }
  return mask;
}

export type Zone = 'top-left' | 'top' | 'top-right' | 'left' | 'centre' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
const ZONES: readonly Zone[][] = [
  ['bottom-left', 'bottom', 'bottom-right'],
  ['left', 'centre', 'right'],
  ['top-left', 'top', 'top-right'],
];

export interface ViewComparison {
  readonly view: SilhouetteView;
  readonly iou: number;
  /** Where the silhouettes differ most (3 x 3 grid). */
  readonly zone: Zone | null;
  /** In that zone: the student's shape has too much ('extra') or too little ('missing'). */
  readonly kind: 'extra' | 'missing' | null;
}

export const SILHOUETTE_RES = 64;

export function compareSilhouettes(
  student: readonly Triangle[],
  reference: readonly Triangle[],
  res = SILHOUETTE_RES,
): ViewComparison[] {
  return SILHOUETTE_VIEWS.map((view) => {
    const frame = frameFor(view, [student, reference]);
    const s = rasterize(student, view, frame, res);
    const r = rasterize(reference, view, frame, res);
    let inter = 0;
    let union = 0;
    const extra = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const missing = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < s.length; i++) {
      if (s[i] && r[i]) inter++;
      if (s[i] || r[i]) union++;
      if (s[i] !== r[i]) {
        const x = i % res;
        const y = Math.floor(i / res);
        const cell = Math.min(2, Math.floor((y / res) * 3)) * 3 + Math.min(2, Math.floor((x / res) * 3));
        if (s[i]) extra[cell]!++;
        else missing[cell]!++;
      }
    }
    const iou = union === 0 ? 1 : inter / union;
    let best = -1;
    let bestCount = 0;
    for (let c = 0; c < 9; c++) {
      const n = extra[c]! + missing[c]!;
      if (n > bestCount) {
        bestCount = n;
        best = c;
      }
    }
    const zone = best < 0 ? null : ZONES[Math.floor(best / 3)]![best % 3]!;
    const kind = best < 0 ? null : extra[best]! >= missing[best]! ? 'extra' : 'missing';
    return { view, iou, zone, kind };
  });
}
