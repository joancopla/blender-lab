/**
 * Modifier data as stored on mesh objects: plain, immutable and serialisable
 * (undo snapshots are references). Field names follow Blender's Python API
 * (use_axis -> useAxis...). Defaults are Blender's when a modifier is added.
 */
import { type Vec3, vec3 } from '../math/vec3';

export type Axis3 = readonly [boolean, boolean, boolean];

interface ModifierBase {
  /** Name shown in the modifier header, unique within the object. */
  readonly name: string;
  /** Header toggles: Edit Mode, Realtime (viewport), Render. */
  readonly showInEditMode: boolean;
  readonly showViewport: boolean;
  readonly showRender: boolean;
  /** Panel expanded in the Properties Editor (UI state, stored like Blender does). */
  readonly showExpanded: boolean;
}

export interface MirrorModifier extends ModifierBase {
  readonly type: 'MIRROR';
  readonly useAxis: Axis3;
  readonly useBisectAxis: Axis3;
  readonly useBisectFlipAxis: Axis3;
  /** Object whose origin and axes define the mirror planes; null: this object's. */
  readonly mirrorObjectId: string | null;
  /** Clipping: vertices on the mirror plane stay on it while transforming (Edit Mode). */
  readonly useClip: boolean;
  readonly useMirrorMerge: boolean;
  readonly mergeThreshold: number;
  readonly bisectThreshold: number;
}

export interface ArrayModifier extends ModifierBase {
  readonly type: 'ARRAY';
  /** Only Fixed Count in this lab (Fit Length and Fit Curve are out of scope). */
  readonly fitType: 'FIXED_COUNT';
  readonly count: number;
  readonly useRelativeOffset: boolean;
  /** Factors of the input mesh's size. */
  readonly relativeOffsetDisplace: Vec3;
  readonly useConstantOffset: boolean;
  /** Metres. */
  readonly constantOffsetDisplace: Vec3;
  readonly useMergeVertices: boolean;
  /** First and last copies are merged too. */
  readonly useMergeVerticesCap: boolean;
  readonly mergeThreshold: number;
}

export interface SubsurfModifier extends ModifierBase {
  readonly type: 'SUBSURF';
  readonly subdivisionType: 'CATMULL_CLARK' | 'SIMPLE';
  /** Levels Viewport (limited to MAX_VIEWPORT_LEVELS in the lab). */
  readonly levels: number;
  /** Levels Render. */
  readonly renderLevels: number;
  readonly useLimitSurface: boolean;
}

export interface BevelModifier extends ModifierBase {
  readonly type: 'BEVEL';
  /** Amount (Width Type: Offset), metres. */
  readonly width: number;
  readonly segments: number;
  readonly limitMethod: 'NONE' | 'ANGLE';
  /** Angle for Limit Method Angle, in degrees (as shown in the panel). */
  readonly angleLimitDeg: number;
  readonly useClampOverlap: boolean;
}

export interface SolidifyModifier extends ModifierBase {
  readonly type: 'SOLIDIFY';
  /** Thickness, metres (Mode: Simple; the lab has no Complex mode). */
  readonly thickness: number;
  /** Offset, -1..1: where the shell goes relative to the surface (-1: behind the normals). */
  readonly offset: number;
  /** Even Thickness. */
  readonly useEvenOffset: boolean;
  /** Fill Rim: close the open borders between the two surfaces. */
  readonly useRim: boolean;
}

export type Modifier = MirrorModifier | ArrayModifier | SubsurfModifier | BevelModifier | SolidifyModifier;
export type ModifierType = Modifier['type'];

/** Default names, as Blender gives them. */
export const MODIFIER_NAMES: Record<ModifierType, string> = {
  MIRROR: 'Mirror',
  ARRAY: 'Array',
  SUBSURF: 'Subdivision',
  BEVEL: 'Bevel',
  SOLIDIFY: 'Solidify',
};

/**
 * Levels Viewport limit of the lab, to keep classroom computers fluid (Blender
 * allows more). Trying to go past it shows a lab warning.
 */
export const MAX_VIEWPORT_LEVELS = 3;

const base = (type: ModifierType): ModifierBase => ({
  name: MODIFIER_NAMES[type],
  showInEditMode: true,
  showViewport: true,
  showRender: true,
  showExpanded: true,
});

/**
 * A new modifier with Blender's defaults.
 * FIDELITY? Mirror: Merge on at 0.001 m, Bisect Distance 0.001 m.
 * FIDELITY? Array: Count 2, Relative Offset (1, 0, 0) on, Constant Offset (1, 0, 0) off,
 * Merge off at 0.01 m.
 * FIDELITY? Subdivision: Catmull-Clark, Levels Viewport 1, Render 2, Use Limit Surface on.
 * FIDELITY? Bevel: Amount 0.1 m, Segments 1, Limit Method Angle (30°), Clamp Overlap on.
 * Solidify: Simple, Thickness 0.01 m, Offset -1, Even Thickness off, Fill Rim on (confirmed).
 */
export function newModifier(type: ModifierType): Modifier {
  if (type === 'SUBSURF') {
    return {
      ...base(type),
      type,
      subdivisionType: 'CATMULL_CLARK',
      levels: 1,
      renderLevels: 2,
      useLimitSurface: true,
    };
  }
  if (type === 'SOLIDIFY') {
    return { ...base(type), type, thickness: 0.01, offset: -1, useEvenOffset: false, useRim: true };
  }
  if (type === 'BEVEL') {
    return {
      ...base(type),
      type,
      width: 0.1,
      segments: 1,
      limitMethod: 'ANGLE',
      angleLimitDeg: 30,
      useClampOverlap: true,
    };
  }
  if (type === 'MIRROR') {
    return {
      ...base(type),
      type,
      useAxis: [true, false, false],
      useBisectAxis: [false, false, false],
      useBisectFlipAxis: [false, false, false],
      mirrorObjectId: null,
      useClip: false,
      useMirrorMerge: true,
      mergeThreshold: 0.001,
      bisectThreshold: 0.001,
    };
  }
  return {
    ...base(type),
    type,
    fitType: 'FIXED_COUNT',
    count: 2,
    useRelativeOffset: true,
    relativeOffsetDisplace: vec3(1, 0, 0),
    useConstantOffset: false,
    constantOffsetDisplace: vec3(1, 0, 0),
    useMergeVertices: false,
    useMergeVerticesCap: false,
    mergeThreshold: 0.01,
  };
}

/**
 * Name not used by any other modifier of the object: "Mirror", "Mirror.001"...
 * `except` is the modifier being renamed. FIDELITY? Same rule as object names.
 */
export function uniqueModifierName(wanted: string, modifiers: readonly Modifier[], except?: Modifier): string {
  const taken = new Set(modifiers.filter((m) => m !== except).map((m) => m.name));
  if (!taken.has(wanted)) return wanted;
  const stem = wanted.replace(/\.\d{3,}$/, '');
  for (let i = 1; ; i++) {
    const candidate = `${stem}.${String(i).padStart(3, '0')}`;
    if (!taken.has(candidate)) return candidate;
  }
}
