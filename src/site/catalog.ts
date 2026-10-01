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
import { ma3Lab01 } from '../labs/grandma3/01-dmx';

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
  /** i18n keys of the small label over the name ("{n} labs") and of the sentence next to it. */
  readonly eyebrowKey: string;
  readonly leadKey: string;
  /** i18n key of the "In the real program" title on its lab pages. */
  readonly realTitleKey?: string;
  /** Small-screen notice on its lab pages (default: the keyboard-and-mouse one). */
  readonly deviceWarning?: { readonly titleKey: string; readonly textKey: string };
  readonly labs: readonly CatalogEntry[];
  /** Real shortcuts taught in the labs, for the index strip (none: no strip). */
  readonly shortcuts: readonly Shortcut[];
}

export const PROGRAMS: readonly ProgramGroup[] = [
  {
    nameKey: 'app.name',
    eyebrowKey: 'site.programEyebrow',
    leadKey: 'site.programLead',
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
  {
    nameKey: 'ma3.name',
    eyebrowKey: 'ma3.eyebrow',
    leadKey: 'ma3.lead',
    realTitleKey: 'ma3.realTitle',
    deviceWarning: { titleKey: 'ma3.mobileTitle', textKey: 'ma3.mobileText' },
    labs: [{ lab: ma3Lab01, path: 'labs/ma3-01-dmx/' }],
    // The keypad shortcuts arrive with the command line lab.
    shortcuts: [],
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
    realTitleKey: group.realTitleKey,
    deviceWarning: group.deviceWarning,
    next: next ? { lab: next.lab, href: `../../${next.path}` } : undefined,
  };
}

