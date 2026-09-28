/**
 * Content of the Properties Editor tabs the Blender replica implements. A lab
 * enables some of them (MountOptions.propertiesTabs); the rest stay inactive.
 */
import { dataTab } from './data-tab';
import { modifiersTab } from './modifiers-tab';
import type { TabViewFactory } from './properties-editor';
import type { PropertiesTabId } from './tabs';
import { worldTab } from './world-tab';

/** FIDELITY? Context paths: the object for Modifiers; object and mesh data for Data. */
export const TAB_VIEWS: Partial<Record<PropertiesTabId, TabViewFactory>> = {
  modifiers: modifiersTab,
  data: dataTab,
  world: worldTab,
};

/** The views for the tabs a lab enables (tabs the replica does not implement are left out). */
export function viewsFor(tabs: readonly PropertiesTabId[]): Partial<Record<PropertiesTabId, TabViewFactory>> {
  return Object.fromEntries(tabs.filter((id) => TAB_VIEWS[id]).map((id) => [id, TAB_VIEWS[id]!]));
}
