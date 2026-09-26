import ca from './ca.json';

type Dict = { [key: string]: string | Dict };

/** Looks up a Catalan text by dotted key, e.g. t('site.title'). */
export function t(key: string): string {
  let node: string | Dict | undefined = ca as Dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') break;
    node = node[part];
  }
  if (typeof node !== 'string') {
    console.warn(`Missing i18n key: ${key}`);
    return key;
  }
  return node;
}
