/**
 * The labs the site publishes, grouped by program and in their real order.
 * The index lists them; each lab page uses it to point to the next lab.
 */
import type { LabDefinition } from '../core/lab';
import type { LabPageOptions } from '../core/shell/lab-page';
import type { Blueprint } from '../core/shell/blueprint';
import { STOOL_BLUEPRINT } from '../labs/blender/blueprint';
import { PLOT_BLUEPRINT } from '../labs/grandma3/blueprint';
import { lab01 } from '../labs/blender/01-viewport';
import { lab02 } from '../labs/blender/02-edit-mode';
import { lab03 } from '../labs/blender/03-modifiers';
import { lab04 } from '../labs/blender/04-lights';
import { lab05 } from '../labs/blender/05-materials';
import { ma3Lab01 } from '../labs/grandma3/01-dmx';
import { ma3Lab02 } from '../labs/grandma3/02-addresses';
import { ma3Lab03 } from '../labs/grandma3/03-command-line';

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
  /** Tab id in the index address (?p=<id>); never change it once published. */
  readonly id: string;
  /** i18n key of the program name. */
  readonly nameKey: string;
  /** The program's final challenge, drawn in the index hero. */
  readonly blueprint: Blueprint;
  /** i18n keys of the small label over the name ("{n} labs") and of the sentence next to it. */
  readonly eyebrowKey: string;
  readonly leadKey: string;
  /** i18n key of the "In the real program" title on its lab pages. */
  readonly realTitleKey?: string;
  /** Small-screen notice on its lab pages (default: the keyboard-and-mouse one). */
  readonly deviceWarning?: { readonly titleKey: string; readonly textKey: string };
  readonly labs: readonly CatalogEntry[];
  /** Title and sentence of the shortcuts strip (default: the keyboard ones). */
  readonly shortcutsTitleKey?: string;
  readonly shortcutsLeadKey?: string;
  /** Real shortcuts taught in the labs, for the index strip (none: no strip). */
  readonly shortcuts: readonly Shortcut[];
}

export const PROGRAMS: readonly ProgramGroup[] = [
  {
    id: 'blender',
    nameKey: 'app.name',
    blueprint: STOOL_BLUEPRINT,
    eyebrowKey: 'site.programEyebrow',
    leadKey: 'site.programLead',
    labs: [
      { lab: lab01, path: 'labs/01-viewport/' },
      { lab: lab02, path: 'labs/02-edit-mode/' },
      { lab: lab03, path: 'labs/03-modifiers/' },
      { lab: lab04, path: 'labs/04-lights/' },
      { lab: lab05, path: 'labs/05-materials/' },
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
    id: 'grandma3',
    nameKey: 'ma3.name',
    blueprint: PLOT_BLUEPRINT,
    eyebrowKey: 'ma3.eyebrow',
    leadKey: 'ma3.lead',
    realTitleKey: 'ma3.realTitle',
    deviceWarning: { titleKey: 'ma3.mobileTitle', textKey: 'ma3.mobileText' },
    labs: [
      { lab: ma3Lab01, path: 'labs/ma3-01-dmx/' },
      { lab: ma3Lab02, path: 'labs/ma3-02-addresses/' },
      { lab: ma3Lab03, path: 'labs/ma3-03-command-line/' },
    ],
    shortcutsTitleKey: 'ma3.shortcutsTitle',
    shortcutsLeadKey: 'ma3.shortcutsLead',
    shortcuts: [
      { labelKey: 'ma3.shortcuts.select', keys: ['ma3Please'] },
      { labelKey: 'ma3.shortcuts.range', keys: ['ma3Thru'] },
      { labelKey: 'ma3.shortcuts.addRemove', keys: ['ma3Plus', 'ma3Minus'] },
      { labelKey: 'ma3.shortcuts.value', keys: ['ma3At'] },
      { labelKey: 'ma3.shortcuts.normal', keys: ['ma3At', 'ma3At'] },
      { labelKey: 'ma3.shortcuts.clear', keys: ['ma3Clear'] },
    ],
  },
];

/** Where a lab page sits in the catalog: its program and the lab after it. */
export function labPageOptions(lab: LabDefinition): LabPageOptions {
  const group = PROGRAMS.find((g) => g.labs.some((e) => e.lab.id === lab.id));
  if (!group) return {};
  const i = group.labs.findIndex((e) => e.lab.id === lab.id);
  const next = group.labs[i + 1];
  // Lab pages live two folders below the root; the index opens on their program's tab.
  return {
    programKey: group.nameKey,
    indexHref: group === PROGRAMS[0] ? '../../' : `../../?p=${group.id}`,
    realTitleKey: group.realTitleKey,
    deviceWarning: group.deviceWarning,
    next: next ? { lab: next.lab, href: `../../${next.path}` } : undefined,
  };
}

