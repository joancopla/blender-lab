/**
 * Instructions name axes with the letters X, Y and Z; DESIGN.md asks for them
 * in their axis colour, as in the program. Letters that are keys rather than
 * axes stay plain: modifier combos ("Ctrl + Z"), menus ("X > Faces"),
 * key lists ("dissoldre: X") and words like "X-ray".
 */
export type Axis = 'x' | 'y' | 'z';

export interface Segment {
  readonly text: string;
  readonly axis?: Axis;
}

const LETTER = /(?<![\p{L}\p{N}])([XYZ])(?![\p{L}\p{N}])/gu;

function isAxis(text: string, at: number): boolean {
  const before = text.slice(Math.max(0, at - 2), at);
  const after = text.slice(at + 1, at + 3);
  if (before === '+ ' || before.endsWith('-')) return false;
  if (before === ': ') return false;
  if (after.startsWith('-') || after === ' >') return false;
  return true;
}

/** Splits a text into plain runs and axis letters. */
export function axisSegments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(LETTER)) {
    const at = m.index;
    if (!isAxis(text, at)) continue;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ text: m[1]!, axis: m[1]!.toLowerCase() as Axis });
    last = at + 1;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The text as DOM nodes, axis letters wrapped in <span class="axis axis-x">. */
export function axisText(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const s of axisSegments(text)) {
    if (!s.axis) {
      frag.append(s.text);
      continue;
    }
    const span = document.createElement('span');
    span.className = `axis axis-${s.axis}`;
    span.textContent = s.text;
    frag.append(span);
  }
  return frag;
}
