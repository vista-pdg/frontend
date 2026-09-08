import type { HighlightType } from '@/types/graph';
import type { ExecutionStep, StructureState } from '@/core';
import type { Renderer, RendererSnapshot } from '@/core';
import { createModel, type ObservableModel } from './observable';

/** Lo que una vista necesita para dibujar un cuadro. Común a los dos adaptadores. */
export interface SceneModel {
  structure: StructureState;
  highlightedIds: string[];
  highlightType: HighlightType | null;
  /** Índice del último paso animado; permite a la vista distinguir "nuevo cuadro" de "repintado". */
  stepIndex: number | null;
}

export const EMPTY_SCENE: SceneModel = {
  structure: { nodes: [], edges: [] },
  highlightedIds: [],
  highlightType: null,
  stepIndex: null,
};

/**
 * Implementación del contrato compartida por los adaptadores: los cuatro verbos escriben en un
 * modelo observable y la vista de cada adaptador decide cómo dibujarlo. `snapshot()` se puede
 * sobrescribir para leer lo dibujado de verdad (la escena de three, el DOM del SVG).
 */
export abstract class ModelBackedRenderer implements Renderer {
  abstract readonly id: '2D' | '3D';
  abstract readonly label: string;
  readonly model: ObservableModel<SceneModel> = createModel(EMPTY_SCENE);

  render(structure: StructureState): void {
    this.model.set((m) => ({ ...m, structure, stepIndex: null }));
  }

  animateStep(step: ExecutionStep): void {
    this.model.set((m) => ({
      ...m,
      structure: { nodes: step.nodes, edges: step.edges },
      stepIndex: step.index,
    }));
  }

  highlight(ids: string[], type: HighlightType | null): void {
    this.model.set((m) => ({ ...m, highlightedIds: ids, highlightType: type }));
  }

  clear(): void {
    this.model.set(EMPTY_SCENE);
  }

  snapshot(): RendererSnapshot {
    const { structure, highlightedIds } = this.model.get();
    return {
      nodeIds: structure.nodes.map((n) => n.id),
      edgeIds: structure.edges.map((e) => e.id),
      highlightedIds: [...highlightedIds],
      labels: Object.fromEntries(structure.nodes.map((n) => [n.id, n.label])),
    };
  }
}
