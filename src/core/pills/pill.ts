/**
 * Pills (DESIGN.md, "Píndoles"): short step-by-step tutorials to watch and project in
 * class. Unlike a lab there are no checks and no saved progress: each step is an image
 * of the program, drawn by the program's own renderer, and a panel with the texts.
 *
 * The core knows nothing about the program: `View` is whatever the program's renderer
 * needs to draw a step (for Blender, the viewport header and grid).
 */

/**
 * One item of a key row:
 * - "E", "0.2", "Numpad ." : one key, named as in the program (English);
 * - "Ctrl+R", "Shift+Alt+@left": a combination, parts joined by "+";
 * - "@left", "@middle", "@right": a mouse button (keyOverlay.mouse.* texts);
 * - "~id": a short Catalan note, text `<step texts>.notes.<id>`.
 */
export type PillToken = string;

export interface PillStep<View> {
  /** Stable id; its texts live under `<texts>.steps.<id>`. */
  readonly id: string;
  /** Rows of keys the student presses, top to bottom. */
  readonly rows: readonly (readonly PillToken[])[];
  /** Name of the operator in the program, shown as it appears there (English). */
  readonly op?: string;
  /** URL of the step image. */
  readonly image: string;
  readonly view: View;
}

/** What the index needs of a pill (kept apart from the steps, which are heavier). */
export interface PillInfo {
  readonly id: string;
  /** i18n keys of the pill name and of its one-sentence description. */
  readonly nameKey: string;
  readonly descKey: string;
  /** i18n prefix of the step texts (`<texts>.steps.<id>.title`...). */
  readonly texts: string;
  /** URL of the image used on the index card. */
  readonly cover: string;
  readonly stepCount: number;
}

export interface PillDefinition<View> extends PillInfo {
  readonly steps: readonly PillStep<View>[];
}

/** Texts each step must have under `<texts>.steps.<id>`. */
export const STEP_TEXT_FIELDS = ['title', 'titleAccent', 'lead', 'hintStrong', 'hint', 'short'] as const;

export type TokenPart = { readonly kind: 'key'; readonly label: string } | { readonly kind: 'mouse'; readonly id: string };
export type ParsedToken = { readonly kind: 'keys'; readonly parts: readonly TokenPart[] } | { readonly kind: 'note'; readonly id: string };

function part(p: string): TokenPart {
  return p.startsWith('@') ? { kind: 'mouse', id: p.slice(1) } : { kind: 'key', label: p };
}

export function parseToken(token: PillToken): ParsedToken {
  if (token.startsWith('~')) return { kind: 'note', id: token.slice(1) };
  // A lone "+" is the key itself, not a separator.
  if (token === '+' || !token.includes('+')) return { kind: 'keys', parts: [part(token)] };
  return { kind: 'keys', parts: token.split('+').map(part) };
}

export type PillNav = 'next' | 'prev' | 'first' | 'last' | 'fullscreen';

/** What a key press does in the viewer (null: nothing, let the browser have it). */
export function navForKey(e: { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean }): PillNav | null {
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  switch (e.key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
      return 'next';
    case 'ArrowLeft':
    case 'PageUp':
      return 'prev';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'f':
    case 'F':
      return 'fullscreen';
    default:
      return null;
  }
}

/** Index of the step after a navigation, kept inside [0, total). */
export function applyNav(index: number, nav: Exclude<PillNav, 'fullscreen'>, total: number): number {
  const target = nav === 'next' ? index + 1 : nav === 'prev' ? index - 1 : nav === 'first' ? 0 : total - 1;
  return Math.max(0, Math.min(total - 1, target));
}

/** Step index from the address hash ("#5" is the fifth step); 0 if missing or invalid. */
export function stepFromHash(hash: string, total: number): number {
  const n = Number.parseInt(hash.replace(/^#/, ''), 10);
  return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0;
}
