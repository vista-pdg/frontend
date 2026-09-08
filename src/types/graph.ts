export interface Node3D {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  parent: string | null;
  properties: Record<string, unknown>;
}

export interface Edge3D {
  id: string;
  from: string;
  to: string;
  weight: number | null;
  directed: boolean;
}

export interface GraphMeta {
  type: string;
  subtype: string | null;
  nodeCount: number;
  edgeCount: number;
  computedProperties: Record<string, unknown>;
}

export interface StructureResponse {
  error: boolean;
  message: string | null;
  contract: Record<string, unknown> | null;
  nodes: Node3D[];
  edges: Edge3D[];
  meta: GraphMeta | null;
}

/** Significado de un resaltado. Los cinco primeros son del AVL; el resto los añadió HU-19. */
export type HighlightType =
  | 'initial'
  | 'insert'
  | 'unbalanced'
  | 'rotated'
  | 'balanced'
  | 'visit'
  | 'frontier'
  | 'done'
  | 'pop'
  | 'dequeue';

/** Entrada del catálogo de algoritmos (HU-19). `input` dice qué necesita: valores o la estructura del lienzo. */
export interface AlgorithmDescriptor {
  type: string;
  subtype: string;
  operation: string;
  family: 'tree' | 'graph' | 'stack' | 'queue' | string;
  label: string;
  description: string;
  input: 'values' | 'structure';
}

export interface AlgorithmStep {
  index: number;
  title: string;
  description: string;
  highlightType: HighlightType;
  highlightedNodeIds: string[];
  rotationType: string | null;
  nodes: Node3D[];
  edges: Edge3D[];
  /** Línea (1-based) del pseudocódigo que ejecuta este paso (HU-22a); nula si no está instrumentado. */
  line?: number | null;
}

export interface StepsResponse {
  error: boolean;
  message: string | null;
  steps: AlgorithmStep[] | null;
  /** Pseudocódigo del algoritmo (HU-22a); nulo si no está instrumentado. */
  code?: string[] | null;
  language?: string | null;
}
