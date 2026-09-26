/**
 * Runs a modal transform in the app: feeds the TransformModal with input, shows
 * its preview through the store, and records the result (confirm) or a cancel
 * entry in the log.
 */
import type { Modifiers } from './input/keymap';
import type { ModalHandler } from './input/viewport-input';
import { type ModalResult, type TransformKind, TransformModal } from './operators/transform';
import type { SceneStore } from './scene/store';
import type { StatusBar } from './ui/status-bar';
import type { TransformGuides } from './ui/transform-guides';
import type { ViewportRenderer } from './viewport/renderer';

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
  private constructor(
    private readonly deps: TransformSessionDeps,
    private readonly modal: TransformModal,
  ) {}

  /** Starts G/R/S at the mouse position; null if it cannot start (nothing selected). */
  static start(
    deps: TransformSessionDeps,
    kind: TransformKind,
    mouse: { x: number; y: number },
    mods: Modifiers,
  ): TransformSession | null {
    const frame = deps.view.frame;
    if (!TransformModal.canStart(deps.store.state)) return null;
    const modal = new TransformModal(kind, deps.store.state, frame.projection, frame.size, mouse);
    modal.setModifiers(mods.ctrl, mods.shift);
    const session = new TransformSession(deps, modal);
    deps.header.classList.add('is-modal');
    deps.headerText.hidden = false;
    deps.status.set('transform');
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

  private ended = false;

  private refresh(): void {
    if (this.ended) return;
    const { store, view, guides, headerText } = this.deps;
    store.setPreview(this.modal.preview);
    headerText.textContent = this.modal.header;
    const frame = view.frame;
    guides.update(this.modal.guides, frame.projection, view.viewportSize);
  }

  private finish(result: ModalResult, cancelVia: 'rightClick' | 'escape'): void {
    if (!result || this.ended) return;
    this.ended = true;
    const { store, header, headerText, status, guides, view } = this.deps;
    if (result === 'confirm') {
      const final = this.modal.preview;
      store.execute({ name: this.modal.operatorName, apply: () => final });
    } else {
      // The original state was never replaced: dropping the preview restores it exactly.
      store.logCancel(this.modal.operatorName, cancelVia);
    }
    header.classList.remove('is-modal');
    headerText.hidden = true;
    status.set('idle');
    guides.update(null, null, view.viewportSize);
    this.deps.onEnd();
  }
}
