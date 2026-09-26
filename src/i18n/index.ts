import ca from './ca.json';

type Dict = { [key: string]: string | Dict };

/** True if a Catalan text exists for this dotted key. */
export function has(key: string): boolean {
  return lookup(key) !== undefined;
}

function lookup(key: string): string | undefined {
  let node: string | Dict | undefined = ca as Dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
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
