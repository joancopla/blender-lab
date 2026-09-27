/**
 * Evaluates what the student types in a number field: numbers and + - * / ( ).
 * A trailing unit ("m", "°", "deg") is ignored and a comma works as decimal point.
 * FIDELITY? Blender evaluates Python expressions and converts units ("2cm").
 * Returns null if the text is not a valid expression.
 */
export function evaluateExpression(text: string): number | null {
  const src = text
    .trim()
    .replace(/,/g, '.')
    .replace(/\s*(m|°|deg)$/i, '');
  let i = 0;
  const peek = () => src[i];
  const skip = () => {
    while (src[i] === ' ') i++;
  };

  const number = (): number | null => {
    skip();
    const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const factor = (): number | null => {
    skip();
    if (peek() === '-') {
      i++;
      const f = factor();
      return f === null ? null : -f;
    }
    if (peek() === '+') {
      i++;
      return factor();
    }
    if (peek() === '(') {
      i++;
      const v = expr();
      skip();
      if (v === null || peek() !== ')') return null;
      i++;
      return v;
    }
    return number();
  };
  const term = (): number | null => {
    let v = factor();
    for (;;) {
      skip();
      const op = peek();
      if (v === null || (op !== '*' && op !== '/')) return v;
      i++;
      const r = factor();
      if (r === null) return null;
      v = op === '*' ? v * r : v / r;
    }
  };
  function expr(): number | null {
    let v = term();
    for (;;) {
      skip();
      const op = peek();
      if (v === null || (op !== '+' && op !== '-')) return v;
      i++;
      const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
  }

  const v = expr();
  skip();
  if (v === null || i !== src.length || !Number.isFinite(v)) return null;
  return v;
}
