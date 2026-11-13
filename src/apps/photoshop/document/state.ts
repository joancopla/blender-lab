/**
 * The Photoshop document (single source of truth) and the operators that change
 * it through core/history. No DOM: pixels live apart, in the layer contents a
 * setup brings, and the document only keeps where each layer's corners are.
 */
import type { OperatorCall } from '../../../core/history/store';
import { type Point, type Quad, mapQuad, pt, rectQuad } from '../geometry';
import type { TransformMode } from '../transform/transform';

/** The pixels of a layer, drawn by code when the document loads. */
export interface LayerContent {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  paint(ctx: CanvasRenderingContext2D): void;
}

export interface PsLayer {
  readonly id: string;
  readonly name: string;
  /** The Background layer ("Fondo"): locked, cannot be transformed. */
  readonly background: boolean;
  /** Percent, 0–100. */
  readonly opacity: number;
  readonly contentId: string;
  /**
   * Where the four corners of the content are in the document. Transforms only
   * move these corners; the content itself is never resampled.
   */
  readonly quad: Quad;
}

/** What undo and redo walk through. */
export interface PsDoc {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Bottom to top. */
  readonly layers: readonly PsLayer[];
}

/** What stage checks read: the document plus what Photoshop keeps out of its history. */
export interface PsState extends Omit<PsDoc, 'layers'> {
  /** Bottom to top. */
  readonly layers: readonly (PsLayer & { readonly visible: boolean })[];
  readonly activeLayerId: string | null;
  /**
   * A transform that has not been committed yet. While it runs, the layer's
   * `quad` is the uncommitted one.
   */
  readonly transform: { readonly layerId: string; readonly mode: TransformMode } | null;
}

export interface PsLayerSetup {
  readonly id: string;
  readonly name: string;
  readonly content: LayerContent;
  /** Top left corner of the content (default 0, 0). */
  readonly at?: Point;
  /** The four corners, for a layer that starts already transformed (overrides `at`). */
  readonly quad?: Quad;
  readonly background?: boolean;
  readonly visible?: boolean;
  readonly opacity?: number;
}

/** What a stage loads. */
export interface PsSetup {
  /** File name on the document tab. */
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Bottom to top. */
  readonly layers: readonly PsLayerSetup[];
  /** Layer selected at the start (default: the top one). */
  readonly active?: string;
}

/** Lab elements a check asks the app to show: outlines to aim at (lab style). */
export interface PsDecorations {
  readonly targets?: readonly Quad[];
}

export const EMPTY_DOC: PsDoc = { name: '', width: 1, height: 1, layers: [] };

export function initialDoc(setup: PsSetup): PsDoc {
  return {
    name: setup.name,
    width: setup.width,
    height: setup.height,
    layers: setup.layers.map((l) => {
      const at = l.at ?? pt(0, 0);
      return {
        id: l.id,
        name: l.name,
        background: l.background === true,
        opacity: l.opacity ?? 100,
        contentId: l.content.id,
        quad: l.quad ?? rectQuad({ x: at.x, y: at.y, w: l.content.width, h: l.content.height }),
      };
    }),
  };
}

export const layerById = (doc: { readonly layers: readonly PsLayer[] }, id: string | null): PsLayer | undefined =>
  id === null ? undefined : doc.layers.find((l) => l.id === id);

const sameQuad = (a: Quad, b: Quad): boolean => a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y);

/** Moves a layer's corners (a committed transform). `name` is the history step. */
export function setLayerQuad(layerId: string, quad: Quad, name: string): OperatorCall<PsDoc> {
  return {
    name,
    apply(doc) {
      const layer = layerById(doc, layerId);
      if (!layer || layer.background || sameQuad(layer.quad, quad)) return doc;
      return { ...doc, layers: doc.layers.map((l) => (l.id === layerId ? { ...l, quad } : l)) };
    },
  };
}

/** The document with one layer's corners replaced (the preview of a running transform). */
export function withLayerQuad(doc: PsDoc, layerId: string, quad: Quad): PsDoc {
  return { ...doc, layers: doc.layers.map((l) => (l.id === layerId ? { ...l, quad: mapQuad(quad, (p) => p) } : l)) };
}
