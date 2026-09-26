/**
 * Status bar hints (left side), as Blender shows them for the current context.
 * FIDELITY? Exact texts in 5.2.
 */
export type StatusMode = 'idle' | 'boxModal';

type Button = 'left' | 'middle' | 'right';

const MOUSE_ICON = (button: Button) => {
  const fill = { left: 'M2 1h3v5H2z', middle: 'M4.5 2h1v3h-1z', right: 'M5 1h3v5H5z' }[button];
  return `<svg class="bl-mouse-icon" viewBox="0 0 10 15"><rect x="1" y="1" width="8" height="13" rx="4" fill="none" stroke="currentColor"/><path d="${fill}" fill="currentColor"/></svg>`;
};

const HINTS: Record<StatusMode, [Button, string][]> = {
  idle: [
    ['left', 'Select'],
    ['middle', 'Rotate View'],
    ['right', 'Object Context Menu'],
  ],
  boxModal: [
    ['left', 'Select'],
    ['middle', 'Deselect'],
    ['right', 'Cancel'],
  ],
};

export class StatusBar {
  private mode: StatusMode | null = null;

  constructor(private readonly left: HTMLElement) {
    this.set('idle');
  }

  set(mode: StatusMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.left.innerHTML = HINTS[mode]
      .map(([b, label]) => `<span class="bl-status-item">${MOUSE_ICON(b)}${label}</span>`)
      .join('');
  }
}
