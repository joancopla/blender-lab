import { describe, expect, it } from 'vitest';
import { vec3 } from '../math/vec3';
import { DEG, angleBetween, fromEulerXYZ } from '../math/quat';
import { type NavContext, Navigator, SMOOTH_VIEW_MS, easeSmoothView } from './navigator';
import { AXIS_VIEW_ROTATIONS, viewName } from './view-state';

function setup(overrides: Partial<NavContext> = {}) {
  let now = 0;
  const ctx: NavContext = {
    size: () => ({ width: 1600, height: 900 }),
    cameraPose: () => ({
      location: vec3(7.3589, -6.9258, 4.9583),
      rotation: fromEulerXYZ(vec3(63.559 * DEG, 0, 46.692 * DEG)),
    }),
    cameraData: () => ({ lens: 50, sensorWidth: 36, resolutionX: 1920, resolutionY: 1080 }),
    selectedBounds: () => ({ min: vec3(-1, -1, -1), max: vec3(1, 1, 1) }),
    allBounds: () => ({ min: vec3(-1, -7, -1), max: vec3(7, 1, 6) }),
    reducedMotion: () => false,
    now: () => now,
    ...overrides,
  };
  const nav = new Navigator(ctx);
  return { nav, advance: (ms: number) => (now += ms) };
}

describe('Navigator', () => {
  it('animates axis views with Smooth View and ends exactly on the target', () => {
    const { nav, advance } = setup();
    nav.apply({ type: 'axisView', axis: 'front' });
    expect(viewName(nav.state)).toBe('Front Orthographic');
    expect(nav.animating).toBe(true);
    advance(SMOOTH_VIEW_MS / 2);
    expect(nav.tick()).toBe(true);
    const mid = nav.displayed();
    expect(angleBetween(mid.rotation, AXIS_VIEW_ROTATIONS.front)).toBeGreaterThan(0.01);
    advance(SMOOTH_VIEW_MS);
    expect(nav.tick()).toBe(false);
    expect(angleBetween(nav.displayed().rotation, AXIS_VIEW_ROTATIONS.front)).toBeCloseTo(0, 9);
  });

  it('is instant with prefers-reduced-motion', () => {
    const { nav } = setup({ reducedMotion: () => true });
    nav.apply({ type: 'axisView', axis: 'top' });
    expect(nav.animating).toBe(false);
    expect(angleBetween(nav.displayed().rotation, AXIS_VIEW_ROTATIONS.top)).toBeCloseTo(0, 9);
  });

  it('mouse navigation cancels a running transition', () => {
    const { nav } = setup();
    nav.apply({ type: 'axisView', axis: 'front' });
    nav.dragOrbit(5, 0);
    expect(nav.animating).toBe(false);
    expect(viewName(nav.state)).toBe('User Perspective');
  });

  it('frame selected / frame all do nothing without bounds', () => {
    const { nav } = setup({ selectedBounds: () => null, allBounds: () => null });
    const before = nav.state;
    nav.apply({ type: 'frameSelected' });
    nav.apply({ type: 'frameAll' });
    expect(nav.state).toBe(before);
  });

  it('enters the camera view at the end of the transition', () => {
    const { nav, advance } = setup();
    nav.apply({ type: 'toggleCamera' });
    expect(nav.displayed().camera).toBeNull();
    advance(SMOOTH_VIEW_MS);
    nav.tick();
    expect(nav.displayed().camera).not.toBeNull();
    expect(viewName(nav.state)).toBe('Camera Perspective');
  });

  it('Numpad 5 is instant', () => {
    const { nav } = setup();
    nav.apply({ type: 'toggleProjection' });
    expect(nav.animating).toBe(false);
    expect(nav.displayed().projection).toBe('orthographic');
  });

  it('smoothstep easing', () => {
    expect(easeSmoothView(0)).toBe(0);
    expect(easeSmoothView(0.5)).toBe(0.5);
    expect(easeSmoothView(1)).toBe(1);
  });
});
