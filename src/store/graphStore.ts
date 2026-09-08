import { create } from 'zustand';
import { generateGraphWithQuota, fetchAlgorithmSteps } from '@/services/graphService';
import { fetchQuota } from '@/services/assistantService';
import { ApiError } from '@/lib/http';
import type { QuotaStatus } from '@/types/auth';
import type { Node3D, Edge3D, GraphMeta, AlgorithmStep, HighlightType } from '@/types/graph';

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
};

interface GraphState {
  nodes: Node3D[];
  edges: Edge3D[];
  meta: GraphMeta | null;
  messages: ChatMessage[];
  loading: boolean;
  activeStructureType: string | null;
  activeSubtype: string | null;
  chatOpen: boolean;
  autoRotate: boolean;

  // Cuota del asistente (HU-17)
  quota: QuotaStatus | null;
  /** 'daily' = cuota agotada hasta medianoche; 'rate' = ráfaga, se libera sola. */
  assistantBlocked: 'daily' | 'rate' | null;
  /** Instante (ms) en que termina el bloqueo por ráfaga; la UI pinta la cuenta regresiva. */
  rateLimitUntil: number | null;
  cameraResetKey: number;

  // Algorithm demo state
  algorithmOpen: boolean;
  algorithmType: string | null;
  algorithmSubtype: string | null;
  algorithmOperation: string | null;
  steps: AlgorithmStep[];
  currentStepIndex: number;
  stepsLoading: boolean;
  highlightedNodeIds: string[];
  highlightType: HighlightType | null;

  sendPrompt: (prompt: string) => Promise<void>;
  clearAll: () => void;
  setActiveStructureType: (type: string | null, subtype?: string | null) => void;
  setChatOpen: (open: boolean) => void;
  loadQuota: () => Promise<void>;
  clearAssistantBlock: () => void;
  toggleAutoRotate: () => void;
  resetCamera: () => void;

  setAlgorithmOpen: (open: boolean) => void;
  openAlgorithmDemo: (type: string, subtype: string, operation: string) => void;
  loadAlgorithmSteps: (type: string, subtype: string, operation: string, values: number[]) => Promise<void>;
  setCurrentStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  meta: null,
  messages: [WELCOME_MSG],
  loading: false,
  activeStructureType: null,
  activeSubtype: null,
  chatOpen: false,
  autoRotate: true,
  quota: null,
  assistantBlocked: null,
  rateLimitUntil: null,
  cameraResetKey: 0,

  algorithmOpen: false,
  algorithmType: null,
  algorithmSubtype: null,
  algorithmOperation: null,
  steps: [],
  currentStepIndex: 0,
  stepsLoading: false,
  highlightedNodeIds: [],
  highlightType: null,

  sendPrompt: async (prompt: string) => {
    if (get().loading || get().assistantBlocked) return;

    set((s) => ({
      loading: true,
      messages: [
        ...s.messages,
        { id: `u-${Date.now()}`, role: 'user', text: prompt },
      ],
    }));

    try {
      const { structure: result, quota: fromHeaders } = await generateGraphWithQuota(prompt);
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

      set((s) => ({
        nodes: result.nodes,
        edges: result.edges,
        meta: result.meta,
        loading: false,
        highlightedNodeIds: [],
        highlightType: null,
        steps: [],
        quota,
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

  clearAll: () =>
    set({
      nodes: [],
      edges: [],
      meta: null,
      messages: [WELCOME_MSG],
      steps: [],
      currentStepIndex: 0,
      highlightedNodeIds: [],
      highlightType: null,
      activeStructureType: null,
      activeSubtype: null,
    }),

  setActiveStructureType: (type, subtype = null) =>
    set({ activeStructureType: type, activeSubtype: subtype }),

  setChatOpen: (open) => set({ chatOpen: open }),

  loadQuota: async () => {
    try {
      const quota = await fetchQuota();
      set({ quota, assistantBlocked: quota.remaining === 0 ? 'daily' : get().assistantBlocked });
    } catch {
      /* sin contador no se bloquea nada: el servidor sigue siendo la barrera */
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

  setAlgorithmOpen: (open) => set({ algorithmOpen: open }),

  openAlgorithmDemo: (type, subtype, operation) =>
    set({
      algorithmOpen: true,
      chatOpen: false,
      algorithmType: type,
      algorithmSubtype: subtype,
      algorithmOperation: operation,
      steps: [],
      currentStepIndex: 0,
      highlightedNodeIds: [],
      highlightType: null,
    }),

  loadAlgorithmSteps: async (type, subtype, operation, values) => {
    set({ stepsLoading: true });
    try {
      const res = await fetchAlgorithmSteps(type, subtype, operation, values);
      if (res.error || !res.steps) {
        throw new Error(res.message ?? 'Error al cargar pasos');
      }
      const firstStep = res.steps[0];
      set({
        steps: res.steps,
        currentStepIndex: 0,
        nodes: firstStep?.nodes ?? [],
        edges: firstStep?.edges ?? [],
        highlightedNodeIds: firstStep?.highlightedNodeIds ?? [],
        highlightType: firstStep?.highlightType ?? null,
        meta: null,
        stepsLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      set({ stepsLoading: false });
      throw new Error(msg);
    }
  },

  setCurrentStep: (index) => {
    const { steps } = get();
    if (index < 0 || index >= steps.length) return;
    const step = steps[index];
    set({
      currentStepIndex: index,
      nodes: step.nodes,
      edges: step.edges,
      highlightedNodeIds: step.highlightedNodeIds,
      highlightType: step.highlightType,
    });
  },

  nextStep: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      get().setCurrentStep(currentStepIndex + 1);
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      get().setCurrentStep(currentStepIndex - 1);
    }
  },
}));
