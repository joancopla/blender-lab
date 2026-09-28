/**
 * Progressive rendering for Rendered shading: every frame renders one sample
 * (the lights moved over their surfaces, the camera moved by less than a
 * pixel) into a float target and blends it into a running average. The
 * average goes to the screen through the view transform (AgX / Standard);
 * the renderer then writes the surfaces' depth, so overlays drawn afterwards
 * are hidden by them as usual.
 *
 * Idea from cifog-lab (xavikai), labs/lighting/scene.js: soft shadows by
 * moving each light over its emitting surface and averaging.
 */
import * as THREE from 'three';

/** Samples before the image is considered finished. */
export const MAX_SAMPLES = 32;

const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const blendFragment = /* glsl */ `
  uniform sampler2D tSample;
  uniform float uWeight;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(tSample, vUv).rgb, uWeight);
  }
`;

const presentFragment = /* glsl */ `
  uniform sampler2D tAccum;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(tAccum, vUv).rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function fullscreenQuad(material: THREE.ShaderMaterial): { scene: THREE.Scene; camera: THREE.Camera } {
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { scene, camera: new THREE.Camera() };
}

export class Accumulator {
  private sample: THREE.WebGLRenderTarget;
  private accum: THREE.WebGLRenderTarget;
  private samples = 0;
  private readonly blendMaterial = new THREE.ShaderMaterial({
    uniforms: { tSample: { value: null }, uWeight: { value: 1 } },
    vertexShader: quadVertex,
    fragmentShader: blendFragment,
    transparent: true,
    blending: THREE.NormalBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  private readonly presentMaterial = new THREE.ShaderMaterial({
    uniforms: { tAccum: { value: null } },
    vertexShader: quadVertex,
    fragmentShader: presentFragment,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  private readonly blendQuad = fullscreenQuad(this.blendMaterial);
  private readonly presentQuad = fullscreenQuad(this.presentMaterial);

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.sample = this.makeTarget(1, 1, true);
    this.accum = this.makeTarget(1, 1, false);
  }

  private makeTarget(w: number, h: number, depth: boolean): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: depth });
  }

  /** Number of samples averaged so far. */
  get count(): number {
    return this.samples;
  }

  get finished(): boolean {
    return this.samples >= MAX_SAMPLES;
  }

  reset(): void {
    this.samples = 0;
  }

  /** Matches the drawing buffer size (resets when it changes). */
  setSize(width: number, height: number): void {
    if (this.sample.width === width && this.sample.height === height) return;
    this.sample.setSize(width, height);
    this.accum.setSize(width, height);
    this.reset();
  }

  /** Renders one more sample with `draw` (into the sample target) and averages it in. */
  addSample(draw: () => void): void {
    const r = this.renderer;
    const previous = r.getRenderTarget();
    r.setRenderTarget(this.sample);
    r.clear();
    draw();
    r.setRenderTarget(this.accum);
    // accum = accum · (1 - w) + sample · w, with w = 1 / (n + 1).
    this.blendMaterial.uniforms.tSample!.value = this.sample.texture;
    this.blendMaterial.uniforms.uWeight!.value = 1 / (this.samples + 1);
    if (this.samples === 0) r.clear();
    r.render(this.blendQuad.scene, this.blendQuad.camera);
    r.setRenderTarget(previous);
    this.samples++;
  }

  /** Draws the average to the current target (the screen), colour only. */
  present(): void {
    this.presentMaterial.uniforms.tAccum!.value = this.accum.texture;
    this.renderer.render(this.presentQuad.scene, this.presentQuad.camera);
  }
}

/** The i-th point of the Halton sequence in base b (0..1). */
export function halton(i: number, b: number): number {
  let f = 1;
  let r = 0;
  let n = i + 1;
  while (n > 0) {
    f /= b;
    r += f * (n % b);
    n = Math.floor(n / b);
  }
  return r;
}
