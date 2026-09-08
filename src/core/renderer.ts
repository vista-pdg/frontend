import type { HighlightType } from '@/types/graph';
import type { ExecutionStep, StructureState, VisualizationMode } from './model';

/** Lo que un adaptador tiene dibujado. Permite afirmar paridad y ausencia de huérfanos desde fuera. */
export interface RendererSnapshot {
  nodeIds: string[];
  edgeIds: string[];
  highlightedIds: string[];
  /** id → etiqueta visible, para comprobar que los valores sobreviven al cambio de modo. */
  labels: Record<string, string>;
}

/**
 * Contrato único de renderizado (HU-18).
 *
 * <p>Un adaptador sólo dibuja: recibe la estructura, el paso a animar y el resaltado, y puede
 * limpiar el lienzo. No conoce el store, no decide qué paso sigue, no calcula nada del algoritmo.
 * `render / animateStep / highlight / clear` son los cuatro verbos que dicta la historia.
 */
export interface Renderer {
  readonly id: VisualizationMode;
  readonly label: string;
  render(structure: StructureState): void;
  animateStep(step: ExecutionStep): void;
  highlight(ids: string[], type: HighlightType | null): void;
  clear(): void;
  snapshot(): RendererSnapshot;
}

/**
 * Registro de adaptadores. El motor consulta aquí el adaptador del modo activo; si no hay ninguno
 * registrado (pruebas del núcleo, CA-4) el motor funciona igual y sus llamadas caen en el vacío.
 */
export class RendererRegistry {
  private readonly renderers = new Map<VisualizationMode, Renderer>();

  register(renderer: Renderer): this {
    this.renderers.set(renderer.id, renderer);
    return this;
  }

  unregister(id: VisualizationMode): void {
    this.renderers.delete(id);
  }

  get(id: VisualizationMode): Renderer | undefined {
    return this.renderers.get(id);
  }

  has(id: VisualizationMode): boolean {
    return this.renderers.has(id);
  }

  list(): Renderer[] {
    return [...this.renderers.values()];
  }
}
