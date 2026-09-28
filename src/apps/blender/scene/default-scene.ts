import { vec3 } from '../math/vec3';
import type { SceneState } from './scene';

/**
 * Blender's default startup scene: Cube, Camera and Light.
 * FIDELITY? Values from the 2.8–4.x startup file; to confirm in 5.2.
 */
export function blenderDefaultScene(): SceneState {
  return {
    objects: [
      {
        id: 'camera',
        name: 'Camera',
        type: 'camera',
        location: vec3(7.3589, -6.9258, 4.9583),
        rotationDeg: vec3(63.559, 0, 46.692),
        scale: vec3(1, 1, 1),
        lens: 50,
        sensorWidth: 36,
      },
      {
        id: 'cube',
        name: 'Cube',
        type: 'mesh',
        primitive: 'cube',
        location: vec3(0, 0, 0),
        rotationDeg: vec3(0, 0, 0),
        scale: vec3(1, 1, 1),
      },
      {
        id: 'light',
        name: 'Light',
        type: 'light',
        lightType: 'POINT',
        location: vec3(4.0762, 1.0055, 5.9039),
        rotationDeg: vec3(37.261, 3.1637, 106.94),
        scale: vec3(1, 1, 1),
      },
    ],
    selectedIds: ['cube'],
    activeId: 'cube',
    activeCameraId: 'camera',
    render: { resolutionX: 1920, resolutionY: 1080 },
  };
}
