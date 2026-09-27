/**
 * Does a key chip in the stage panel ("Shift + clic esquerre", "Roda", "0–9")
 * match what the key overlay just saw ("Shift + Clic esquerre", "Roda amunt",
 * "4")? Used for the chip's visual click.
 */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const DIGIT_RANGE = /^(\d)\s*[–-]\s*(\d)$/;

export function chipMatches(chip: string, pressed: string): boolean {
  const c = norm(chip);
  const p = norm(pressed);
  if (c === p) return true;
  // A range of digits ("0–9") matches any digit in it.
  const range = DIGIT_RANGE.exec(c);
  if (range) return /^\d$/.test(p) && p >= range[1]! && p <= range[2]!;
  // A generic chip ("Roda") matches its variants ("Roda amunt", "Roda avall").
  return p.startsWith(`${c} `) && !p.includes('+');
}
