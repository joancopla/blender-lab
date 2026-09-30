/**
 * The labs the site publishes, grouped by program and in their real order.
 * The index lists them; each lab page uses it to point to the next lab.
 */
import type { LabDefinition } from '../core/lab';
import type { LabPageOptions } from '../core/shell/lab-page';
import { lab01 } from '../labs/blender/01-viewport';
import { lab02 } from '../labs/blender/02-edit-mode';
import { lab03 } from '../labs/blender/03-modifiers';
import { lab04 } from '../labs/blender/04-lights';

export interface CatalogEntry {
  readonly lab: LabDefinition;
  /** Page path from the site root, e.g. "labs/01-viewport/". */
  readonly path: string;
}

export interface Shortcut {
  /** i18n key of what it does. */
  readonly labelKey: string;
  /** Key ids (keys.<id>). */
  readonly keys: readonly string[];
}

export interface ProgramGroup {
  /** i18n key of the program name. */
  readonly nameKey: string;
  readonly labs: readonly CatalogEntry[];
  /** Real shortcuts taught in the labs, for the index strip. */
  readonly shortcuts: readonly Shortcut[];
}

export const PROGRAMS: readonly ProgramGroup[] = [
  {
    nameKey: 'app.name',
    labs: [
      { lab: lab01, path: 'labs/01-viewport/' },
      { lab: lab02, path: 'labs/02-edit-mode/' },
      { lab: lab03, path: 'labs/03-modifiers/' },
      { lab: lab04, path: 'labs/04-lights/' },
    ],
    shortcuts: [
      { labelKey: 'shortcuts.grab', keys: ['g'] },
      { labelKey: 'shortcuts.rotate', keys: ['r'] },
      { labelKey: 'shortcuts.scale', keys: ['s'] },
      { labelKey: 'shortcuts.axis', keys: ['g', 'x'] },
      { labelKey: 'shortcuts.views', keys: ['numpad1', 'numpad3', 'numpad7'] },
      { labelKey: 'shortcuts.editMode', keys: ['tab'] },
      { labelKey: 'shortcuts.extrude', keys: ['e'] },
      { labelKey: 'shortcuts.undo', keys: ['ctrlZ'] },
    ],
  },
];

/** Where a lab page sits in the catalog: its program and the lab after it. */
export function labPageOptions(lab: LabDefinition): LabPageOptions {
  const group = PROGRAMS.find((g) => g.labs.some((e) => e.lab.id === lab.id));
  if (!group) return {};
  const i = group.labs.findIndex((e) => e.lab.id === lab.id);
  const next = group.labs[i + 1];
  // Lab pages live two folders below the root.
  return {
    programKey: group.nameKey,
    indexHref: '../../',
    next: next ? { lab: next.lab, href: `../../${next.path}` } : undefined,
  };
}

