/**
 * 2D overlays drawn over the 3D viewport with the DOM: the view name text, the
 * "(1) Collection | Object" line and the camera frame with its passepartout.
 */
import { type SceneState, activeCamera, activeObject, cameraData } from '../scene/scene';
import type { FrameInfo } from '../viewport/renderer';
import type { ViewState } from '../viewport/view-state';
import { cameraFrameRect, viewName } from '../viewport/view-state';

export class ViewportOverlay {
  private readonly text: HTMLDivElement;
  private readonly nameLine: HTMLDivElement;
  private readonly contextLine: HTMLDivElement;
  private readonly cameraFrame: HTMLDivElement;
  private readonly box: HTMLDivElement;
  private readonly crossH: HTMLDivElement;
  private readonly crossV: HTMLDivElement;

  constructor(viewport: HTMLElement) {
    this.text = document.createElement('div');
    this.text.className = 'bl-view-text';
    this.nameLine = document.createElement('div');
    this.contextLine = document.createElement('div');
    this.text.append(this.nameLine, this.contextLine);

    this.cameraFrame = document.createElement('div');
    this.cameraFrame.className = 'bl-camera-frame';
    this.cameraFrame.hidden = true;

    this.box = document.createElement('div');
    this.box.className = 'bl-select-box';
    this.box.hidden = true;
    this.crossH = document.createElement('div');
    this.crossH.className = 'bl-crosshair bl-crosshair-h';
    this.crossV = document.createElement('div');
    this.crossV.className = 'bl-crosshair bl-crosshair-v';
    this.crossH.hidden = this.crossV.hidden = true;

    viewport.append(this.cameraFrame, this.text, this.box, this.crossH, this.crossV);
  }

  /** Box select rectangle (dashed), or null to hide it. */
  setBox(rect: { x: number; y: number; width: number; height: number } | null): void {
    this.box.hidden = rect === null;
    if (rect) {
      Object.assign(this.box.style, {
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    }
  }

  /** Crosshair shown while B waits for the drag. FIDELITY? */
  setCrosshair(p: { x: number; y: number } | null): void {
    this.crossH.hidden = this.crossV.hidden = p === null;
    if (p) {
      this.crossH.style.top = `${p.y}px`;
      this.crossV.style.left = `${p.x}px`;
    }
  }

  update(info: FrameInfo, state: ViewState, scene: SceneState): void {
    // The text follows the logical state, so it changes as soon as a key is pressed.
    this.nameLine.textContent = viewName(state);
    // FIDELITY? "(1)" is the current frame; the collection is the active object's one.
    const active = activeObject(scene);
    this.contextLine.textContent = `(1) Collection${active ? ` | ${active.name}` : ''}`;

    const cam = activeCamera(scene);
    if (info.view.camera && cam) {
      const r = cameraFrameRect(info.view.camera, cameraData(scene, cam), info.size);
      Object.assign(this.cameraFrame.style, {
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      this.cameraFrame.hidden = false;
    } else {
      this.cameraFrame.hidden = true;
    }
  }
}
