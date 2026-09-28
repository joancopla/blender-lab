import { describe, expect, it } from 'vitest';
import { PROPERTIES_TABS, type PropertiesTabId, resolveActiveTab, tabsFor } from './tabs';
import { TAB_ICONS } from './icons';
import { viewsFor } from './views';

const ids = (type: Parameters<typeof tabsFor>[0]) => tabsFor(type).map((t) => t.id);

describe('Properties Editor tabs', () => {
  it('a mesh shows every tab, in Blender order', () => {
    expect(ids('mesh')).toEqual([
      'tool', 'render', 'output', 'viewLayer', 'scene', 'world', 'collection',
      'object', 'modifiers', 'particles', 'physics', 'constraints', 'data', 'material',
      'texture',
    ]);
  });

  it('lights and cameras have no Modifiers, Particles or Material tab; no object shows only scene tabs', () => {
    for (const type of ['light', 'camera'] as const) {
      expect(ids(type)).not.toContain('modifiers');
      expect(ids(type)).not.toContain('material');
      expect(ids(type)).toContain('data');
    }
    expect(ids(null)).toEqual(['tool', 'render', 'output', 'viewLayer', 'scene', 'world', 'collection', 'texture']);
  });

  it('every tab has an icon', () => {
    for (const t of PROPERTIES_TABS) expect(TAB_ICONS[t.id]).toContain('<svg');
  });

  it('the active tab stays while it is shown and enabled, else the first enabled one', () => {
    const enabled = new Set<PropertiesTabId>(['modifiers', 'data']);
    expect(resolveActiveTab(null, tabsFor('mesh'), enabled)).toBe('modifiers');
    expect(resolveActiveTab('data', tabsFor('mesh'), enabled)).toBe('data');
    // A light has no Modifiers tab: its Data tab is shown instead.
    expect(resolveActiveTab('modifiers', tabsFor('light'), enabled)).toBe('data');
    expect(resolveActiveTab('modifiers', tabsFor(null), enabled)).toBeNull();
    expect(resolveActiveTab(null, tabsFor('mesh'), new Set())).toBeNull();
  });

  it('a lab only gets the tabs the replica implements', () => {
    expect(Object.keys(viewsFor(['modifiers', 'data', 'material']))).toEqual(['modifiers', 'data']);
    expect(viewsFor([])).toEqual({});
  });
});
