import { create } from 'zustand';
import { generateGraph } from '@/services/graphService';
import type { Node3D, Edge3D, GraphMeta } from '@/types/graph';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
}

interface GraphState {
  // Graph data
  nodes: Node3D[];
  edges: Edge3D[];
  meta: GraphMeta | null;

  // Chat
  messages: ChatMessage[];
  loading: boolean;

  // Actions
  sendPrompt: (prompt: string) => Promise<void>;
  clearGraph: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  meta: null,
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Describe el grafo que quieres construir en lenguaje natural.',
    },
  ],
  loading: false,

  sendPrompt: async (prompt: string) => {
    if (get().loading) return;

    set((s) => ({
      loading: true,
      messages: [
        ...s.messages,
        { id: `u-${Date.now()}`, role: 'user', text: prompt },
      ],
    }));

    try {
      const result = await generateGraph(prompt);
      const { meta } = result;

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

      set((s) => ({
        nodes: result.nodes,
        edges: result.edges,
        meta: result.meta,
        loading: false,
        messages: [
          ...s.messages,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `Grafo generado.${detail}${props}`,
          },
        ],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      set((s) => ({
        loading: false,
        messages: [
          ...s.messages,
          { id: `e-${Date.now()}`, role: 'error', text: `Error: ${msg}` },
        ],
      }));
    }
  },

  clearGraph: () => set({ nodes: [], edges: [], meta: null }),
}));
