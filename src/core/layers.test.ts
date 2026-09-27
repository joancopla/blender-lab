/**
 * Architecture guard: labs -> apps -> core, never the other way.
 * - src/core may not import src/apps, src/labs or three.js.
 * - src/apps may not import src/labs.
 * Files are read through Vite's import.meta.glob (no Node APIs needed).
 */
import { describe, expect, it } from 'vitest';

/**
 * Source of every .ts file under src, keyed by path relative to src ("core/lab.ts").
 * The glob gives "../apps/..." for other folders and "./..." for files in core itself.
 */
const sources: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).map(
    ([k, v]) => [k.startsWith('./') ? `core/${k.slice(2)}` : k.replace(/^\.\.\//, ''), v],
  ),
);

function importsOf(text: string): string[] {
  const out: string[] = [];
  const re = /(?:from\s+|import\s*\(\s*|import\s+|export\s+\*\s+from\s+)['"]([^'"]+)['"]/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(m[1]!);
  return out;
}

/** Normalises "a/b/../c" style paths. */
function normalise(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  }
  return out.join('/');
}

/** Layer ("core", "apps", "labs", "site") of an import, or the package name. */
function target(file: string, spec: string): string {
  if (!spec.startsWith('.')) return spec.split('/')[0]!;
  const dir = file.split('/').slice(0, -1).join('/');
  return normalise(`${dir}/${spec}`).split('/')[0]!;
}

function violations(layer: string, forbidden: readonly string[]): string[] {
  return Object.entries(sources)
    .filter(([file]) => file.startsWith(`${layer}/`))
    .flatMap(([file, text]) =>
      importsOf(text)
        .filter((spec) => forbidden.includes(target(file, spec)))
        .map((spec) => `${file} -> ${spec}`),
    );
}

describe('layers', () => {
  it('reads the sources', () => {
    expect(Object.keys(sources).some((f) => f.startsWith('core/'))).toBe(true);
    expect(Object.keys(sources).some((f) => f.startsWith('apps/blender/'))).toBe(true);
  });

  it('core does not import apps, labs or three.js', () => {
    expect(violations('core', ['apps', 'labs', 'three'])).toEqual([]);
  });

  it('apps do not import labs', () => {
    expect(violations('apps', ['labs'])).toEqual([]);
  });
});
