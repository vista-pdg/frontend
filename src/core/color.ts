/**
 * Contraste WCAG 2.1 (HU-19 · CA-6).
 *
 * <p>La paleta del lienzo mezcla rellenos claros (amarillo, verde, naranja) y oscuros (primary,
 * púrpura, rojo). Un texto siempre blanco no llega a 4.5:1 sobre los claros; aquí se elige negro o
 * blanco por relleno y se puede medir, así que la prueba unitaria recorre toda la paleta.
 */

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) throw new Error(`Color inválido: ${hex}`);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa según WCAG 2.1 (0 = negro, 1 = blanco). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Relación de contraste entre dos colores, de 1 a 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export const AA_TEXT = 4.5;
export const AA_GRAPHIC = 3;

/** Negro o blanco, el que más contraste dé sobre el relleno. */
export function labelColorFor(fill: string): '#000000' | '#ffffff' {
  return contrastRatio(fill, '#000000') >= contrastRatio(fill, '#ffffff') ? '#000000' : '#ffffff';
}

export function meetsAA(foreground: string, background: string, kind: 'text' | 'graphic' = 'text'): boolean {
  return contrastRatio(foreground, background) >= (kind === 'text' ? AA_TEXT : AA_GRAPHIC);
}
