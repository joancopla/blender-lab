import { describe, expect, it } from 'vitest';
import { type Vec3, length, sub, vec3 } from '../math/vec3';
import { DEG, IDENTITY, fromAxisAngle, fromEulerXYZ } from '../math/quat';
import { AXIS_Z } from '../math/vec3';
import { minHalfTangent } from './projection';
import {
  type AxisView,
  type CameraPose,
  type SceneCameraData,
  type ViewState,
  cameraFrameRect,
  cameraZoomFromFactor,
  cameraZoomToFactor,
  defaultViewState,
  fitCameraFrame,
  frameBounds,
  matchAxisView,
  metresPerPixel,
  orbit,
  orbitStep,
  pan,
  setAxisView,
  toggleCameraView,
  toggleProjection,
  viewEye,
  viewName,
  viewRight,
  viewUp,
  zoomSteps,
} from './view-state';

const SIZE = { width: 1600, height: 900 };
const CAM: CameraPose = {
  location: vec3(7.3589, -6.9258, 4.9583),
  rotation: fromEulerXYZ(vec3(63.559 * DEG, 0, 46.692 * DEG)),
};
const CAM_DATA: SceneCameraData = { lens: 50, sensorWidth: 36, resolutionX: 1920, resolutionY: 1080 };

const expectVec = (a: Vec3, b: Vec3, digits = 6) => {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
};

const base = (): ViewState => ({ ...defaultViewState(), target: vec3(0, 0, 0), distance: 10 });

describe('axis views', () => {
  const cases: [AxisView, Vec3, Vec3, Vec3][] = [
    // axis, eye direction, screen right, screen up
    ['front', vec3(0, -1, 0), vec3(1, 0, 0), vec3(0, 0, 1)],
    ['back', vec3(0, 1, 0), vec3(-1, 0, 0), vec3(0, 0, 1)],
    ['right', vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)],
    ['left', vec3(-1, 0, 0), vec3(0, -1, 0), vec3(0, 0, 1)],
    ['top', vec3(0, 0, 1), vec3(1, 0, 0), vec3(0, 1, 0)],
    ['bottom', vec3(0, 0, -1), vec3(1, 0, 0), vec3(0, -1, 0)],
  ];
  for (const [axis, eyeDir, right, up] of cases) {
    it(`${axis}: eye, right and up match Blender`, () => {
      const s = setAxisView(base(), axis);
      expectVec(viewEye(s), vec3(eyeDir.x * 10, eyeDir.y * 10, eyeDir.z * 10));
      expectVec(viewRight(s), right);
      expectVec(viewUp(s), up);
      expect(matchAxisView(s.rotation)).toBe(axis);
    });
  }

  it('names the views like the viewport header text', () => {
    expect(viewName(base())).toBe('User Perspective');
    expect(viewName(setAxisView(base(), 'front'))).toBe('Front Orthographic');
    expect(viewName(setAxisView(base(), 'left'))).toBe('Left Orthographic');
    expect(viewName(toggleProjection(base()))).toBe('User Orthographic');
    expect(viewName(toggleCameraView(base(), true))).toBe('Camera Perspective');
  });
});

describe('Auto Perspective', () => {
  it('goes orthographic in an axis view and back to perspective when orbiting', () => {
    const front = setAxisView(base(), 'front');
    expect(front.projection).toBe('orthographic');
    const orbited = orbit(front, 10, 0, null);
    expect(viewName(orbited)).toBe('User Perspective');
  });

  it('remembers the projection across several axis views', () => {
    let s = setAxisView(base(), 'front');
    s = setAxisView(s, 'right');
    s = setAxisView(s, 'top');
    expect(viewName(orbit(s, 0, 10, null))).toBe('User Perspective');
  });

  it('keeps orthographic if the view was already orthographic before the axis view', () => {
    const s = setAxisView(toggleProjection(base()), 'front');
    expect(viewName(orbit(s, 10, 0, null))).toBe('User Orthographic');
  });

  it('Numpad 5 in an axis view keeps the axis view name', () => {
    const s = toggleProjection(setAxisView(base(), 'front'));
    expect(viewName(s)).toBe('Front Perspective');
    expect(viewName(orbit(s, 10, 0, null))).toBe('User Perspective');
  });
});

describe('orbit', () => {
  it('keeps target and distance', () => {
    const s = orbit(base(), 123, -45, null);
    expectVec(s.target, vec3(0, 0, 0));
    expect(length(viewEye(s))).toBeCloseTo(10, 9);
  });

  it('turns 0.4° per pixel around global Z (turntable)', () => {
    const front = setAxisView(base(), 'front');
    const s = orbit(front, 225, 0, null); // 225 px * 0.4° = 90°
    // Grab metaphor: dragging right moves the eye towards -X.
    expectVec(viewEye(s), vec3(-10, 0, 0));
    expectVec(viewUp(s), vec3(0, 0, 1));
  });

  it('dragging up shows the underside (eye goes down)', () => {
    const front = setAxisView(base(), 'front');
    const s = orbit(front, 0, -225, null);
    expectVec(viewEye(s), vec3(0, 0, -10));
  });

  it('Numpad steps rotate 15° and snap to axis views', () => {
    let s = setAxisView(base(), 'front');
    s = orbitStep(s, 'right', null);
    expect(viewName(s)).toBe('User Perspective');
    for (let i = 0; i < 5; i++) s = orbitStep(s, 'right', null);
    expect(viewName(s)).toBe('Left Orthographic');
    for (let i = 0; i < 6; i++) s = orbitStep(s, 'left', null);
    expect(viewName(s)).toBe('Front Orthographic');
    for (let i = 0; i < 6; i++) s = orbitStep(s, 'up', null);
    expect(viewName(s)).toBe('Bottom Orthographic');
  });

  it('orbiting out of the camera view starts from the camera position', () => {
    const inCam = toggleCameraView(base(), true);
    const s = orbit(inCam, 0.0001, 0, CAM);
    expect(s.camera).toBeNull();
    expectVec(viewEye(s), CAM.location, 4);
    expect(viewName(s)).toBe('User Perspective');
  });
});

describe('pan and zoom', () => {
  it('pans so the scene follows the mouse', () => {
    const s0 = setAxisView(base(), 'front');
    const k = metresPerPixel(s0, SIZE);
    const s = pan(s0, 100, 50, SIZE, null);
    // Dragging right/down moves the target left/up (the scene moves right/down).
    expectVec(sub(s.target, s0.target), vec3(-100 * k, 0, 50 * k));
  });

  it('zooms 1.2x per wheel step and clamps', () => {
    expect(zoomSteps(base(), 1).distance).toBeCloseTo(10 / 1.2, 9);
    expect(zoomSteps(base(), -2).distance).toBeCloseTo(10 * 1.44, 9);
    expect(zoomSteps(base(), 1000).distance).toBeCloseTo(0.015, 9);
  });
});

describe('frameBounds', () => {
  it('centres on the bounds and fits them with Blender margin', () => {
    const s = frameBounds(base(), { min: vec3(2, 2, 0), max: vec3(4, 4, 2) }, SIZE, null);
    expectVec(s.target, vec3(3, 3, 1));
    expect(s.distance).toBeCloseTo((1 * 1.4) / minHalfTangent(SIZE), 9);
  });

  it('keeps the view orientation', () => {
    const s0 = orbit(base(), 50, 20, null);
    const s = frameBounds(s0, { min: vec3(-1, -1, -1), max: vec3(1, 1, 1) }, SIZE, null);
    expect(s.rotation).toEqual(s0.rotation);
  });

  it('only re-centres on a single point', () => {
    const s = frameBounds(base(), { min: vec3(5, 0, 0), max: vec3(5, 0, 0) }, SIZE, null);
    expectVec(s.target, vec3(5, 0, 0));
    expect(s.distance).toBe(10);
  });
});

describe('camera view', () => {
  it('toggles and restores the previous view', () => {
    const s0 = orbit(base(), 50, 20, null);
    const inCam = toggleCameraView(s0, true);
    expect(inCam.camera).not.toBeNull();
    const back = toggleCameraView(inCam, true);
    expect(back).toEqual(s0);
  });

  it('does nothing without a camera', () => {
    expect(toggleCameraView(base(), false).camera).toBeNull();
  });

  it('camzoom <-> factor round trip; camzoom 0 is factor 0.5', () => {
    expect(cameraZoomToFactor(0)).toBeCloseTo(0.5, 12);
    expect(cameraZoomFromFactor(cameraZoomToFactor(37))).toBeCloseTo(37, 9);
  });

  it('camzoom 0 shows the camera frame at half the viewport width', () => {
    const r = cameraFrameRect({ zoom: 0, offsetX: 0, offsetY: 0 }, CAM_DATA, SIZE);
    expect(r.width).toBeCloseTo(SIZE.width / 2, 6);
    expect(r.x + r.width / 2).toBeCloseTo(SIZE.width / 2, 6);
  });

  it('Home fits the camera frame with a 2 px margin', () => {
    const s = fitCameraFrame(toggleCameraView(base(), true), CAM_DATA, SIZE);
    const r = cameraFrameRect(s.camera!, CAM_DATA, SIZE);
    // The tighter side (here the height) ends 2 px from each edge; the other fits inside.
    expect(r.height).toBeCloseTo(SIZE.height - 4, 3);
    expect(r.width).toBeLessThanOrEqual(SIZE.width - 4);
  });

  it('wheel zoom scales the camera frame instead of moving the view', () => {
    const inCam = toggleCameraView(base(), true);
    const z = zoomSteps(inCam, 1);
    expect(z.distance).toBe(inCam.distance);
    const r0 = cameraFrameRect(inCam.camera!, CAM_DATA, SIZE);
    const r1 = cameraFrameRect(z.camera!, CAM_DATA, SIZE);
    expect(r1.width / r0.width).toBeCloseTo(1.2, 6);
  });
});

it('identity rotation is the Top view', () => {
  expect(matchAxisView(IDENTITY)).toBe('top');
  expect(matchAxisView(fromAxisAngle(AXIS_Z, 1 * DEG))).toBeNull();
});
