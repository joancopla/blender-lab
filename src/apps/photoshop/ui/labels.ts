/**
 * Every text of the replicated Photoshop interface, in Spanish as the classroom
 * has it. They are all here so the validator can check them against the program
 * in one pass (docs/fidelity/photoshop.md). Teaching texts are not here: they
 * are Catalan and live in ca.json.
 *
 * FIDELITY? Written without Photoshop at hand: every label is to validate.
 */
import type { QuickTransform, TransformMode } from '../transform/transform';

export const MENU_BAR = ['Archivo', 'Edición', 'Imagen', 'Capa', 'Texto', 'Selección', 'Filtro', 'Vista', 'Plugins', 'Ventana', 'Ayuda'] as const;

export const EDIT = {
  undo: 'Deshacer',
  redo: 'Rehacer',
  freeTransform: 'Transformación libre',
  transform: 'Transformar',
  again: 'Otra vez',
} as const;

export const MODE_LABELS: Record<Exclude<TransformMode, 'free'>, string> = {
  scale: 'Escala',
  rotate: 'Rotar',
  skew: 'Sesgar',
  distort: 'Distorsionar',
  perspective: 'Perspectiva',
};

export const WARP = 'Deformar';

export const QUICK_LABELS: Record<QuickTransform, string> = {
  rotate180: 'Rotar 180°',
  rotate90cw: 'Rotar 90° en sentido horario',
  rotate90ccw: 'Rotar 90° en sentido antihorario',
  flipH: 'Voltear horizontal',
  flipV: 'Voltear vertical',
};

/** Keyboard shortcuts as the menus print them. */
export const SHORTCUTS = {
  undo: 'Ctrl+Z',
  redo: 'Mayús+Ctrl+Z',
  freeTransform: 'Ctrl+T',
  again: 'Mayús+Ctrl+T',
} as const;

/** Names of the history steps (Edición > Deshacer …). */
export const HISTORY = {
  freeTransform: 'Transformación libre',
  move: 'Mover',
} as const;

export const OPTIONS = {
  autoSelect: 'Selección automática:',
  autoSelectLayer: 'Capa',
  showTransformControls: 'Mostrar controles de transformación',
  x: 'X:',
  y: 'Y:',
  w: 'An:',
  h: 'Al:',
  skewH: 'H:',
  skewV: 'V:',
  interpolation: 'Interpolación:',
  bicubicAutomatic: 'Bicúbica automática',
  referencePoint: 'Conmutar punto de referencia',
  relative: 'Usar posición relativa para el punto de referencia',
  link: 'Mantener proporción',
  rotate: 'Rotar',
  warpSwitch: 'Cambiar entre los modos de transformación libre y deformación',
  cancel: 'Cancelar transformación (Esc)',
  commit: 'Aprobar transformación (Intro)',
} as const;

export const LAYERS = {
  tabs: ['Capas', 'Canales', 'Trazados'],
  kind: 'Tipo',
  normal: 'Normal',
  opacity: 'Opacidad:',
  lock: 'Bloq.:',
  fill: 'Relleno:',
  visibility: 'Indica la visibilidad de la capa',
  footer: {
    link: 'Enlazar capas',
    style: 'Añadir un estilo de capa',
    mask: 'Añadir máscara de capa',
    adjustment: 'Crear nueva capa de relleno o ajuste',
    group: 'Crear un grupo nuevo',
    create: 'Crear una capa nueva',
    remove: 'Eliminar capa',
  },
} as const;

export const TOOLS = {
  move: 'Herramienta Mover (V)',
  marquee: 'Herramienta Marco rectangular (M)',
  lasso: 'Herramienta Lazo (L)',
  crop: 'Herramienta Recortar (C)',
  brush: 'Herramienta Pincel (B)',
  eraser: 'Herramienta Borrador (E)',
  type: 'Herramienta Texto horizontal (T)',
  hand: 'Herramienta Mano (H)',
  zoom: 'Herramienta Zoom (Z)',
} as const;

/** Document tab: "cartel.psd al 66,7% (Adhesivo, RGB/8#)". */
export const tabTitle = (name: string, zoom: string, layer: string): string => `${name} al ${zoom}% (${layer ? `${layer}, ` : ''}RGB/8#)`;

/** Numbers as the Spanish interface writes them: comma for decimals. */
export const formatNumber = (value: number, decimals = 2): string => {
  const fixed = (Object.is(value, -0) ? 0 : value).toFixed(decimals);
  return (fixed === `-${(0).toFixed(decimals)}` ? fixed.slice(1) : fixed).replace('.', ',');
};

/** Reads a typed number with a comma or a point, ignoring the unit. */
export function parseNumber(text: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, ''));
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
