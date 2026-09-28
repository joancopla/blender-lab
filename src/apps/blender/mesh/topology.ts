/**
 * Adjacency for a MeshData, modelled on Blender's BMesh: every vertex knows its
 * edges (disk cycle) and every edge knows its faces (radial cycle). Unlike a
 * half-edge structure, this also represents what editing can produce: edges
 * shared by 3+ faces, loose edges and loose vertices.
 *
 * Built on demand from immutable MeshData; queries never modify it.
 */
import type { Edge, MeshData } from './mesh-data';

export class MeshTopology {
  /** Edge index by numeric key (smaller vertex * vertex count + larger): faster than string keys. */
  private readonly edgeIndex = new Map<number, number>();
  private readonly key = (a: number, b: number) => {
    const n = this.mesh.verts.length;
    return a < b ? a * n + b : b * n + a;
  };
  /** Edges around each vertex (disk cycle). */
  readonly vertEdges: readonly number[][];
  /** Faces around each vertex. */
  readonly vertFaces: readonly number[][];
  /** Faces using each edge (radial cycle). */
  readonly edgeFaces: readonly number[][];
  /** Edges of each face, in loop order. */
  readonly faceEdges: readonly number[][];

  constructor(readonly mesh: MeshData) {
    const vertEdges = mesh.verts.map((): number[] => []);
    const vertFaces = mesh.verts.map((): number[] => []);
    const edgeFaces = mesh.edges.map((): number[] => []);
    mesh.edges.forEach(([a, b], i) => {
      this.edgeIndex.set(this.key(a, b), i);
      vertEdges[a]?.push(i);
      vertEdges[b]?.push(i);
    });
    const faceEdges = mesh.faces.map((f, fi) => {
      for (const v of f) vertFaces[v]?.push(fi);
      return f.map((a, i) => {
        const e = this.edgeIndex.get(this.key(a, f[(i + 1) % f.length]!));
        if (e === undefined) return -1; // reported by validateMesh
        edgeFaces[e]!.push(fi);
        return e;
      });
    });
    this.vertEdges = vertEdges;
    this.vertFaces = vertFaces;
    this.edgeFaces = edgeFaces;
    this.faceEdges = faceEdges;
  }

  findEdge(a: number, b: number): number | undefined {
    return this.edgeIndex.get(this.key(a, b));
  }

  edgeVerts(e: number): Edge {
    return this.mesh.edges[e]!;
  }

  otherVert(e: number, v: number): number {
    const [a, b] = this.mesh.edges[e]!;
    return a === v ? b : a;
  }

  /** Vertices connected to `v` by an edge. */
  vertNeighbours(v: number): number[] {
    return this.vertEdges[v]!.map((e) => this.otherVert(e, v));
  }

  /** Faces sharing an edge with face `f`. */
  faceNeighbours(f: number): number[] {
    const out = new Set<number>();
    for (const e of this.faceEdges[f]!) for (const g of this.edgeFaces[e] ?? []) if (g !== f) out.add(g);
    return [...out];
  }

  /** Edge used by no face. */
  isWireEdge(e: number): boolean {
    return this.edgeFaces[e]!.length === 0;
  }

  /** Edge used by exactly one face. */
  isBoundaryEdge(e: number): boolean {
    return this.edgeFaces[e]!.length === 1;
  }

  /** Edge used by exactly two faces. */
  isManifoldEdge(e: number): boolean {
    return this.edgeFaces[e]!.length === 2;
  }

  /**
   * A vertex is manifold if it has faces and they form a single fan around it
   * (connected through edges shared by exactly two of those faces), and all its
   * edges are manifold or boundary.
   */
  isManifoldVert(v: number): boolean {
    const faces = this.vertFaces[v]!;
    const edges = this.vertEdges[v]!;
    if (faces.length === 0) return false;
    if (edges.some((e) => this.edgeFaces[e]!.length === 0 || this.edgeFaces[e]!.length > 2)) return false;
    // Walk the fan through the vertex's edges.
    const seen = new Set<number>([faces[0]!]);
    const stack = [faces[0]!];
    while (stack.length) {
      const f = stack.pop()!;
      for (const e of this.faceEdges[f]!) {
        const [a, b] = this.mesh.edges[e] ?? [-1, -1];
        if (a !== v && b !== v) continue;
        for (const g of this.edgeFaces[e]!) {
          if (!seen.has(g)) {
            seen.add(g);
            stack.push(g);
          }
        }
      }
    }
    return seen.size === faces.length;
  }

  /** Every edge has exactly two faces and every vertex is a single fan: a closed surface. */
  isManifold(): boolean {
    return (
      this.mesh.edges.every((_, e) => this.isManifoldEdge(e)) && this.mesh.verts.every((_, v) => this.isManifoldVert(v))
    );
  }

  /** Edges that make the mesh non-manifold (0, 1 or 3+ faces), like Select Non-Manifold. */
  nonManifoldEdges(): number[] {
    return this.mesh.edges.map((_, e) => e).filter((e) => !this.isManifoldEdge(e));
  }

  /** V - E + F. 2 for a closed surface without holes (genus 0). */
  eulerCharacteristic(): number {
    return this.mesh.verts.length - this.mesh.edges.length + this.mesh.faces.length;
  }

  /** Vertices connected to the given ones through edges (select linked, Ctrl+L). */
  linkedVerts(start: Iterable<number>): Set<number> {
    const seen = new Set<number>();
    const stack = [...start];
    for (const v of stack) seen.add(v);
    while (stack.length) {
      const v = stack.pop()!;
      for (const n of this.vertNeighbours(v)) {
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    return seen;
  }

  /**
   * Edge loop through `start`, as Alt+click selects it.
   * - Through a vertex with exactly 4 edges, the loop continues along the edge
   *   that shares no face with the current one.
   * - Along a boundary, it follows the boundary while each vertex has exactly
   *   two boundary edges.
   * Stops elsewhere (poles, n-gon corners) or when it closes.
   * FIDELITY? Blender's walker has more special cases (e.g. boundary with valence 3).
   */
  edgeLoop(start: number): number[] {
    const boundary = this.isBoundaryEdge(start);
    const next = (e: number, v: number): number | null => {
      const edges = this.vertEdges[v]!;
      if (boundary) {
        const others = edges.filter((x) => x !== e && this.isBoundaryEdge(x));
        return others.length === 1 ? others[0]! : null;
      }
      if (edges.length !== 4 || !this.isManifoldEdge(e)) return null;
      const faces = new Set(this.edgeFaces[e]);
      const candidates = edges.filter((x) => x !== e && !this.edgeFaces[x]!.some((f) => faces.has(f)));
      return candidates.length === 1 ? candidates[0]! : null;
    };
    return this.walk(start, next);
  }

  /**
   * Edge ring through `start` (Ctrl+Alt+click): across each quad to the
   * opposite edge, in both directions. Stops at non-quads or open ends.
   */
  edgeRing(start: number): number[] {
    const result = new Set<number>([start]);
    for (const firstFace of this.edgeFaces[start]!) {
      let e = start;
      let f: number | undefined = firstFace;
      while (f !== undefined) {
        const fe = this.faceEdges[f]!;
        if (fe.length !== 4) break;
        const opposite = fe[(fe.indexOf(e) + 2) % 4]!;
        if (result.has(opposite)) break;
        result.add(opposite);
        e = opposite;
        const prev: number = f;
        f = this.edgeFaces[e]!.find((g) => g !== prev);
        if (this.edgeFaces[e]!.length > 2) break;
      }
    }
    return [...result];
  }

  /** Walks from `start` in both directions with `next`, collecting edges. */
  private walk(start: number, next: (e: number, v: number) => number | null): number[] {
    const result = new Set<number>([start]);
    const [a, b] = this.mesh.edges[start]!;
    for (const firstVert of [a, b]) {
      let e = start;
      let v = firstVert;
      for (;;) {
        const n = next(e, v);
        if (n === null || result.has(n)) break;
        result.add(n);
        v = this.otherVert(n, v);
        e = n;
      }
    }
    return [...result];
  }
}
