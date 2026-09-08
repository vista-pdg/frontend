import type { HighlightType } from '@/types/graph';

/**
 * Paleta del lienzo, compartida por los adaptadores 2D y 3D (HU-19): un color por significado,
 * igual en los dos modos. Es la que audita `color.test.ts`.
 */
export const CANVAS_BACKGROUND = '#0b0b12';

/** Color por profundidad cuando ningún estado ni resaltado manda. */
export const DEPTH_COLORS = ['#5454e9', '#865FF0', '#4cb979', '#E9683B', '#E4EB60'];

export const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  initial: '#5454e9',
  insert: '#E9683B',
  unbalanced: '#d32f2f',
  rotated: '#E4EB60',
  balanced: '#4cb979',
  visit: '#E9683B',
  frontier: '#E4EB60',
  done: '#4cb979',
  pop: '#d32f2f',
  dequeue: '#d32f2f',
};

/**
 * Estado por nodo que los algoritmos de recorrido escriben en `properties.state`. `unvisited` es
 * neutro a propósito: durante un recorrido el color por profundidad se apaga, porque la
 * profundidad 2 es verde y se confundiría con «visitado».
 */
export const STATE_COLORS: Record<string, string> = {
  unvisited: '#5454e9',
  visited: '#4cb979',
  frontier: '#E4EB60',
  current: '#E9683B',
};

export const EDGE_COLORS = { directed: '#5454e9', undirected: '#4cb979' } as const;

export function nodeFill(
  depth: number,
  state: unknown,
  highlighted: boolean,
  highlightType: HighlightType | null
): string {
  if (highlighted && highlightType) return HIGHLIGHT_COLORS[highlightType];
  if (typeof state === 'string' && STATE_COLORS[state]) return STATE_COLORS[state];
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}
