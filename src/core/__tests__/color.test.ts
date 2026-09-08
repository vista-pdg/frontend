import { describe, expect, it } from 'vitest';
import {
  AA_GRAPHIC,
  AA_TEXT,
  CANVAS_BACKGROUND,
  DEPTH_COLORS,
  EDGE_COLORS,
  HIGHLIGHT_COLORS,
  STATE_COLORS,
  contrastRatio,
  hexToRgb,
  labelColorFor,
  meetsAA,
  nodeFill,
  relativeLuminance,
} from '@/core';

describe('contraste WCAG (CA-6)', () => {
  it('reproduce los valores de referencia', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBe(0);
    expect(hexToRgb('#5454e9')).toEqual([84, 84, 233]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(() => hexToRgb('nope')).toThrow();
  });

  it('toda la paleta de nodos alcanza AA con la etiqueta que se le asigna', () => {
    const fills = new Set([...DEPTH_COLORS, ...Object.values(HIGHLIGHT_COLORS), ...Object.values(STATE_COLORS)]);
    for (const fill of fills) {
      const label = labelColorFor(fill);
      expect(contrastRatio(fill, label), `${fill} con ${label}`).toBeGreaterThanOrEqual(AA_TEXT);
      expect(meetsAA(label, fill)).toBe(true);
    }
  });

  it('elige negro sobre los rellenos claros y blanco sobre los oscuros', () => {
    expect(labelColorFor('#E4EB60')).toBe('#000000');
    expect(labelColorFor('#4cb979')).toBe('#000000');
    expect(labelColorFor('#E9683B')).toBe('#000000');
    expect(labelColorFor('#5454e9')).toBe('#ffffff');
    expect(labelColorFor('#d32f2f')).toBe('#ffffff');
  });

  it('las aristas contrastan al menos 3:1 con el fondo del lienzo', () => {
    for (const c of Object.values(EDGE_COLORS)) {
      expect(contrastRatio(c, CANVAS_BACKGROUND)).toBeGreaterThanOrEqual(AA_GRAPHIC);
      expect(meetsAA(c, CANVAS_BACKGROUND, 'graphic')).toBe(true);
    }
  });

  it('nodeFill prioriza el resaltado, luego el estado, luego la profundidad', () => {
    expect(nodeFill(0, 'visited', true, 'pop')).toBe(HIGHLIGHT_COLORS.pop);
    expect(nodeFill(0, 'visited', false, null)).toBe(STATE_COLORS.visited);
    expect(nodeFill(1, 'unvisited', false, null), 'en un recorrido la profundidad se apaga').toBe(STATE_COLORS.unvisited);
    expect(nodeFill(2, 'unvisited', false, null)).not.toBe(STATE_COLORS.visited);
    expect(nodeFill(1, 'other', false, null)).toBe(DEPTH_COLORS[1]);
    expect(nodeFill(7, undefined, false, null)).toBe(DEPTH_COLORS[2]);
    expect(nodeFill(0, 'visited', true, null)).toBe(STATE_COLORS.visited);
  });
});
