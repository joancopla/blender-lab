/**
 * Properties > Object Data of a light: the Light panel. Type buttons, Color,
 * Power (Strength for the Sun), Radius (Angle for the Sun), the Spot's cone,
 * the Area's shape and size, and Cast Shadow.
 * FIDELITY? Layout and labels in Blender 5.2 (it depends on the render engine:
 * EEVEE and Cycles show different extra settings); the Spot subpanel name.
 */
import { type LightData, type LightObject, type LightType, type SceneState, lightData } from '../../scene/scene';
import type { SceneStore } from '../../scene/store';
import { type LightPatch, SetLightOp, SetLightTypeOp, setLight } from '../../operators/light';
import { formatAngle, formatDistance } from '../format';
import {
  type Widget,
  checkboxWidget,
  colorWidget,
  dropdownWidget,
  numberWidget,
  segmentedWidget,
  subpanelWidget,
} from './widgets';

const watts = (v: number) => `${Math.round(v * 10) / 10} W`;
const plain = (digits: number) => (v: number) => v.toFixed(digits);

/** Shows `w` only while `visible()` is true. */
function when(visible: () => boolean, w: Widget): Widget {
  return {
    element: w.element,
    update: () => {
      w.element.hidden = !visible();
      w.update();
    },
    dispose: w.dispose,
  };
}

export function lightWidgets(
  store: SceneStore,
  id: string,
  subpanel: (key: string, openByDefault: boolean) => { get(): boolean; set(v: boolean): void },
): Widget[] {
  const data = (): LightData => {
    const o = store.displayState.objects.find((x) => x.id === id);
    return lightData(o as LightObject);
  };
  const type = () => data().lightType;
  const set = (patch: LightPatch, label: string) => store.execute(SetLightOp(id, patch, label));
  const preview = (patch: LightPatch | null) => store.setPreview(patch ? setLight(store.state, id, patch) : null);
  const num = (
    label: string | (() => string),
    field: 'energy' | 'shadowSoftSize' | 'angleDeg' | 'spotSizeDeg' | 'spotBlend' | 'size' | 'sizeY',
    format: (v: number) => string,
    dragStep: number,
    snapStep: number,
    min?: number,
    max?: number,
  ): Widget => {
    const text = typeof label === 'function' ? label : () => label;
    const w = numberWidget({
      label: text(),
      get: () => data()[field],
      preview: (v) => preview(v === null ? null : { [field]: v }),
      commit: (v) => set({ [field]: v }, text()),
      format,
      dragStep,
      snapStep,
      min,
      max,
    });
    // The label can change with the type (Power / Strength).
    return {
      element: w.element,
      update: () => {
        const l = w.element.querySelector('.bl-mp-label');
        if (l) l.textContent = text();
        w.update();
      },
      dispose: w.dispose,
    };
  };
  const isSun = () => type() === 'SUN';

  const spot = subpanelWidget('Spot Shape', subpanel('spot', true), [
    num('Size', 'spotSizeDeg', formatAngle, 1, 5, 1, 180),
    num('Blend', 'spotBlend', plain(3), 0.01, 0.1, 0, 1),
  ]);
  const rectangle = () => data().shape === 'RECTANGLE' || data().shape === 'ELLIPSE';

  return [
    segmentedWidget<LightType>(
      '',
      [
        { value: 'POINT', label: 'Point' },
        { value: 'SUN', label: 'Sun' },
        { value: 'SPOT', label: 'Spot' },
        { value: 'AREA', label: 'Area' },
      ],
      type,
      (v) => store.execute(SetLightTypeOp(id, v)),
    ),
    colorWidget(
      'Color',
      () => data().color,
      (v) => preview(v ? { color: v } : null),
      (v) => set({ color: v }, 'Color'),
    ),
    num(() => (isSun() ? 'Strength' : 'Power'), 'energy', (v) => (isSun() ? plain(2)(v) : watts(v)), 10, 100, 0),
    when(() => !isSun() && type() !== 'AREA', num('Radius', 'shadowSoftSize', formatDistance, 0.01, 0.1, 0)),
    when(isSun, num('Angle', 'angleDeg', formatAngle, 0.1, 1, 0, 180)),
    when(
      () => type() === 'AREA',
      dropdownWidget(
        'Shape',
        [
          { value: 'SQUARE', label: 'Square' },
          { value: 'RECTANGLE', label: 'Rectangle' },
          { value: 'DISK', label: 'Disk' },
          { value: 'ELLIPSE', label: 'Ellipse' },
        ] as const,
        () => data().shape,
        (v) => set({ shape: v }, 'Shape'),
      ),
    ),
    when(() => type() === 'AREA', num(() => (rectangle() ? 'Size X' : 'Size'), 'size', formatDistance, 0.01, 0.1, 0)),
    when(() => type() === 'AREA' && rectangle(), num('Y', 'sizeY', formatDistance, 0.01, 0.1, 0)),
    when(() => type() === 'SPOT', spot),
    checkboxWidget('Cast Shadow', () => data().useShadow, (v) => set({ useShadow: v }, 'Cast Shadow')),
  ];
}

/** Whether the active object is a light (the Data tab then shows the Light panel). */
export const activeLight = (s: SceneState): LightObject | null => {
  const o = s.objects.find((x) => x.id === s.activeId);
  return o?.type === 'light' ? o : null;
};
