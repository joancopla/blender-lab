/**
 * Content of the Properties Editor tabs the Blender replica implements. A lab
 * enables some of them (MountOptions.propertiesTabs); the rest stay inactive.
 */
import type { SceneState } from '../../scene/scene';
import { type TabView, type TabViewFactory, contextPath } from './properties-editor';
import type { PropertiesTabId } from './tabs';

/** A tab that only shows its context path for now (its panels come in later steps). */
function contextOnly(path: (s: SceneState) => string[]): TabViewFactory {
  return (body): TabView => {
    let key = '';
    return {
      update(state) {
        const parts = path(state);
        if (parts.join('\u0000') === key) return;
        key = parts.join('\u0000');
        body.replaceChildren(contextPath(parts));
      },
    };
  };
}

const activeName = (s: SceneState) => s.objects.find((o) => o.id === s.activeId)?.name ?? '';

/** FIDELITY? Context paths: the object for Modifiers; object and mesh data for Data. */
export const TAB_VIEWS: Partial<Record<PropertiesTabId, TabViewFactory>> = {
  modifiers: contextOnly((s) => [activeName(s)]),
  data: contextOnly((s) => [activeName(s), activeName(s)]),
};

/** The views for the tabs a lab enables (tabs the replica does not implement are left out). */
export function viewsFor(tabs: readonly PropertiesTabId[]): Partial<Record<PropertiesTabId, TabViewFactory>> {
  return Object.fromEntries(tabs.filter((id) => TAB_VIEWS[id]).map((id) => [id, TAB_VIEWS[id]!]));
}
