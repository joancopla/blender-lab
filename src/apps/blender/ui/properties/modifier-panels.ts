/**
 * The body of each modifier panel: its properties in Blender's layout. Only
 * the lab's properties are shown; subpanels the lab does not use are left out.
 * FIDELITY? Layout, labels and which subpanels start open, per modifier.
 * FIDELITY? Undo names: the label of the property (Factor, Distance...).
 */
import { t } from '../../../../core/i18n';
import { type Axis3, MAX_VIEWPORT_LEVELS, type Modifier, type ModifierType } from '../../modifiers/types';
import type { ModifierPatch } from '../../operators/modifiers';
import { formatAngle, formatDistance } from '../format';
import {
  type Widget,
  axisWidget,
  checkboxWidget,
  dropdownWidget,
  numberWidget,
  objectWidget,
  segmentedWidget,
  subpanelWidget,
} from './widgets';

export interface PanelContext {
  /** The modifier as it is now (committed, or the preview while dragging). */
  mod(): Modifier;
  set(patch: ModifierPatch, label: string): void;
  preview(patch: ModifierPatch | null): void;
  /** Objects a Mirror Object can be (every other object). */
  objects(): readonly { id: string; name: string }[];
  /** Open state of a subpanel (UI only). */
  subpanel(key: string, openByDefault: boolean): { get(): boolean; set(v: boolean): void };
  /** A lab warning in the status bar. */
  report(message: string): void;
}

const plain = (digits: number) => (v: number) => (Math.abs(v) < 10 ** -digits / 2 ? 0 : v).toFixed(digits);
const count = (v: number) => String(Math.round(v));

type Of<T extends ModifierType> = Extract<Modifier, { type: T }>;

/** A number property of the modifier, by field name. */
function num<T extends ModifierType>(
  ctx: PanelContext,
  field: keyof Of<T> & string,
  label: string,
  kind: 'distance' | 'angle' | 'count' | 'factor',
  extra: { min?: number; max?: number; inner?: string } = {},
) {
  const STEPS = {
    distance: { format: formatDistance, dragStep: 0.01, snapStep: 0.1 },
    angle: { format: formatAngle, dragStep: 1, snapStep: 5 },
    count: { format: count, dragStep: 0.1, snapStep: 1 },
    factor: { format: plain(3), dragStep: 0.01, snapStep: 0.1 },
  }[kind];
  const get = () => (ctx.mod() as unknown as Record<string, number>)[field]!;
  return numberWidget({
    label: extra.inner ? '' : label,
    inner: extra.inner,
    get,
    preview: (v) => ctx.preview(v === null ? null : ({ [field]: v } as ModifierPatch)),
    commit: (v) => ctx.set({ [field]: v } as ModifierPatch, label),
    ...STEPS,
    integer: kind === 'count',
    min: extra.min,
    max: extra.max,
  });
}

function bool<T extends ModifierType>(ctx: PanelContext, field: keyof Of<T> & string, label: string): Widget {
  const get = () => (ctx.mod() as unknown as Record<string, boolean>)[field]!;
  return checkboxWidget(label, get, (v) => ctx.set({ [field]: v } as ModifierPatch, label));
}

/** One component of a vector property: X, Y or Z of Relative Offset... */
function vecComponent(
  ctx: PanelContext,
  field: 'relativeOffsetDisplace' | 'constantOffsetDisplace',
  axis: 'x' | 'y' | 'z',
  label: string,
  kind: 'distance' | 'factor',
): Widget {
  const vec = () => (ctx.mod() as Of<'ARRAY'>)[field];
  const patch = (v: number): ModifierPatch => ({ [field]: { ...vec(), [axis]: v } }) as ModifierPatch;
  const first = axis === 'x';
  return numberWidget({
    label: first ? label : '',
    inner: axis.toUpperCase(),
    get: () => vec()[axis],
    preview: (v) => ctx.preview(v === null ? null : patch(v)),
    commit: (v) => ctx.set(patch(v), label),
    format: kind === 'distance' ? formatDistance : plain(3),
    dragStep: 0.01,
    snapStep: 0.1,
  });
}

function axes(ctx: PanelContext, field: 'useAxis' | 'useBisectAxis' | 'useBisectFlipAxis', label: string): Widget {
  return axisWidget(label, () => (ctx.mod() as Of<'MIRROR'>)[field], (v: Axis3) => ctx.set({ [field]: v } as ModifierPatch, label));
}

function subsurf(ctx: PanelContext): Widget[] {
  const m = () => ctx.mod() as Of<'SUBSURF'>;
  // Past the lab's limit the value stays at 3 and the lab says why.
  const commitLevels = (v: number) => {
    if (v > MAX_VIEWPORT_LEVELS) ctx.report(t('lab.subsurfLevelLimit'));
    ctx.set({ levels: v }, 'Levels Viewport');
  };
  const levelsWidget = numberWidget({
    label: 'Levels Viewport',
    get: () => m().levels,
    preview: (v) => ctx.preview(v === null ? null : { levels: v }),
    commit: commitLevels,
    format: count,
    dragStep: 0.1,
    snapStep: 1,
    integer: true,
    min: 0,
    max: 6,
  });
  return [
    segmentedWidget(
      '',
      [
        { value: 'CATMULL_CLARK', label: 'Catmull-Clark' },
        { value: 'SIMPLE', label: 'Simple' },
      ] as const,
      () => m().subdivisionType,
      (v) => ctx.set({ subdivisionType: v }, 'Subdivision Type'),
    ),
    levelsWidget,
    num<'SUBSURF'>(ctx, 'renderLevels', 'Render', 'count', { min: 0, max: 6 }),
    subpanelWidget('Advanced', ctx.subpanel('advanced', false), [bool<'SUBSURF'>(ctx, 'useLimitSurface', 'Use Limit Surface')]),
  ];
}

function mirror(ctx: PanelContext): Widget[] {
  const m = () => ctx.mod() as Of<'MIRROR'>;
  return [
    axes(ctx, 'useAxis', 'Axis'),
    axes(ctx, 'useBisectAxis', 'Bisect'),
    axes(ctx, 'useBisectFlipAxis', 'Flip'),
    objectWidget('Mirror Object', () => m().mirrorObjectId, ctx.objects, (id) => ctx.set({ mirrorObjectId: id }, 'Mirror Object')),
    bool<'MIRROR'>(ctx, 'useClip', 'Clipping'),
    bool<'MIRROR'>(ctx, 'useMirrorMerge', 'Merge'),
    num<'MIRROR'>(ctx, 'mergeThreshold', 'Merge Distance', 'distance', { min: 0 }),
    num<'MIRROR'>(ctx, 'bisectThreshold', 'Bisect Distance', 'distance', { min: 0 }),
  ];
}

function array(ctx: PanelContext): Widget[] {
  const m = () => ctx.mod() as Of<'ARRAY'>;
  const toggle = (field: 'useRelativeOffset' | 'useConstantOffset' | 'useMergeVertices', label: string) => ({
    get: () => m()[field],
    set: (v: boolean) => ctx.set({ [field]: v } as ModifierPatch, label),
  });
  return [
    dropdownWidget(
      'Fit Type',
      [
        { value: 'FIXED_COUNT', label: 'Fixed Count' },
        { value: 'FIT_LENGTH', label: 'Fit Length', disabled: true },
        { value: 'FIT_CURVE', label: 'Fit Curve', disabled: true },
      ] as const,
      () => m().fitType,
      () => undefined,
    ),
    num<'ARRAY'>(ctx, 'count', 'Count', 'count', { min: 1, max: 1000 }),
    subpanelWidget(
      'Relative Offset',
      ctx.subpanel('relative', true),
      (['x', 'y', 'z'] as const).map((a) => vecComponent(ctx, 'relativeOffsetDisplace', a, 'Factor', 'factor')),
      toggle('useRelativeOffset', 'Relative Offset'),
    ),
    subpanelWidget(
      'Constant Offset',
      ctx.subpanel('constant', false),
      (['x', 'y', 'z'] as const).map((a) => vecComponent(ctx, 'constantOffsetDisplace', a, 'Distance', 'distance')),
      toggle('useConstantOffset', 'Constant Offset'),
    ),
    subpanelWidget(
      'Merge',
      ctx.subpanel('merge', false),
      [num<'ARRAY'>(ctx, 'mergeThreshold', 'Distance', 'distance', { min: 0 }), bool<'ARRAY'>(ctx, 'useMergeVerticesCap', 'First Last')],
      toggle('useMergeVertices', 'Merge'),
    ),
  ];
}

function bevel(ctx: PanelContext): Widget[] {
  const m = () => ctx.mod() as Of<'BEVEL'>;
  const out: Widget[] = [
    segmentedWidget(
      '',
      [
        { value: 'VERTICES', label: 'Vertices', disabled: true },
        { value: 'EDGES', label: 'Edges' },
      ] as const,
      () => 'EDGES',
      () => undefined,
    ),
    dropdownWidget(
      'Width Type',
      [
        { value: 'OFFSET', label: 'Offset' },
        { value: 'WIDTH', label: 'Width', disabled: true },
        { value: 'DEPTH', label: 'Depth', disabled: true },
        { value: 'PERCENT', label: 'Percent', disabled: true },
        { value: 'ABSOLUTE', label: 'Absolute', disabled: true },
      ] as const,
      () => 'OFFSET',
      () => undefined,
    ),
    num<'BEVEL'>(ctx, 'width', 'Amount', 'distance', { min: 0 }),
    num<'BEVEL'>(ctx, 'segments', 'Segments', 'count', { min: 1, max: 100 }),
    segmentedWidget(
      'Limit Method',
      [
        { value: 'NONE', label: 'None' },
        { value: 'ANGLE', label: 'Angle' },
        { value: 'WEIGHT', label: 'Weight', disabled: true },
        { value: 'VGROUP', label: 'Vertex Group', disabled: true },
      ] as const,
      () => m().limitMethod,
      (v) => (v === 'NONE' || v === 'ANGLE') && ctx.set({ limitMethod: v }, 'Limit Method'),
      true,
    ),
  ];
  const angle = num<'BEVEL'>(ctx, 'angleLimitDeg', 'Angle', 'angle', { min: 0, max: 180 });
  // Angle only shows with Limit Method: Angle.
  const angleRow: Widget = {
    element: angle.element,
    update: () => {
      angle.element.hidden = m().limitMethod !== 'ANGLE';
      angle.update();
    },
    dispose: angle.dispose,
  };
  out.push(angleRow, subpanelWidget('Geometry', ctx.subpanel('geometry', false), [bool<'BEVEL'>(ctx, 'useClampOverlap', 'Clamp Overlap')]));
  return out;
}

function solidify(ctx: PanelContext): Widget[] {
  return [
    dropdownWidget(
      'Mode',
      [
        { value: 'SIMPLE', label: 'Simple' },
        { value: 'NON_MANIFOLD', label: 'Complex', disabled: true },
      ] as const,
      () => 'SIMPLE',
      () => undefined,
    ),
    num<'SOLIDIFY'>(ctx, 'thickness', 'Thickness', 'distance'),
    num<'SOLIDIFY'>(ctx, 'offset', 'Offset', 'factor', { min: -1, max: 1 }),
    bool<'SOLIDIFY'>(ctx, 'useEvenOffset', 'Even Thickness'),
    subpanelWidget('Rim', ctx.subpanel('rim', false), [bool<'SOLIDIFY'>(ctx, 'useRim', 'Fill Rim')]),
  ];
}

const BUILDERS: Record<ModifierType, (ctx: PanelContext) => Widget[]> = {
  SUBSURF: subsurf,
  MIRROR: mirror,
  ARRAY: array,
  BEVEL: bevel,
  SOLIDIFY: solidify,
};

/** The widgets of a modifier's panel body. */
export function modifierWidgets(type: ModifierType, ctx: PanelContext): Widget[] {
  return BUILDERS[type](ctx);
}
