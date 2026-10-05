export interface PanelRect { x: number; y: number; width: number; height: number }
export interface PanelBounds {
  left: number; top: number; right: number; bottom: number;
  minWidth: number; minHeight: number;
}

export const COLLAPSED_PANEL_HEIGHT = 44;

/** Coordinates belong to the canvas overlay, including when side panels reduce its size. */
export function panelBounds(width: number, height: number, compact: boolean): PanelBounds {
  const margin = Math.min(16, width / 4, height / 4);
  const bottomSpace = Math.min(112, Math.max(margin, height - COLLAPSED_PANEL_HEIGHT - margin));
  const top = Math.min(compact ? 144 : 96, Math.max(margin, height - bottomSpace - 220));
  const right = width - margin;
  const bottom = height - bottomSpace;
  return { left: margin, top, right, bottom,
    minWidth: Math.min(260, right - margin), minHeight: Math.min(220, bottom - top) };
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));

export function fitPanel(rect: PanelRect, bounds: PanelBounds, collapsed = false): PanelRect {
  const width = clamp(rect.width, bounds.minWidth, bounds.right - bounds.left);
  const height = clamp(rect.height, bounds.minHeight, bounds.bottom - bounds.top);
  const visibleHeight = collapsed ? Math.min(COLLAPSED_PANEL_HEIGHT, height) : height;
  return { width, height,
    x: clamp(rect.x, bounds.left, bounds.right - width),
    y: clamp(rect.y, bounds.top, bounds.bottom - visibleHeight) };
}

export function defaultPanel(bounds: PanelBounds, compact: boolean, collapsed = false): PanelRect {
  const height = Math.min(compact ? 300 : 400, bounds.bottom - bounds.top);
  const visibleHeight = collapsed ? Math.min(COLLAPSED_PANEL_HEIGHT, height) : height;
  return fitPanel({ x: bounds.left, y: bounds.bottom - visibleHeight, width: 380, height }, bounds, collapsed);
}
