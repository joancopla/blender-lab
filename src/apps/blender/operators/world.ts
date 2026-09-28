/**
 * World > Surface (Background shader): Color and Strength. One undo step per
 * change, named after the property.
 */
import { type SceneState, type WorldSettings, worldOf } from '../scene/scene';
import type { OperatorCall } from '../scene/store';

export function setWorld(s: SceneState, patch: Partial<WorldSettings>): SceneState {
  const w = worldOf(s);
  const next: WorldSettings = {
    color: patch.color ?? w.color,
    strength: patch.strength === undefined ? w.strength : Math.max(0, patch.strength),
  };
  const same =
    next.strength === w.strength && next.color.x === w.color.x && next.color.y === w.color.y && next.color.z === w.color.z;
  return same ? s : { ...s, world: next };
}

export const SetWorldOp = (patch: Partial<WorldSettings>, label: string): OperatorCall => ({
  name: label,
  apply: (s) => setWorld(s, patch),
});
