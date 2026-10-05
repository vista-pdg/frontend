import { describe, expect, it } from 'vitest';
import { defaultPanel, fitPanel, panelBounds } from './floatingPanel';

describe('floating code panel containment', () => {
  it('keeps an oversized, offscreen panel away from canvas and playback controls', () => {
    const bounds = panelBounds(1376, 836, false);
    const rect = fitPanel({ x: -800, y: 900, width: 5000, height: 9000 }, bounds);
    expect(rect.x).toBe(16);
    expect(rect.y).toBe(96);
    expect(rect.x + rect.width).toBe(1360);
    expect(rect.y + rect.height).toBe(724);
  });

  it('fits narrow and short canvases even when smaller than nominal minimums', () => {
    for (const [width, height] of [[240, 280], [326, 520], [704, 420]]) {
      const bounds = panelBounds(width, height, true);
      const rect = fitPanel({ x: 900, y: 900, width: 80, height: 50 }, bounds);
      expect(rect.x).toBeGreaterThanOrEqual(bounds.left);
      expect(rect.y).toBeGreaterThanOrEqual(bounds.top);
      expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.right);
      expect(rect.y + rect.height).toBeLessThanOrEqual(bounds.bottom);
    }
  });

  it('remembers the expanded height while allowing a collapsed header near the bottom', () => {
    const bounds = panelBounds(1376, 836, false);
    const original = { x: 200, y: 680, width: 500, height: 400 };
    const collapsed = fitPanel(original, bounds, true);
    expect(collapsed.height).toBe(400);
    expect(collapsed.y).toBe(680);
    const expanded = fitPanel(collapsed, bounds);
    expect(expanded.height).toBe(400);
    expect(expanded.y + expanded.height).toBe(bounds.bottom);
  });

  it('moves a growing panel inward and restores responsive defaults', () => {
    const bounds = panelBounds(1376, 836, false);
    expect(fitPanel({ x: 900, y: 400, width: 600, height: 500 }, bounds))
      .toEqual({ x: 760, y: 224, width: 600, height: 500 });
    const compact = panelBounds(326, 780, true);
    expect(defaultPanel(compact, true)).toEqual({ x: 16, y: 368, width: 294, height: 300 });
  });

  it('prioritizes playback access when the tutorial leaves a short canvas', () => {
    const bounds = panelBounds(326, 258, true);
    const rect = defaultPanel(bounds, true);
    expect(rect.height).toBe(130);
    expect(rect.y + rect.height).toBe(146);
    expect(defaultPanel(bounds, true, true).y).toBe(102);
  });
});
