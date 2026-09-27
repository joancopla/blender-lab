/**
 * Runs a modal operator in the app (G/R/S, Extrude, Inset, Bevel, Loop Cut...):
 * feeds it with input, shows its preview through the store, and records the
 * result (confirm) or the cancellation.
 */
import type { Modifiers } from './input/keymap';
import type { ModalHandler } from './input/viewport-input';
import type { Guides, ModalResult } from './operators/transform';
import type { SceneState } from './scene/scene';
import type { SceneStore } from './scene/store';
import type { StatusBar, StatusMode } from './ui/status-bar';
import type { TransformGuides } from './ui/transform-guides';
import type { ViewportRenderer } from './viewport/renderer';

/** What the session needs from a modal operator. TransformModal is one. */
export interface ModalOperator {
  readonly operatorName: string;
  readonly preview: SceneState;
  readonly header: string;
  readonly guides: Guides | null;
  mouseMove(x: number, y: number): void;
  setModifiers(ctrl: boolean, shift: boolean): void;
  key(code: string, shift: boolean): ModalResult;
  button(button: number): ModalResult;
  /** Mouse wheel during the operator (segments, number of cuts...). */
  wheel?(steps: number): void;
  /**
   * State to record when cancelled. Undefined: nothing is recorded (the scene
   * goes back to how it was). Extrude keeps the new geometry, as in Blender.
   */
  readonly cancelState?: SceneState;
  /** Status bar hints while running. */
  readonly statusMode?: StatusMode;
  /** Called after confirming, with the recorded state (Adjust Last Operation). */
  onConfirmed?(state: SceneState): void;
}

export interface TransformSessionDeps {
  readonly store: SceneStore;
  readonly view: ViewportRenderer;
  readonly status: StatusBar;
  readonly guides: TransformGuides;
  readonly header: HTMLElement;
  readonly headerText: HTMLElement;
  /** Called when the operator ends (to restore other UI). */
  onEnd(): void;
}

export class TransformSession implements ModalHandler {
  private ended = false;

  private constructor(
    private readonly deps: TransformSessionDeps,
    private readonly modal: ModalOperator,
  ) {}

  static start(deps: TransformSessionDeps, modal: ModalOperator, mods: Modifiers): TransformSession {
    modal.setModifiers(mods.ctrl, mods.shift);
    const session = new TransformSession(deps, modal);
    deps.header.classList.add('is-modal');
    deps.headerText.hidden = false;
    deps.status.set(modal.statusMode ?? 'transform');
    session.refresh();
    return session;
  }

  pointerMove(x: number, y: number, mods: Modifiers): void {
    this.modal.setModifiers(mods.ctrl, mods.shift);
    this.modal.mouseMove(x, y);
    this.refresh();
  }

  pointerDown(button: number): void {
    this.finish(this.modal.button(button), 'rightClick');
    if (button === 1) this.refresh();
  }

  keyDown(code: string, mods: Modifiers): void {
    this.modal.setModifiers(mods.ctrl, mods.shift);
    this.finish(this.modal.key(code, mods.shift), 'escape');
    this.refresh();
  }

  keyUp(mods: Modifiers): void {
    this.modal.setModifiers(mods.ctrl, mods.shift);
    this.refresh();
  }

  wheel(steps: number): void {
    this.modal.wheel?.(steps);
    this.refresh();
  }

  private refresh(): void {
    if (this.ended) return;
    const { store, view, guides, headerText } = this.deps;
    store.setPreview(this.modal.preview);
    headerText.textContent = this.modal.header;
    guides.update(this.modal.guides, view.frame.projection, view.viewportSize);
  }

  private finish(result: ModalResult, cancelVia: 'rightClick' | 'escape'): void {
    if (!result || this.ended) return;
    this.ended = true;
    const { store, header, headerText, status, guides, view } = this.deps;
    const name = this.modal.operatorName;
    if (result === 'confirm') {
      const final = this.modal.preview;
      store.execute({ name, apply: () => final });
      this.modal.onConfirmed?.(final);
    } else if (this.modal.cancelState) {
      const kept = this.modal.cancelState;
      store.execute({ name, apply: () => kept });
      store.log.push({ kind: 'cancel', name, via: cancelVia });
    } else {
      // The original state was never replaced: dropping the preview restores it exactly.
      store.logCancel(name, cancelVia);
    }
    header.classList.remove('is-modal');
    headerText.hidden = true;
    status.set('idle');
    guides.update(null, null, view.viewportSize);
    this.deps.onEnd();
  }
}
