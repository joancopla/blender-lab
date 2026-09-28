/**
 * Properties Editor tabs, in Blender's order, and which ones the active object
 * shows. Each lab enables only the tabs it needs; the others are shown but
 * inactive.
 * FIDELITY? Tab order and the tabs each object type shows in Blender 5.2.
 */
export type PropertiesTabId =
  | 'tool'
  | 'render'
  | 'output'
  | 'viewLayer'
  | 'scene'
  | 'world'
  | 'collection'
  | 'object'
  | 'modifiers'
  | 'particles'
  | 'physics'
  | 'constraints'
  | 'data'
  | 'material'
  | 'texture';

export interface PropertiesTab {
  readonly id: PropertiesTabId;
  /** Tooltip, as in Blender. FIDELITY? */
  readonly label: string;
  /** Tabs are drawn in groups with a gap between them. */
  readonly group: number;
}

export const PROPERTIES_TABS: readonly PropertiesTab[] = [
  { id: 'tool', label: 'Tool', group: 0 },
  { id: 'render', label: 'Render', group: 1 },
  { id: 'output', label: 'Output', group: 1 },
  { id: 'viewLayer', label: 'View Layer', group: 1 },
  { id: 'scene', label: 'Scene', group: 1 },
  { id: 'world', label: 'World', group: 1 },
  { id: 'collection', label: 'Collection', group: 1 },
  { id: 'object', label: 'Object', group: 2 },
  { id: 'modifiers', label: 'Modifiers', group: 2 },
  { id: 'particles', label: 'Particles', group: 2 },
  { id: 'physics', label: 'Physics', group: 2 },
  { id: 'constraints', label: 'Object Constraints', group: 2 },
  { id: 'data', label: 'Data', group: 2 },
  { id: 'material', label: 'Material', group: 2 },
  { id: 'texture', label: 'Texture', group: 3 },
];

const SCENE_TABS: readonly PropertiesTabId[] = ['tool', 'render', 'output', 'viewLayer', 'scene', 'world', 'collection'];
const OBJECT_TABS: Record<'mesh' | 'camera' | 'light', readonly PropertiesTabId[]> = {
  mesh: ['object', 'modifiers', 'particles', 'physics', 'constraints', 'data', 'material'],
  camera: ['object', 'physics', 'constraints', 'data'],
  light: ['object', 'physics', 'constraints', 'data'],
};

/** Tabs shown for the active object's type (null: no active object). */
export function tabsFor(type: 'mesh' | 'camera' | 'light' | null): PropertiesTab[] {
  const ids = new Set<PropertiesTabId>([...SCENE_TABS, ...(type ? OBJECT_TABS[type] : []), 'texture']);
  return PROPERTIES_TABS.filter((t) => ids.has(t.id));
}

/**
 * The tab to show: the current one if it is still shown and enabled, else the
 * first enabled one shown (null when the lab enables none of them).
 */
export function resolveActiveTab(
  current: PropertiesTabId | null,
  shown: readonly PropertiesTab[],
  enabled: ReadonlySet<PropertiesTabId>,
): PropertiesTabId | null {
  const usable = shown.filter((t) => enabled.has(t.id));
  if (current && usable.some((t) => t.id === current)) return current;
  return usable[0]?.id ?? null;
}
