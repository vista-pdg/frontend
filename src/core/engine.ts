import type { Edge3D, GraphMeta, HighlightType, Node3D } from '@/types/graph';
import {
  EMPTY_STRUCTURE,
  NO_HIGHLIGHT,
  type EngineState,
  type ExecutionStep,
  type RenderFrame,
  type VisualizationMode,
} from './model';
import { RendererRegistry, type Renderer } from './renderer';

export interface EngineOptions {
  registry?: RendererRegistry;
  initialMode?: VisualizationMode;
  /** Sin WebGL el motor nunca activa el 3D, pida lo que pida el cliente (CA-6). */
  webglAvailable?: boolean;
}

type Listener = (state: EngineState) => void;

/** Reduce un paso del rastro al cuadro que debe verse. Pura: es lo que CA-4 compara. */
export function frameOf(step: ExecutionStep, index: number): RenderFrame {
  return {
    structure: { nodes: step.nodes, edges: step.edges },
    highlight: { ids: step.highlightedNodeIds, type: step.highlightType },
    stepIndex: index,
  };
}

/**
 * Motor de visualización (HU-18).
 *
 * <p>Es el único dueño del estado visualizable: estructura, rastro de pasos, paso actual, resaltado
 * y modo. Cada mutación produce un cuadro y, si hay un adaptador registrado para el modo activo,
 * se lo reenvía por el contrato. Sin adaptador el estado evoluciona exactamente igual: por eso la
 * suite del núcleo corre sin ninguno y compara el rastro de estados (CA-4).
 *
 * <p>Cambiar de modo no toca el estado: limpia el adaptador saliente y vuelve a pintar el mismo
 * cuadro en el entrante. Eso es lo que hace que CA-1, CA-2 y CA-3 sean ciertos por construcción.
 */
export class VisualizationEngine {
  private readonly registry: RendererRegistry;
  private readonly listeners = new Set<Listener>();
  private state: EngineState;

  constructor(options: EngineOptions = {}) {
    this.registry = options.registry ?? new RendererRegistry();
    const webglAvailable = options.webglAvailable ?? true;
    const requested = options.initialMode ?? '3D';
    this.state = {
      structure: EMPTY_STRUCTURE,
      highlight: NO_HIGHLIGHT,
      stepIndex: 0,
      meta: null,
      trace: [],
      code: null,
      mode: requested === '3D' && !webglAvailable ? '2D' : requested,
      webglAvailable,
    };
  }

  getState(): EngineState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Adaptador del modo activo, o `undefined` si nadie se registró para él. */
  activeRenderer(): Renderer | undefined {
    return this.registry.get(this.state.mode);
  }

  availableModes(): VisualizationMode[] {
    return this.registry.list().map((r) => r.id);
  }

  canUse(mode: VisualizationMode): boolean {
    return mode !== '3D' || this.state.webglAvailable;
  }

  /** Devuelve `false` si el modo no se puede activar (3D sin WebGL). El estado no cambia. */
  setMode(mode: VisualizationMode): boolean {
    if (!this.canUse(mode)) return false;
    if (mode === this.state.mode) return true;
    this.activeRenderer()?.clear();
    this.state = { ...this.state, mode };
    this.paint();
    this.emit();
    return true;
  }

  loadStructure(nodes: Node3D[], edges: Edge3D[], meta: GraphMeta | null = null): void {
    this.state = {
      ...this.state,
      structure: { nodes, edges },
      highlight: NO_HIGHLIGHT,
      stepIndex: 0,
      meta,
      trace: [],
      code: null,
    };
    this.paint();
    this.emit();
  }

  /** Carga un rastro y, si el algoritmo está instrumentado (HU-22a), su pseudocódigo. */
  loadTrace(steps: ExecutionStep[], code: string[] | null = null): void {
    if (steps.length === 0) {
      this.clear();
      return;
    }
    this.state = { ...this.state, trace: steps, code, meta: null, ...frameOf(steps[0], 0) };
    this.paint();
    this.emit();
  }

  goTo(index: number): boolean {
    const { trace } = this.state;
    if (index < 0 || index >= trace.length) return false;
    const step = trace[index];
    this.state = { ...this.state, ...frameOf(step, index) };
    const renderer = this.activeRenderer();
    if (renderer) {
      renderer.animateStep(step);
      renderer.highlight(step.highlightedNodeIds, step.highlightType);
    }
    this.emit();
    return true;
  }

  next(): boolean {
    return this.goTo(this.state.stepIndex + 1);
  }

  prev(): boolean {
    return this.goTo(this.state.stepIndex - 1);
  }

  highlight(ids: string[], type: HighlightType | null): void {
    this.state = { ...this.state, highlight: { ids, type } };
    this.activeRenderer()?.highlight(ids, type);
    this.emit();
  }

  clear(): void {
    this.state = {
      ...this.state,
      structure: EMPTY_STRUCTURE,
      highlight: NO_HIGHLIGHT,
      stepIndex: 0,
      meta: null,
      trace: [],
      code: null,
    };
    this.activeRenderer()?.clear();
    this.emit();
  }

  /** El rastro completo de cuadros que produciría el rastro cargado, sin tocar el estado. */
  frames(): RenderFrame[] {
    return this.state.trace.map(frameOf);
  }

  /** Vuelve a pintar el cuadro actual en el adaptador activo (arranque de una vista, cambio de modo). */
  paint(): void {
    const renderer = this.activeRenderer();
    if (!renderer) return;
    renderer.render(this.state.structure);
    renderer.highlight(this.state.highlight.ids, this.state.highlight.type);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state);
  }
}
