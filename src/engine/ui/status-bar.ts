/**
 * Status bar hints (left side), as Blender shows them for the current context.
 * FIDELITY? Exact texts and order in 5.2.
 */
export type StatusMode = 'idle' | 'boxModal' | 'transform';

type Button = 'left' | 'middle' | 'right';

interface Hint {
  readonly mouse?: Button;
  readonly keys?: readonly string[];
  readonly label: string;
}

const MOUSE_ICON = (button: Button) => {
  const fill = { left: 'M2 1h3v5H2z', middle: 'M4.5 2h1v3h-1z', right: 'M5 1h3v5H5z' }[button];
  return `<svg class="bl-mouse-icon" viewBox="0 0 10 15"><rect x="1" y="1" width="8" height="13" rx="4" fill="none" stroke="currentColor"/><path d="${fill}" fill="currentColor"/></svg>`;
};

const HINTS: Record<StatusMode, readonly Hint[]> = {
  idle: [
    { mouse: 'left', label: 'Select' },
    { mouse: 'middle', label: 'Rotate View' },
    { mouse: 'right', label: 'Object Context Menu' },
  ],
  boxModal: [
    { mouse: 'left', label: 'Select' },
    { mouse: 'middle', label: 'Deselect' },
    { mouse: 'right', label: 'Cancel' },
  ],
  transform: [
    { mouse: 'left', label: 'Confirm' },
    { mouse: 'right', label: 'Cancel' },
    { keys: ['X'], label: 'X Axis' },
    { keys: ['Y'], label: 'Y Axis' },
    { keys: ['Z'], label: 'Z Axis' },
    { keys: ['Shift', 'X'], label: 'X Plane' },
    { keys: ['Shift', 'Y'], label: 'Y Plane' },
    { keys: ['Shift', 'Z'], label: 'Z Plane' },
    { mouse: 'middle', label: 'Automatic Constraint' },
    { keys: ['Ctrl'], label: 'Snap Invert' },
    { keys: ['Shift'], label: 'Precision Mode' },
  ],
};

const escape = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export class StatusBar {
  private mode: StatusMode | null = null;

  constructor(private readonly left: HTMLElement) {
    this.set('idle');
  }

  set(mode: StatusMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.left.innerHTML = HINTS[mode]
      .map((h) => {
        const icon = h.mouse
          ? MOUSE_ICON(h.mouse)
          : (h.keys ?? []).map((k) => `<kbd class="bl-key">${escape(k)}</kbd>`).join('');
        return `<span class="bl-status-item">${icon}${escape(h.label)}</span>`;
      })
      .join('');
  }
}
