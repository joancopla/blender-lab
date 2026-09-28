/**
 * Add Modifier menu (mesh objects): Blender's categories and entries. Only the
 * modifiers of the lab can be added; the others are shown disabled.
 * FIDELITY? Categories, entries and their order in Blender 5.2.
 */
import type { ModifierType } from '../../modifiers/types';

export interface AddModifierEntry {
  readonly label: string;
  /** The lab's modifier this entry adds; missing: outside the lab (disabled). */
  readonly type?: ModifierType;
}

export interface AddModifierCategory {
  readonly label: string;
  readonly entries: readonly AddModifierEntry[];
}

const off = (...labels: string[]): AddModifierEntry[] => labels.map((label) => ({ label }));

export const ADD_MODIFIER_MENU: readonly AddModifierCategory[] = [
  {
    label: 'Edit',
    entries: off(
      'Data Transfer',
      'Mesh Cache',
      'Mesh Sequence Cache',
      'UV Project',
      'UV Warp',
      'Vertex Weight Edit',
      'Vertex Weight Mix',
      'Vertex Weight Proximity',
    ),
  },
  {
    label: 'Generate',
    entries: [
      { label: 'Array', type: 'ARRAY' },
      { label: 'Bevel', type: 'BEVEL' },
      ...off('Boolean', 'Build', 'Decimate', 'Edge Split', 'Geometry Nodes', 'Mask'),
      { label: 'Mirror', type: 'MIRROR' },
      ...off('Multiresolution', 'Remesh', 'Screw', 'Skin'),
      { label: 'Solidify', type: 'SOLIDIFY' },
      { label: 'Subdivision Surface', type: 'SUBSURF' },
      ...off('Triangulate', 'Volume to Mesh', 'Weld', 'Wireframe'),
    ],
  },
  {
    label: 'Deform',
    entries: off(
      'Armature',
      'Cast',
      'Curve',
      'Displace',
      'Hook',
      'Laplacian Deform',
      'Lattice',
      'Mesh Deform',
      'Shrinkwrap',
      'Simple Deform',
      'Smooth',
      'Smooth Corrective',
      'Smooth Laplacian',
      'Surface Deform',
      'Warp',
      'Wave',
    ),
  },
  { label: 'Normals', entries: off('Normal Edit', 'Weighted Normal') },
  {
    label: 'Physics',
    entries: off(
      'Cloth',
      'Collision',
      'Dynamic Paint',
      'Explode',
      'Fluid',
      'Ocean',
      'Particle Instance',
      'Particle System',
      'Soft Body',
    ),
  },
];

/** Entries whose label contains the query (case-insensitive), with their category, for the search. */
export function searchModifiers(query: string): { category: string; entry: AddModifierEntry }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ADD_MODIFIER_MENU.flatMap((c) =>
    c.entries.filter((e) => e.label.toLowerCase().includes(q)).map((entry) => ({ category: c.label, entry })),
  );
}
