import type { AlgorithmStep, Edge3D, Node3D } from '@/types/graph';

export function node(id: string, label = id, extra: Partial<Node3D> = {}): Node3D {
  return { id, label, x: 0, y: 0, z: 0, depth: 0, parent: null, properties: {}, ...extra };
}

export function edge(from: string, to: string, directed = true, weight: number | null = null): Edge3D {
  return { id: `edge-${from}-${to}`, from, to, weight, directed };
}

/** Árbol binario de búsqueda con los valores insertados en orden BST (sin balanceo). */
export function bst(values: number[]): { nodes: Node3D[]; edges: Edge3D[] } {
  interface T { v: number; l?: T; r?: T }
  let root: T | undefined;
  const insert = (t: T | undefined, v: number): T => {
    if (!t) return { v };
    if (v < t.v) t.l = insert(t.l, v);
    else if (v > t.v) t.r = insert(t.r, v);
    return t;
  };
  for (const v of values) root = insert(root, v);
  const nodes: Node3D[] = [];
  const edges: Edge3D[] = [];
  const walk = (t: T | undefined, parent: string | null, depth: number) => {
    if (!t) return;
    const id = `node-${t.v}`;
    nodes.push(node(id, String(t.v), { depth, parent }));
    if (parent) edges.push(edge(parent, id));
    walk(t.l, id, depth + 1);
    walk(t.r, id, depth + 1);
  };
  walk(root, null, 0);
  return { nodes, edges };
}

export function completeGraph(n: number): { nodes: Node3D[]; edges: Edge3D[] } {
  const nodes = Array.from({ length: n }, (_, i) => node(`n${i}`, String.fromCharCode(65 + i)));
  const edges: Edge3D[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push(edge(`n${i}`, `n${j}`, false));
  return { nodes, edges };
}

/** Rastro sintético: cada paso añade un nodo y resalta el recién llegado. */
export function trace(values: number[]): AlgorithmStep[] {
  return values.map((_, i) => {
    const { nodes, edges } = bst(values.slice(0, i + 1));
    return {
      index: i,
      title: `Insertar ${values[i]}`,
      description: '',
      highlightType: 'insert',
      highlightedNodeIds: [`node-${values[i]}`],
      rotationType: null,
      nodes,
      edges,
    };
  });
}
