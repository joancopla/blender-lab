/**
 * Catalan texts. The core registers its own (core/i18n/ca.json); programs and
 * labs register theirs from their folders with registerTexts. Keys are dotted
 * paths ("lab01.s1.title").
 */
import core from './ca.json';

type Dict = { [key: string]: string | Dict };

const registry: Dict = {};

function merge(into: Dict, from: Dict): void {
  for (const [k, v] of Object.entries(from)) {
    const cur = into[k];
    if (typeof v === 'object' && typeof cur === 'object') merge(cur, v);
    else into[k] = typeof v === 'object' ? structuredClone(v) : v;
  }
}

/** Adds texts (deep-merged, later registrations win on conflicts). */
export function registerTexts(texts: Dict): void {
  merge(registry, texts);
}

registerTexts(core as Dict);

function lookup(key: string): string | undefined {
  let node: string | Dict | undefined = registry;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** True if a Catalan text exists for this dotted key. */
export function has(key: string): boolean {
  return lookup(key) !== undefined;
}

/**
 * Looks up a Catalan text by dotted key, e.g. t('site.title').
 * `{name}` placeholders are replaced by `params.name`.
 */
export function t(key: string, params: Record<string, string | number> = {}): string {
  const text = lookup(key);
  if (text === undefined) {
    console.warn(`Missing i18n key: ${key}`);
    return key;
  }
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}
