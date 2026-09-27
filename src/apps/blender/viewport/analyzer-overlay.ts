/**
 * Topology analyser overlay (lab tool, lab colours): n-gons yellow, triangles
 * blue, flipped faces magenta, non-manifold edges and duplicated vertices red.
 * Built in the object's local space.
 */
import * as THREE from 'three';
import type { TopologyReport } from '../mesh/analyze';
import { triangulateFace } from '../mesh/geometry';
import type { MeshData } from '../mesh/mesh-data';

export const ANALYZER_COLORS = {
  ngon: '#ffd21f',
  triangle: '#3aa0ff',
  flipped: '#ff3ea5',
  problem: '#ff3b3b',
} as const;

function tint(m: MeshData, faces: readonly number[], color: string, opacity: number): THREE.Mesh | null {
  const pos: number[] = [];
  for (const f of faces) for (const tri of triangulateFace(m, f)) for (const v of tri) pos.push(m.verts[v]!.x, m.verts[v]!.y, m.verts[v]!.z);
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
}

export function buildAnalyzerOverlay(m: MeshData, r: TopologyReport, pixelRatio: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'AnalyzerOverlay';
  for (const [faces, color, opacity] of [
    [r.ngons, ANALYZER_COLORS.ngon, 0.45],
    [r.triangles, ANALYZER_COLORS.triangle, 0.45],
    [r.flippedFaces, ANALYZER_COLORS.flipped, 0.55],
  ] as const) {
    const t = tint(m, faces, color, opacity);
    if (t) group.add(t);
  }
  if (r.nonManifoldEdges.length) {
    const pos: number[] = [];
    for (const e of r.nonManifoldEdges) for (const v of m.edges[e]!) pos.push(m.verts[v]!.x, m.verts[v]!.y, m.verts[v]!.z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: ANALYZER_COLORS.problem, depthTest: false })));
  }
  if (r.duplicates.length) {
    const pos: number[] = [];
    for (const d of r.duplicates) pos.push(m.verts[d[0]!]!.x, m.verts[d[0]!]!.y, m.verts[d[0]!]!.z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    group.add(
      new THREE.Points(g, new THREE.PointsMaterial({ color: ANALYZER_COLORS.problem, size: 10 * pixelRatio, sizeAttenuation: false, depthTest: false })),
    );
  }
  group.traverse((o) => (o.renderOrder = 3));
  return group;
}
