/**
 * Edit Mode picking: which vertex, edge or face is under the cursor, and which
 * ones are inside a box. Without X-ray only visible elements count (hidden by
 * the meshes in Edit Mode); with X-ray everything counts.
 * FIDELITY? Pick radii, the priority between element kinds when several select
 * modes are on, and whether other (non-edit) objects also hide elements.
 */
import type { ComponentHit } from '../operators/edit-mode';
import type { ComponentKind } from '../edit/selection';
import { triangulateFace, faceCenter } from '../mesh/geometry';
import { rotate } from '../math/quat';
import { type Vec3, add, length, mul, normalize, scale, sub, vec3 } from '../math/vec3';
import { type MeshObject, type SceneState, type SelectMode, meshOf, objectRotation } from '../scene/scene';
import { rayTriangle } from './picking';
import type { ViewportSize } from './projection';
import { type ViewProjection, screenRay, worldToScreen } from './screen';

/** Pick radius around vertices and edges, in px. */
export const VERT_PICK_RADIUS_PX = 20;
export const EDGE_PICK_RADIUS_PX = 12;

interface EditObjectWorld {
  readonly object: MeshObject;
  /** World positions of the vertices. */
  readonly verts: readonly Vec3[];
}

/** World-space triangles of every mesh in Edit Mode (the occluders). */
interface Occluders {
  readonly tris: readonly [Vec3, Vec3, Vec3][];
}

function editObjects(scene: SceneState): EditObjectWorld[] {
  const ids = new Set(scene.editObjectIds ?? []);
  return scene.objects
    .filter((o): o is MeshObject => o.type === 'mesh' && ids.has(o.id))
    .map((o) => {
      const q = objectRotation(o);
      return { object: o, verts: meshOf(o).verts.map((v) => add(o.location, rotate(q, mul(v, o.scale)))) };
    });
}

function occluders(objs: readonly EditObjectWorld[]): Occluders {
  const tris: [Vec3, Vec3, Vec3][] = [];
  for (const { object, verts } of objs) {
    const m = meshOf(object);
    m.faces.forEach((_, f) => {
      for (const [a, b, c] of triangulateFace(m, f)) tris.push([verts[a]!, verts[b]!, verts[c]!]);
    });
  }
  return { tris };
}

/** Is a world point visible from the view (not behind any edit-mesh face)? */
function visible(p: Vec3, vp: ViewProjection, occ: Occluders): boolean {
  const forward = rotate(vp.rotation, vec3(0, 0, -1));
  let origin: Vec3;
  let dir: Vec3;
  let tP: number;
  if (vp.orthographic) {
    tP = 10_000;
    dir = forward;
    origin = sub(p, scale(forward, tP));
  } else {
    const d = sub(p, vp.eye);
    tP = length(d);
    dir = normalize(d);
    origin = vp.eye;
  }
  const eps = Math.max(1e-6, tP * 1e-5);
  for (const [a, b, c] of occ.tris) {
    const t = rayTriangle(origin, dir, a, b, c);
    if (t !== null && t < tP - eps) return false;
  }
  return true;
}

function segmentDistance(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2)) : 0;
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

const midpoint = (a: Vec3, b: Vec3) => scale(add(a, b), 0.5);

export interface PickContext {
  readonly scene: SceneState;
  readonly projection: ViewProjection;
  readonly size: ViewportSize;
  readonly xray: boolean;
}

function prepare(ctx: PickContext) {
  const objs = editObjects(ctx.scene);
  const occ: Occluders = ctx.xray ? { tris: [] } : occluders(objs);
  const isVisible = (p: Vec3) => ctx.xray || visible(p, ctx.projection, occ);
  return { objs, isVisible };
}

/** Nearest visible vertex within the pick radius. */
export function pickVert(ctx: PickContext, x: number, y: number): ComponentHit | null {
  const { objs, isVisible } = prepare(ctx);
  let best: { hit: ComponentHit; d: number } | null = null;
  for (const { object, verts } of objs) {
    verts.forEach((p, i) => {
      const s = worldToScreen(ctx.projection, ctx.size, p);
      if (!s) return;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d <= VERT_PICK_RADIUS_PX && (!best || d < best.d) && isVisible(p)) {
        best = { hit: { objectId: object.id, ref: { kind: 'vert', index: i } }, d };
      }
    });
  }
  return (best as { hit: ComponentHit } | null)?.hit ?? null;
}

/** Nearest visible edge within the pick radius (also used by Alt+click in any mode). */
export function pickEdge(ctx: PickContext, x: number, y: number, radius = EDGE_PICK_RADIUS_PX): ComponentHit | null {
  const { objs, isVisible } = prepare(ctx);
  let best: { hit: ComponentHit; d: number } | null = null;
  for (const { object, verts } of objs) {
    meshOf(object).edges.forEach(([a, b], i) => {
      const sa = worldToScreen(ctx.projection, ctx.size, verts[a]!);
      const sb = worldToScreen(ctx.projection, ctx.size, verts[b]!);
      if (!sa || !sb) return;
      const d = segmentDistance(x, y, sa, sb);
      if (d <= radius && (!best || d < best.d) && isVisible(midpoint(verts[a]!, verts[b]!))) {
        best = { hit: { objectId: object.id, ref: { kind: 'edge', index: i } }, d };
      }
    });
  }
  return (best as { hit: ComponentHit } | null)?.hit ?? null;
}

/**
 * Face under the cursor: the nearest face hit by the ray (solid), or the
 * nearest face centre (X-ray, where Blender shows face dots).
 */
export function pickFace(ctx: PickContext, x: number, y: number): ComponentHit | null {
  const { objs } = prepare(ctx);
  if (ctx.xray) {
    let best: { hit: ComponentHit; d: number } | null = null;
    for (const { object, verts } of objs) {
      const m = meshOf(object);
      m.faces.forEach((f, i) => {
        let c = vec3(0, 0, 0);
        for (const v of f) c = add(c, verts[v]!);
        const s = worldToScreen(ctx.projection, ctx.size, scale(c, 1 / f.length));
        if (!s) return;
        const d = Math.hypot(s.x - x, s.y - y);
        if (d <= VERT_PICK_RADIUS_PX && (!best || d < best.d)) best = { hit: { objectId: object.id, ref: { kind: 'face', index: i } }, d };
      });
    }
    return (best as { hit: ComponentHit } | null)?.hit ?? null;
  }
  const ray = screenRay(ctx.projection, ctx.size, x, y);
  let best: { hit: ComponentHit; t: number } | null = null;
  for (const { object, verts } of objs) {
    const m = meshOf(object);
    m.faces.forEach((_, f) => {
      for (const [a, b, c] of triangulateFace(m, f)) {
        const t = rayTriangle(ray.origin, ray.direction, verts[a]!, verts[b]!, verts[c]!);
        if (t !== null && (!best || t < best.t)) best = { hit: { objectId: object.id, ref: { kind: 'face', index: f } }, t };
      }
    });
  }
  return (best as { hit: ComponentHit } | null)?.hit ?? null;
}

/**
 * Click pick for the current select mode. With several modes on, vertices win
 * over edges and edges over faces when they are within their radius.
 */
export function pickComponent(ctx: PickContext, mode: SelectMode, x: number, y: number): ComponentHit | null {
  if (mode.vert) {
    const v = pickVert(ctx, x, y);
    if (v) return v;
  }
  if (mode.edge) {
    const e = pickEdge(ctx, x, y);
    if (e) return e;
  }
  if (mode.face) return pickFace(ctx, x, y);
  return null;
}

/**
 * Base elements inside a screen rectangle, per object:
 * vertices inside; edges with both ends inside; faces with their centre inside.
 */
export function componentsInRect(
  ctx: PickContext,
  kind: ComponentKind,
  rect: { x: number; y: number; width: number; height: number },
): Map<string, number[]> {
  const { objs, isVisible } = prepare(ctx);
  const inside = (p: Vec3) => {
    const s = worldToScreen(ctx.projection, ctx.size, p);
    return !!s && s.x >= rect.x && s.x <= rect.x + rect.width && s.y >= rect.y && s.y <= rect.y + rect.height;
  };
  const out = new Map<string, number[]>();
  for (const { object, verts } of objs) {
    const m = meshOf(object);
    const found: number[] = [];
    if (kind === 'vert') {
      verts.forEach((p, i) => inside(p) && isVisible(p) && found.push(i));
    } else if (kind === 'edge') {
      m.edges.forEach(([a, b], i) => {
        if (inside(verts[a]!) && inside(verts[b]!) && isVisible(midpoint(verts[a]!, verts[b]!))) found.push(i);
      });
    } else {
      const q = objectRotation(object);
      m.faces.forEach((_, i) => {
        const c = add(object.location, rotate(q, mul(faceCenter(m, i), object.scale)));
        if (inside(c) && isVisible(c)) found.push(i);
      });
    }
    out.set(object.id, found);
  }
  return out;
}

