/**
 * Overlays > Statistics text (off by default in Blender; a lab can turn it on).
 * Object Mode: selected / total objects and scene totals (after modifiers).
 * Edit Mode: selected / total components of the meshes being edited.
 * FIDELITY? Exact labels, alignment and which totals Blender 5.2 shows.
 */
import { meshCounts } from '../mesh/mesh-data';
import { evaluatedMesh } from '../modifiers/stack';
import { selectionOf } from '../operators/edit-mode';
import { type MeshObject, type SceneState, isEditMode, meshOf } from '../scene/scene';

export type StatisticsLine = readonly [label: string, value: string];

export function statistics(s: SceneState): StatisticsLine[] {
  const meshes = s.objects.filter((o): o is MeshObject => o.type === 'mesh');
  if (isEditMode(s)) {
    const ids = new Set(s.editObjectIds);
    const editing = meshes.filter((o) => ids.has(o.id));
    let v = 0;
    let e = 0;
    let f = 0;
    let sv = 0;
    let se = 0;
    let sf = 0;
    let tris = 0;
    for (const o of editing) {
      const c = meshCounts(meshOf(o));
      const sel = selectionOf(o);
      v += c.verts;
      e += c.edges;
      f += c.faces;
      tris += c.tris;
      sv += sel.verts.length;
      se += sel.edges.length;
      sf += sel.faces.length;
    }
    return [
      ['Objects', `${editing.length} / ${s.objects.length}`],
      ['Vertices', `${sv} / ${v}`],
      ['Edges', `${se} / ${e}`],
      ['Faces', `${sf} / ${f}`],
      ['Triangles', `${tris}`],
    ];
  }
  const totals = meshes.map((o) => meshCounts(evaluatedMesh(o, s))).reduce(
    (a, c) => ({ verts: a.verts + c.verts, edges: a.edges + c.edges, faces: a.faces + c.faces, tris: a.tris + c.tris }),
    { verts: 0, edges: 0, faces: 0, tris: 0 },
  );
  return [
    ['Objects', `${s.selectedIds.length} / ${s.objects.length}`],
    ['Vertices', `${totals.verts}`],
    ['Edges', `${totals.edges}`],
    ['Faces', `${totals.faces}`],
    ['Triangles', `${totals.tris}`],
  ];
}
