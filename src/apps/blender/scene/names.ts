/**
 * Blender's unique names: "Cube", then "Cube.001", "Cube.002"... (the first
 * free number, three digits at least). A name that already ends in .NNN keeps
 * its stem.
 */
export function uniqueName(wanted: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(wanted)) return wanted;
  const stem = wanted.replace(/\.\d{3,}$/, '');
  for (let i = 1; ; i++) {
    const candidate = `${stem}.${String(i).padStart(3, '0')}`;
    if (!used.has(candidate)) return candidate;
  }
}
