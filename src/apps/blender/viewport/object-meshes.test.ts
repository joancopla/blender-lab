import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { blenderDefaultScene } from '../scene/default-scene';
import { buildObject } from './object-meshes';

describe('mesh object material', () => {
  it('uses the geometry normals (flatShading would hide Shade Smooth)', () => {
    const cube = blenderDefaultScene().objects.find((o) => o.id === 'cube')!;
    const mesh = buildObject(cube, false, 1) as THREE.Mesh;
    const material = mesh.material as THREE.MeshPhongMaterial;
    expect(material.flatShading).toBe(false);
  });
});
