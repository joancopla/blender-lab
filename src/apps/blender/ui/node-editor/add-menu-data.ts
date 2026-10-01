/**
 * Shift+A in the Shader Editor, as Blender 5.2.1 draws it for an object material with EEVEE
 * (the default engine): scripts/startup/bl_ui/node_add_menu_shader.py, labels from each node's
 * ui_name. Items whose poll is false there are left out, as Blender hides them. The nodes the lab
 * implements can be added; the rest are shown disabled.
 * Generated from the Blender source; edit with care.
 */
import type { Props } from '../../shading/node-types';

export type AddMenuEntry =
 | { readonly kind: 'node'; readonly type: string; readonly label: string; readonly props?: Props }
 | { readonly kind: 'off'; readonly label: string }
 | { readonly kind: 'menu'; readonly label: string }
 | { readonly kind: 'separator' };

const node = (type: string, label: string, props?: Props): AddMenuEntry => ({ kind: 'node', type, label, ...(props ? { props } : {}) });
const off = (label: string): AddMenuEntry => ({ kind: 'off', label });
const sub = (label: string): AddMenuEntry => ({ kind: 'menu', label });
const SEP: AddMenuEntry = { kind: 'separator' };

export const ADD_MENUS: Readonly<Record<string, readonly AddMenuEntry[]>> = {
  "Constant": [
    off("Boolean"),
    node("ShaderNodeRGB", "Color"),
    off("Integer"),
    off("Menu"),
    node("ShaderNodeValue", "Value"),
    off("Vector"),
  ],
  "Input": [
    sub("Constant"),
    SEP,
    off("Ambient Occlusion"),
    off("Attribute"),
    off("Bevel"),
    off("Camera Data"),
    off("Color Attribute"),
    off("Curves Info"),
    off("Fresnel"),
    off("Geometry"),
    off("Layer Weight"),
    off("Light Path"),
    off("Object Info"),
    off("Particle Info"),
    off("Point Info"),
    off("Raycast"),
    off("Scene Time"),
    off("Tangent"),
    node("ShaderNodeTexCoord", "Texture Coordinate"),
    off("UV Map"),
    off("Volume Info"),
    off("Wireframe"),
  ],
  "Output": [
    off("AOV Output"),
    node("ShaderNodeOutputMaterial", "Material Output"),
  ],
  "Shader": [
    off("Add Shader"),
    node("ShaderNodeMixShader", "Mix Shader"),
    SEP,
    off("Diffuse BSDF"),
    node("ShaderNodeEmission", "Emission"),
    off("Glass BSDF"),
    off("Glossy BSDF"),
    off("Holdout"),
    off("Metallic BSDF"),
    node("ShaderNodeBsdfPrincipled", "Principled BSDF"),
    off("Refraction BSDF"),
    off("Specular BSDF"),
    off("Subsurface Scattering"),
    off("Translucent BSDF"),
    off("Transparent BSDF"),
    SEP,
    off("Principled Volume"),
    off("Volume Absorption"),
    off("Volume Scatter"),
    off("Volume Coefficients"),
  ],
  "Displacement": [
    node("ShaderNodeBump", "Bump"),
    off("Displacement"),
    node("ShaderNodeNormalMap", "Normal Map"),
    off("Vector Displacement"),
  ],
  "Color": [
    off("Blackbody"),
    off("Brightness/Contrast"),
    node("ShaderNodeValToRGB", "Color Ramp"),
    off("Gamma"),
    off("Hue/Saturation/Value"),
    off("Invert Color"),
    off("Light Falloff"),
    node('ShaderNodeMix', 'Mix Color', { data_type: 'RGBA' }),
    off("RGB Curves"),
    off("Wavelength"),
    SEP,
    off("Combine Color"),
    off("Separate Color"),
    SEP,
    off("RGB to BW"),
    off("Shader to RGB"),
  ],
  "Texture": [
    off("Brick Texture"),
    node("ShaderNodeTexChecker", "Checker Texture"),
    off("Environment Texture"),
    off("Gabor Texture"),
    off("Gradient Texture"),
    off("IES Texture"),
    node("ShaderNodeTexImage", "Image Texture"),
    off("Magic Texture"),
    node("ShaderNodeTexNoise", "Noise Texture"),
    off("Sky Texture"),
    off("Voronoi Texture"),
    node("ShaderNodeTexWave", "Wave Texture"),
    off("White Noise Texture"),
  ],
  "Math": [
    off("Clamp"),
    off("Float Curve"),
    off("Map Range"),
    off("Math"),
    off("Mix"),
  ],
  "Vector": [
    off("Combine XYZ"),
    off("Map Range"),
    off("Mix Vector"),
    off("Separate XYZ"),
    SEP,
    node("ShaderNodeMapping", "Mapping"),
    off("Normal"),
    off("Radial Tiling"),
    off("Vector Curves"),
    off("Vector Math"),
    off("Vector Rotate"),
    off("Vector Transform"),
  ],
  "Utilities": [
    sub("Math"),
    sub("Vector"),
    SEP,
    off("Repeat"),
    SEP,
    off("Implicit Conversion"),
    off("Closure"),
    off("Evaluate Closure"),
    off("Combine Bundle"),
    off("Separate Bundle"),
    off("Join Bundle"),
    SEP,
    off("Menu Switch"),
    SEP,
  ],
};

/** The top level of Shift+A (Group and Layout are not part of the lab). */
export const ADD_MENU_ROOT: readonly AddMenuEntry[] = [sub('Input'), sub('Output'), SEP, sub('Shader'), sub('Displacement'), SEP, sub('Color'), sub('Texture'), sub('Utilities'), SEP, off('Group'), off('Layout')];
