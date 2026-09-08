import type { AlgorithmStep, Edge3D, GraphMeta, HighlightType, Node3D } from '@/types/graph';

/**
 * Modelo del núcleo de visualización (HU-18).
 *
 * <p>Este paquete no importa React ni three: es la frontera que la HU pide entre "qué hay que
 * mostrar" y "cómo se dibuja". Los adaptadores de renderizado consumen estos tipos; nunca los
 * producen.
 */

export type VisualizationMode = '2D' | '3D';

export const VISUALIZATION_MODES: readonly VisualizationMode[] = ['2D', '3D'];

export interface StructureState {
  nodes: Node3D[];
  edges: Edge3D[];
}

export interface Highlight {
  ids: string[];
  type: HighlightType | null;
}

/** Un paso del rastro de ejecución que produce el backend. El núcleo lo consume tal cual. */
export type ExecutionStep = AlgorithmStep;

/**
 * Lo que un renderizador debe reflejar en un instante dado. Es también la unidad del "rastro de
 * estados" que el motor emite paso a paso, y lo que CA-4 compara con y sin adaptador.
 */
export interface RenderFrame {
  structure: StructureState;
  highlight: Highlight;
  stepIndex: number;
}

export interface EngineState extends RenderFrame {
  meta: GraphMeta | null;
  trace: ExecutionStep[];
  /** Pseudocódigo del rastro cargado (HU-22a). El motor lo guarda; no lo interpreta. */
  code: string[] | null;
  mode: VisualizationMode;
  webglAvailable: boolean;
}

export const EMPTY_STRUCTURE: StructureState = { nodes: [], edges: [] };
export const NO_HIGHLIGHT: Highlight = { ids: [], type: null };

export function isVisualizationMode(value: unknown): value is VisualizationMode {
  return value === '2D' || value === '3D';
}
