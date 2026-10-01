/**
 * Shader node sockets: types, values and the implicit conversions of Blender's
 * Shader Editor. No DOM, no three.js.
 *
 * Verified in the Blender 5.2.1 source:
 * - source/blender/nodes/shader/node_shader_tree.cc, shader_validate_link: a Shader output can
 *   only go into a Shader input; any other output can go into a Shader input ("it will be
 *   interpreted as emission").
 * - intern/cycles/kernel/svm/convert.h: color → float is linear_rgb_to_gray (luminance),
 *   vector → float is the average of the components.
 */

export type SocketType = 'shader' | 'color' | 'float' | 'vector' | 'bool';

export type Color = readonly [number, number, number, number];
export type Vector = readonly [number, number, number];
export type SocketValue = number | boolean | Color | Vector;

/**
 * Luminance weights of the scene-linear space (Linear Rec.709 in Blender's default OCIO
 * config). FIDELITY? Blender reads them from the OCIO config.
 */
export const LUMA = [0.2126, 0.7152, 0.0722] as const;

/** Whether Blender accepts a link from `from` into `to` (otherwise it is drawn red). */
export function canLink(from: SocketType, to: SocketType): boolean {
  if (from === 'shader') return to === 'shader';
  return true;
}

const luminance = (c: Color | Vector) => LUMA[0] * c[0] + LUMA[1] * c[1] + LUMA[2] * c[2];

/** Converts a constant value between socket types, as an implicit conversion would. */
export function convertValue(value: SocketValue, from: SocketType, to: SocketType): SocketValue {
  if (from === to || to === 'shader') return value;
  const asFloat = (): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return from === 'color' ? luminance(value) : (value[0] + value[1] + value[2]) / 3;
  };
  switch (to) {
    case 'float':
      return asFloat();
    case 'bool':
      return asFloat() > 0;
    case 'vector':
      return typeof value === 'object' ? [value[0], value[1], value[2]] : [asFloat(), asFloat(), asFloat()];
    case 'color':
      return typeof value === 'object' ? [value[0], value[1], value[2], value.length === 4 ? value[3]! : 1] : [asFloat(), asFloat(), asFloat(), 1];
  }
}

/** The value a socket of this type has when nothing else is given. */
export function zeroValue(type: SocketType): SocketValue {
  switch (type) {
    case 'color':
      return [0, 0, 0, 1];
    case 'vector':
      return [0, 0, 0];
    case 'bool':
      return false;
    default:
      return 0;
  }
}
