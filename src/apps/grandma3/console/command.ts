/**
 * A small part of grandMA3's command line, as keys on the classroom keypad.
 * Only syntax verified in the grandMA3 manual (help.malighting.com):
 * - numbers use the default keyword Fixture: "1 Please" selects fixture 1 (QSG Control Simple Fixtures);
 * - "+ 2" adds to the selection (QSG); "1 Thru 4" is a range; a missing side of Thru goes as far
 *   as possible (Thru keyword);
 * - "-" removes from a list: "Fixture 1 Thru 10 - 6 Thru 8" (Minus keyword);
 * - "At 50" applies a dimmer value to the selection, also after a list: "Fixture 1 Thru 4 At 4"
 *   (At keyword); "At At" applies Normal, 100 % by default (QSG).
 * Single digit input ("At 5" = 50 %) is a setting that is off here, so "At 60" is 60 %.
 * No DOM.
 */

/** Keys of the keypad that build a command. */
export type CommandKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'Thru' | '+' | '−' | 'At';

/** A command line being typed: numbers merged, keywords as they are. */
export type Token = string;

const isDigit = (k: string) => /^[0-9.]$/.test(k);
const isNumber = (t: Token | undefined): t is string => t !== undefined && /^[0-9]+(\.[0-9]+)?$/.test(t);

/** Adds a key to the tokens (digits join the number being typed). */
export function pushKey(tokens: readonly Token[], key: CommandKey): Token[] {
  const last = tokens[tokens.length - 1];
  if (isDigit(key) && last !== undefined && /^[0-9.]+$/.test(last)) return [...tokens.slice(0, -1), last + key];
  return [...tokens, key];
}

/** Removes the last key typed. */
export function popKey(tokens: readonly Token[]): Token[] {
  const last = tokens[tokens.length - 1];
  if (last !== undefined && /^[0-9.]{2,}$/.test(last)) return [...tokens.slice(0, -1), last.slice(0, -1)];
  return tokens.slice(0, -1);
}

/** What the command line shows. */
export const commandText = (tokens: readonly Token[]): string => tokens.join(' ');

export interface ParsedCommand {
  /** New selection (fixture numbers), or null to keep the current one. */
  readonly selection: readonly number[] | null;
  /** Dimmer value to apply to the selection (percent), or null. */
  readonly at: number | null;
}

export type ParseResult = { readonly ok: true; readonly command: ParsedCommand } | { readonly ok: false; readonly error: string };

/**
 * Parses a command against the fixtures that exist (numbers) and the current selection.
 * Errors are i18n keys under "ma3.console.errors".
 */
export function parseCommand(tokens: readonly Token[], fixtures: readonly number[], current: readonly number[]): ParseResult {
  const t = tokens;
  if (t.length === 0) return { ok: false, error: 'empty' };
  const sorted = [...fixtures].sort((a, b) => a - b);
  const lowest = sorted[0] ?? 1;
  const highest = sorted[sorted.length - 1] ?? 1;
  let i = 0;
  let selection: number[] | null = null;

  if (t[0] !== 'At') {
    // A list that starts with + or − changes the current selection; otherwise it replaces it.
    const set = new Set<number>(t[0] === '+' || t[0] === '−' ? current : []);
    let op: '+' | '−' = '+';
    let items = 0;
    while (i < t.length && t[i] !== 'At') {
      const tok = t[i]!;
      if (tok === '+' || tok === '−') {
        op = tok;
        i++;
        continue;
      }
      let from: number;
      let to: number;
      if (tok === 'Thru') {
        from = lowest;
        i++;
        to = isNumber(t[i]) ? Number(t[i++]) : highest;
      } else if (isNumber(tok)) {
        from = Number(tok);
        i++;
        to = from;
        if (t[i] === 'Thru') {
          i++;
          to = isNumber(t[i]) ? Number(t[i++]) : highest;
        }
      } else {
        return { ok: false, error: 'syntax' };
      }
      const [a, b] = from <= to ? [from, to] : [to, from];
      for (const n of sorted) if (n >= a && n <= b) (op === '+' ? set.add(n) : set.delete(n));
      items++;
      op = '+';
    }
    if (items === 0) return { ok: false, error: 'syntax' };
    selection = sorted.filter((n) => set.has(n));
  }

  let at: number | null = null;
  if (t[i] === 'At') {
    i++;
    if (t[i] === 'At') {
      at = 100; // "At At": Normal, 100 % by default
      i++;
    } else if (isNumber(t[i])) {
      at = Math.min(100, Number(t[i]));
      i++;
    } else {
      return { ok: false, error: 'atValue' };
    }
    if ((selection ?? current).length === 0) return { ok: false, error: 'noSelection' };
  }
  if (i < t.length) return { ok: false, error: 'syntax' };
  return { ok: true, command: { selection, at } };
}
