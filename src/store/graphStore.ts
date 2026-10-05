import { algorithmFitsContext } from '@/lib/workContext';
import { create } from 'zustand';
import { generateGraphWithQuota } from '@/services/graphService';
import { algorithmKey, fetchCatalog, runAlgorithm } from '@/services/algorithmService';
import { clearSession, fetchQuota, fetchSessionStatus } from '@/services/assistantService';
import { reportAlgorithmCompleted } from '@/services/analyticsService';
import { ApiError } from '@/lib/http';
import type { QuotaStatus, SessionStatus } from '@/types/auth';
import type { CodeRepresentation, Node3D, Edge3D, GraphMeta, AlgorithmStep, AlgorithmDescriptor, HighlightType } from '@/types/graph';
import { structureFitsFamily, type EngineState, type VisualizationMode } from '@/core';
import { chooseMode, engine, preferredMode, webglAvailable } from '@/renderers/appEngine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
}

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '¡Hola! Describe la estructura de datos que quieres visualizar.',
};

const TYPE_LABELS: Record<string, string> = {
  graph: 'Grafo',
  tree: 'Árbol',
  'linked-list': 'Lista Enlazada',
  'hash-table': 'Tabla Hash',
  stack: 'Pila',
  queue: 'Cola',
};

/**
 * Desde HU-18 el estado visualizable (nodos, aristas, pasos, paso actual, resaltado, modo) es del
 * `VisualizationEngine`. El store lo **refleja** por suscripción para que los componentes sigan
 * leyéndolo con `useGraphStore`, y sus acciones delegan en el motor. Lo que sigue siendo del store
 * es la interfaz: chat, paneles, cuota, cámara.
 */
interface VisualizationMirror {
  nodes: Node3D[];
  edges: Edge3D[];
  meta: GraphMeta | null;
  steps: AlgorithmStep[];
  currentStepIndex: number;
  highlightedNodeIds: string[];
  highlightType: HighlightType | null;
  mode: VisualizationMode;
  /** Pseudocódigo del rastro (HU-22a); nulo si el algoritmo no está instrumentado. */
  code: string[] | null;
  representations: CodeRepresentation[];
}

function mirror(e: EngineState): VisualizationMirror {
  return {
    nodes: e.structure.nodes,
    edges: e.structure.edges,
    meta: e.meta,
    steps: e.trace,
    currentStepIndex: e.stepIndex,
    highlightedNodeIds: e.highlight.ids,
    highlightType: e.highlight.type,
    mode: e.mode,
    code: e.code,
    representations: e.representations,
  };
}

interface GraphState extends VisualizationMirror {
  messages: ChatMessage[];
  loading: boolean;
  activeStructureType: string | null;
  activeSubtype: string | null;
  contextRevision: number;
  canvasContext: { type: string; subtype: string | null } | null;
  chatOpen: boolean;
  autoRotate: boolean;

  // Cuota del asistente (HU-17)
  quota: QuotaStatus | null;
  /** 'daily' = cuota agotada hasta medianoche; 'rate' = ráfaga, se libera sola. */
  assistantBlocked: 'daily' | 'rate' | null;
  /** Instante (ms) en que termina el bloqueo por ráfaga; la UI pinta la cuenta regresiva. */
  rateLimitUntil: number | null;

  // Memoria conversacional (HU-32)
  /** Sesión de trabajo del servidor: qué recuerda y cuánto le queda. */
  session: SessionStatus | null;
  /** Instante (ms) en que caduca la sesión; permite pintar la cuenta atrás sin volver a preguntar. */
  sessionExpiresAt: number | null;
  /** Falso cuando el servidor no pudo recordar (Redis caído): el aviso de degradación. */
  memoryAvailable: boolean;
  cameraResetKey: number;

  // Modo de visualización (HU-18)
  webglAvailable: boolean;
  /** Verdadero si el motor forzó 2D porque no hay WebGL y el aviso sigue sin cerrarse (CA-6). */
  webglNoticeVisible: boolean;

  // Algorithm demo state
  algorithmOpen: boolean;
  algorithmType: string | null;
  algorithmSubtype: string | null;
  algorithmOperation: string | null;
  stepsLoading: boolean;
  /** Catálogo del servidor (HU-19 · CA-4): el mismo en cualquier modo. */
  catalog: AlgorithmDescriptor[];
  catalogLoading: boolean;
  catalogError: string | null;
  /** Rastro ya reportado como completado; evita repetir el evento al ir y volver del final. */
  reportedTrace: string | null;
  /** Entrada del catálogo elegida en el panel; deriva de algorithmType/Subtype/Operation. */
  selectedAlgorithm: AlgorithmDescriptor | null;

  sendPrompt: (prompt: string) => Promise<void>;
  clearAll: () => void;
  setActiveStructureType: (type: string | null, subtype?: string | null) => void;
  setChatOpen: (open: boolean) => void;
  loadQuota: () => Promise<void>;
  clearAssistantBlock: () => void;
  /** Consulta la sesión del asistente; se llama al abrir el chat y tras cada mensaje (HU-32). */
  loadSession: () => Promise<void>;
  toggleAutoRotate: () => void;
  resetCamera: () => void;
  /** Cambia de modo conservando la estructura y el paso. Devuelve falso si el modo no está disponible. */
  setMode: (mode: VisualizationMode) => boolean;
  dismissWebglNotice: () => void;

  setAlgorithmOpen: (open: boolean) => void;
  openAlgorithmDemo: (type: string, subtype: string, operation: string) => void;
  loadCatalog: () => Promise<void>;
  selectAlgorithm: (descriptor: AlgorithmDescriptor | null) => void;
  /**
   * Ejecuta el algoritmo elegido. Los de entrada `values` reciben los valores; los de entrada
   * `structure` recorren lo que hay en el motor (nodos y aristas actuales) desde `start`.
   */
  runSelectedAlgorithm: (input: { values?: number[]; start?: string; argument?: number }) => Promise<void>;
  setCurrentStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  /** Avisa al registro analítico si el paso actual es el último del rastro (HU-21 · CA-2). */
  reportCompletionIfFinished: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  ...mirror(engine.getState()),
  messages: [WELCOME_MSG],
  loading: false,
  activeStructureType: null,
  activeSubtype: null,
  contextRevision: 0,
  canvasContext: null,
  chatOpen: false,
  autoRotate: true,
  quota: null,
  assistantBlocked: null,
  rateLimitUntil: null,
  session: null,
  sessionExpiresAt: null,
  memoryAvailable: true,
  cameraResetKey: 0,
  webglAvailable,
  webglNoticeVisible: !webglAvailable && preferredMode !== '2D',

  algorithmOpen: false,
  algorithmType: null,
  algorithmSubtype: null,
  algorithmOperation: null,
  stepsLoading: false,
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  reportedTrace: null,
  selectedAlgorithm: null,

  sendPrompt: async (prompt: string) => {
    if (get().loading || get().assistantBlocked) return;

    const { contextRevision: revision, activeStructureType: type, activeSubtype: subtype } = get();
    set((s) => ({
      loading: true,
      messages: [
        ...s.messages,
        { id: `u-${Date.now()}`, role: 'user', text: prompt },
      ],
    }));

    try {
      const { structure: result, quota: fromHeaders, memory } = await generateGraphWithQuota(prompt, type, subtype);
      if (revision !== get().contextRevision) return;
      const { meta } = result;

      const typeLabel = meta?.type ? (TYPE_LABELS[meta.type] ?? meta.type) : 'Estructura';
      const detail = meta
        ? ` ${meta.nodeCount} nodos · ${meta.edgeCount} aristas${meta.subtype ? ` · ${meta.subtype}` : ''}`
        : '';

      const props =
        meta && Object.keys(meta.computedProperties).length > 0
          ? '\n' +
            Object.entries(meta.computedProperties)
              .map(([k, v]) => `• ${k}: ${v}`)
              .join('\n')
          : '';

      // El contador se actualiza con las cabeceras de esta misma respuesta: sin petición extra.
      const prev = get().quota;
      const threshold = prev?.warningThreshold ?? (fromHeaders ? Math.ceil(fromHeaders.limit * 0.2) : 8);
      const quota: QuotaStatus | null = fromHeaders
        ? {
            limit: fromHeaders.limit,
            remaining: fromHeaders.remaining,
            used: fromHeaders.limit - fromHeaders.remaining,
            resetsAt: fromHeaders.resetsAt,
            ratePerMinute: prev?.ratePerMinute ?? 5,
            warningThreshold: threshold,
            warning: fromHeaders.remaining > 0 && fromHeaders.remaining <= threshold,
          }
        : prev;

      engine.loadStructure(result.nodes, result.edges, result.meta);
      // HU-32: la sesión acaba de renovarse en el servidor; se refresca para pintar la cuenta atrás.
      if (memory !== false) void get().loadSession();
      set((s) => ({
        loading: false,
        quota,
        canvasContext: meta ? { type: meta.type, subtype: meta.subtype } : null,
        activeStructureType: type ?? meta?.type ?? null,
        activeSubtype: type ? subtype : meta?.subtype === 'simple' ? null : meta?.subtype ?? null,
        memoryAvailable: memory === null ? get().memoryAvailable : memory,
        session: memory === false ? null : get().session,
        sessionExpiresAt: memory === false ? null : get().sessionExpiresAt,
        assistantBlocked: quota && quota.remaining === 0 ? 'daily' : null,
        messages: [
          ...s.messages,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `${typeLabel} generado.${detail}${props}`,
          },
        ],
      }));
    } catch (err: unknown) {
      if (revision !== get().contextRevision) return;
      const msg = err instanceof Error ? err.message : 'Error desconocido';

      // HU-17: los dos 429 se tratan distinto. El diario bloquea hasta medianoche; el de ráfaga se
      // libera solo cuando vence Retry-After. En ambos casos el lienzo sigue intacto.
      if (err instanceof ApiError && err.code === 'DAILY_QUOTA_EXCEEDED') {
        set((s) => ({
          loading: false,
          assistantBlocked: 'daily',
          quota: s.quota
            ? {
                ...s.quota,
                remaining: 0,
                used: s.quota.limit,
                warning: false,
                resetsAt: err.quotaResetsAt ?? s.quota.resetsAt,
              }
            : s.quota,
          messages: [...s.messages, { id: `e-${Date.now()}`, role: 'error', text: msg }],
        }));
        return;
      }
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
        const seconds = err.retryAfterSeconds ?? 60;
        set((s) => ({
          loading: false,
          assistantBlocked: 'rate',
          rateLimitUntil: Date.now() + seconds * 1000,
          messages: [...s.messages, { id: `e-${Date.now()}`, role: 'error', text: msg }],
        }));
        return;
      }

      set((s) => ({
        loading: false,
        messages: [
          ...s.messages,
          { id: `e-${Date.now()}`, role: 'error', text: `Error: ${msg}` },
        ],
      }));
    }
  },

  clearAll: () => {
    engine.clear();
    // HU-32 · CA-7: limpiar el lienzo es olvidar también en el servidor. Si Redis no está, el
    // borrado falla en silencio: la sesión que no existe no hay que borrarla.
    void clearSession().catch(() => undefined);
    set({
      contextRevision: get().contextRevision + 1,
      canvasContext: null,
      loading: false, stepsLoading: false, selectedAlgorithm: null,
      algorithmType: null, algorithmSubtype: null, algorithmOperation: null,
      messages: [WELCOME_MSG],
      activeStructureType: null,
      activeSubtype: null,
      session: null,
      sessionExpiresAt: null,
    });
  },

  setActiveStructureType: (type, subtype = null) => {
    if (type === 'heap') { type = 'tree'; subtype = 'heap'; }
    const state = get();
    if (type === state.activeStructureType && subtype === state.activeSubtype) return;
    const selected = state.selectedAlgorithm;
    const compatible = selected && algorithmFitsContext(selected, type, subtype);
    // Keep the loaded structure visible, but detach the old execution from a new context.
    if (state.steps.length) engine.loadStructure(state.nodes, state.edges, state.meta);
    set({ activeStructureType: type, activeSubtype: subtype,
      contextRevision: state.contextRevision + 1, loading: false, stepsLoading: false,
      selectedAlgorithm: compatible ? selected : null,
      algorithmType: compatible ? selected.type : null,
      algorithmSubtype: compatible ? selected.subtype : null,
      algorithmOperation: compatible ? selected.operation : null,
    });
  },

  setChatOpen: (open) => set({ chatOpen: open }),

  loadQuota: async () => {
    try {
      const quota = await fetchQuota();
      set({ quota, assistantBlocked: quota.remaining === 0 ? 'daily' : get().assistantBlocked });
    } catch {
      /* sin contador no se bloquea nada: el servidor sigue siendo la barrera */
    }
  },

  loadSession: async () => {
    try {
      const session = await fetchSessionStatus();
      set({
        session,
        sessionExpiresAt: session.active ? Date.now() + session.secondsRemaining * 1000 : null,
        memoryAvailable: session.available,
      });
    } catch {
      /* el estado de la sesión es informativo: si no se puede leer, no se bloquea nada */
    }
  },

  clearAssistantBlock: () => {
    const { assistantBlocked, quota } = get();
    if (assistantBlocked === 'rate') set({ assistantBlocked: null, rateLimitUntil: null });
    else if (assistantBlocked === 'daily' && quota && quota.remaining > 0)
      set({ assistantBlocked: null });
  },
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  resetCamera: () => set((s) => ({ cameraResetKey: s.cameraResetKey + 1 })),
  setMode: (mode) => chooseMode(mode),
  dismissWebglNotice: () => set({ webglNoticeVisible: false }),

  setAlgorithmOpen: (open) => set({ algorithmOpen: open }),

  openAlgorithmDemo: (type, subtype, operation) => {
    get().setActiveStructureType(type, subtype === 'simple' ? null : subtype);
    const revision = get().contextRevision;
    const key = `${type}/${subtype}/${operation}`;
    set({
      algorithmOpen: true,
      chatOpen: false,
      algorithmType: type,
      algorithmSubtype: subtype,
      algorithmOperation: operation,
    });
    // La decisión de limpiar o no el lienzo depende del catálogo: BFS recorre lo que hay en el
    // lienzo y no debe borrarlo; los que construyen su estructura arrancan de cero. Si el catálogo
    // aún no llegó, se espera a tenerlo antes de decidir.
    const apply = () => {
      if (revision !== get().contextRevision) return;
      const found = get().catalog.find((d) => algorithmKey(d) === key) ?? null;
      if (!found || found.input !== 'structure') { engine.clear(); set({ canvasContext: null }); }
      set({ selectedAlgorithm: found });
    };
    if (get().catalog.length === 0) void get().loadCatalog().then(apply);
    else apply();
  },

  loadCatalog: async () => {
    if (get().catalogLoading) return;
    set({ catalogLoading: true, catalogError: null });
    try {
      const catalog = await fetchCatalog();
      const { algorithmType, algorithmSubtype, algorithmOperation } = get();
      const key = `${algorithmType}/${algorithmSubtype}/${algorithmOperation}`;
      set({
        catalog,
        catalogLoading: false,
        selectedAlgorithm: get().selectedAlgorithm ?? catalog.find((d) => algorithmKey(d) === key) ?? null,
      });
    } catch (error: unknown) {
      set({ catalogLoading: false, catalogError: error instanceof Error ? error.message : 'No se pudo cargar el catálogo' });
    }
  },

  selectAlgorithm: (descriptor) => {
    if (descriptor && !algorithmFitsContext(descriptor, get().activeStructureType, get().activeSubtype)) {
      throw new Error('Este algoritmo no corresponde a la estructura seleccionada');
    }
    if (descriptor && !get().activeStructureType) {
      get().setActiveStructureType(descriptor.type, descriptor.subtype === 'simple' ? null : descriptor.subtype);
    }
    if (get().steps.length) engine.loadStructure(get().nodes, get().edges, get().meta);
    set({ selectedAlgorithm: descriptor, algorithmType: descriptor?.type ?? null,
      algorithmSubtype: descriptor?.subtype ?? null, algorithmOperation: descriptor?.operation ?? null,
      contextRevision: get().contextRevision + 1, loading: false, stepsLoading: false });
  },

  runSelectedAlgorithm: async ({ values, start, argument }) => {
    const d = get().selectedAlgorithm;
    if (!d) throw new Error('Elige un algoritmo del catálogo');
    if (!algorithmFitsContext(d, get().activeStructureType, get().activeSubtype)) throw new Error('Algoritmo incompatible con el contexto');
    const revision = get().contextRevision;
    set({ stepsLoading: true });
    try {
      const { structure } = engine.getState();
      // Con entrada `structure` se envía lo que hay en el lienzo; si no hay nada y llegan valores,
      // el algoritmo puede construir su estructura con ellos (inorden → BST).
      const useCanvas = d.input === 'structure' && structureFitsFamily(d.family, structure);
      const res = await runAlgorithm({
        type: d.type,
        subtype: d.subtype,
        operation: d.operation,
        argument,
        values: useCanvas ? undefined : values,
        nodes: useCanvas ? structure.nodes : undefined,
        edges: useCanvas ? structure.edges : undefined,
        start: useCanvas ? start : undefined,
      });
      if (revision !== get().contextRevision) return;
      if (res.error || !res.steps) {
        throw new Error(res.message ?? 'Error al cargar pasos');
      }
      engine.loadTrace(res.steps, res.code ?? null, res.representations ?? []);
      set({ stepsLoading: false, reportedTrace: null, canvasContext: { type: d.type, subtype: d.subtype } });
    } catch (err: unknown) {
      if (revision !== get().contextRevision) return;
      set({ stepsLoading: false });
      throw err instanceof Error ? err : new Error('Error desconocido');
    }
  },

  setCurrentStep: (index) => {
    engine.goTo(index);
    get().reportCompletionIfFinished();
  },

  nextStep: () => {
    engine.next();
    get().reportCompletionIfFinished();
  },

  prevStep: () => {
    engine.prev();
  },

  /**
   * HU-21 · CA-2: llegar al último paso es el hecho que el servidor no puede observar. Se reporta
   * una sola vez por rastro —el estudiante puede ir y volver del final— y en silencio.
   */
  reportCompletionIfFinished: () => {
    const { steps, currentStepIndex, selectedAlgorithm, meta } = get();
    if (steps.length === 0 || currentStepIndex !== steps.length - 1) return;

    // El modo de visualización queda fuera de la clave a propósito: conmutar 2D/3D en el último
    // paso conserva el rastro (HU-18 · CA-2), así que sería el mismo recorrido contado dos veces.
    const traceKey = `${selectedAlgorithm ? algorithmKey(selectedAlgorithm) : 'desconocido'}:${steps.length}`;
    if (get().reportedTrace === traceKey) return;
    set({ reportedTrace: traceKey });

    void reportAlgorithmCompleted({
      type: selectedAlgorithm?.type ?? meta?.type ?? 'unknown',
      subtype: selectedAlgorithm?.subtype ?? meta?.subtype ?? null,
      algorithm: selectedAlgorithm?.operation ?? 'unknown',
      stepCount: steps.length,
      nodeCount: get().nodes.length,
    });
  },
}));

// El motor es la fuente de verdad; el store sólo lo refleja.
engine.subscribe((state) => useGraphStore.setState(mirror(state)));
