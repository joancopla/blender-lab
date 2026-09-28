import { describe, expect, it } from 'vitest';
import { MODIFIER_NAMES, type ModifierType } from '../../modifiers/types';
import { ADD_MODIFIER_MENU, searchModifiers } from './add-modifier';

describe('Add Modifier menu', () => {
  it("each of the lab's modifiers can be added exactly once; the rest are disabled", () => {
    const types = ADD_MODIFIER_MENU.flatMap((c) => c.entries.flatMap((e) => (e.type ? [e.type] : [])));
    expect([...types].sort()).toEqual((Object.keys(MODIFIER_NAMES) as ModifierType[]).sort());
    expect(ADD_MODIFIER_MENU.map((c) => c.label)).toEqual(['Edit', 'Generate', 'Deform', 'Normals', 'Physics']);
  });

  it('Generate lists its entries alphabetically', () => {
    const labels = ADD_MODIFIER_MENU.find((c) => c.label === 'Generate')!.entries.map((e) => e.label);
    expect(labels).toEqual([...labels].sort());
  });

  it('search finds entries in any category, ignoring case', () => {
    expect(searchModifiers('sub').map((r) => [r.category, r.entry.label])).toEqual([['Generate', 'Subdivision Surface']]);
    expect(searchModifiers('SMOOTH').map((r) => r.entry.label)).toEqual(['Smooth', 'Smooth Corrective', 'Smooth Laplacian']);
    expect(searchModifiers('  ')).toEqual([]);
  });
});
