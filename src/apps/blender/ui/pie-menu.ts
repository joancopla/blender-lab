/**
 * Blender's pie menus (Z: Viewport Shading): items around the pointer in the
 * eight directions. Moving the pointer away from the centre highlights the
 * item in that direction; a click picks it (or picks the item clicked). Esc, a
 * right click or a click in the centre closes it.
 * FIDELITY? Blender also picks the item when the key is released after a drag.
 */
export type PieDirection = 'W' | 'E' | 'S' | 'N' | 'NW' | 'NE' | 'SW' | 'SE';

export interface PieItem {
  readonly label: string;
  readonly direction: PieDirection;
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly action?: () => void;
}

/** Angle of each direction, degrees, counter-clockwise from East (screen Y down). */
const ANGLES: Record<PieDirection, number> = { E: 0, NE: 45, N: 90, NW: 135, W: 180, SW: 225, S: 270, SE: 315 };
const RADIUS = 110;
const DEAD_ZONE = 18;

let openPie: { close(): void } | null = null;

export function openPieMenu(host: HTMLElement, x: number, y: number, items: readonly PieItem[], title?: string): void {
  openPie?.close();
  const layer = document.createElement('div');
  layer.className = 'bl-pie';
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  const centre = document.createElement('div');
  centre.className = 'bl-pie-centre';
  layer.append(centre);
  if (title) {
    const t = document.createElement('div');
    t.className = 'bl-pie-title';
    t.textContent = title;
    layer.append(t);
  }
  const buttons = items.map((item) => {
    const a = (ANGLES[item.direction] * Math.PI) / 180;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bl-pie-item';
    b.textContent = item.label;
    b.disabled = item.disabled ?? false;
    b.classList.toggle('is-checked', item.checked ?? false);
    b.style.left = `${Math.cos(a) * RADIUS}px`;
    b.style.top = `${-Math.sin(a) * RADIUS}px`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    layer.append(b);
    return { item, b };
  });
  host.append(layer);

  let highlighted: (typeof buttons)[number] | null = null;
  const onMove = (e: PointerEvent) => {
    const r = layer.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    let best: (typeof buttons)[number] | null = null;
    if (Math.hypot(dx, dy) > DEAD_ZONE) {
      const angle = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360;
      let bestDiff = Infinity;
      for (const entry of buttons) {
        if (entry.item.disabled) continue;
        const diff = Math.abs(((angle - ANGLES[entry.item.direction] + 540) % 360) - 180);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = entry;
        }
      }
    }
    for (const entry of buttons) entry.b.classList.toggle('is-highlighted', entry === best);
    highlighted = best;
  };
  const onDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clicked = buttons.find((entry) => entry.b.contains(e.target as Node));
    const pick = e.button === 0 ? (clicked && !clicked.item.disabled ? clicked : highlighted) : null;
    close();
    pick?.item.action?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };
  const onContext = (e: Event) => e.preventDefault();
  const close = () => {
    layer.remove();
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('contextmenu', onContext, true);
    if (openPie === handle) openPie = null;
  };
  const handle = { close };
  openPie = handle;
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('contextmenu', onContext, true);
}
