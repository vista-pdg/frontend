import type { Edge3D, Node3D } from '@/types/graph';
import type { StructureState } from './model';

/**
 * Disposición 2D (HU-18).
 *
 * <p>El backend envía coordenadas del layout 3D, y las de los árboles son radiales (un cono):
 * aplastarlas produce solapes. El plano se calcula aquí, en el núcleo, de forma determinista y
 * probada. HU-19 añade el layout de fuerzas para grafos y las disposiciones de pila y cola.
 */

export interface Point2D {
  x: number;
  y: number;
}

export type Layout2D = Record<string, Point2D>;

export type LayoutKind = 'tree' | 'circular' | 'linear';

export interface LayoutOptions {
  /** Separación horizontal entre hojas del árbol / entre elementos de una lista. */
  gapX?: number;
  /** Separación vertical entre niveles del árbol. */
  gapY?: number;
}

const DEFAULTS: Required<LayoutOptions> = { gapX: 72, gapY: 96 };

interface TreeShape {
  root: string;
  children: Map<string, string[]>;
}

/**
 * Un árbol es: una sola raíz (nodo sin padre y sin arista entrante), toda otra entrada tiene
 * exactamente una arista entrante, y desde la raíz se alcanza todo. Cualquier otra cosa se
 * dispone como grafo.
 */
export function treeShapeOf(structure: StructureState): TreeShape | null {
  const { nodes, edges } = structure;
  if (nodes.length === 0) return null;
  const ids = new Set(nodes.map((n) => n.id));
  const incoming = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    children.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) return null;
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
    children.get(e.from)!.push(e.to);
  }
  const roots = nodes.filter((n) => incoming.get(n.id) === 0);
  if (roots.length !== 1) return null;
  if ([...incoming.values()].some((c) => c > 1)) return null;
  const seen = new Set<string>();
  const stack = [roots[0].id];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) return null;
    seen.add(id);
    stack.push(...children.get(id)!);
  }
  return seen.size === nodes.length ? { root: roots[0].id, children } : null;
}

export function detectLayoutKind(structure: StructureState): LayoutKind {
  if (structure.nodes.length === 0) return 'circular';
  if (treeShapeOf(structure)) return 'tree';
  if (isChain(structure)) return 'linear';
  return 'circular';
}

/**
 * Lista enlazada: cada nodo apunta como mucho al siguiente y nadie recibe dos aristas. Puede
 * tener varias componentes (una lista rota en dos sigue siendo lineal), pero no ciclos: con un
 * ciclo habría tantas aristas como nodos en esa componente.
 */
function isChain({ nodes, edges }: StructureState): boolean {
  if (edges.length >= nodes.length) return false;
  const out = new Map<string, number>();
  const inc = new Map<string, number>();
  for (const e of edges) {
    out.set(e.from, (out.get(e.from) ?? 0) + 1);
    inc.set(e.to, (inc.get(e.to) ?? 0) + 1);
  }
  return [...out.values()].every((c) => c <= 1) && [...inc.values()].every((c) => c <= 1);
}

export function layout2D(structure: StructureState, options: LayoutOptions = {}): Layout2D {
  const opts = { ...DEFAULTS, ...options };
  switch (detectLayoutKind(structure)) {
    case 'tree':
      return treeLayout(structure, opts);
    case 'linear':
      return linearLayout(structure, opts);
    default:
      return circularLayout(structure.nodes);
  }
}

function numeric(label: string): number | null {
  const v = Number(label.trim());
  return label.trim() !== '' && Number.isFinite(v) ? v : null;
}

/**
 * Árbol ordenado ("tidy" simplificado): cada hoja ocupa una ranura, cada padre se centra sobre
 * las ranuras de sus hijos. En árboles binarios con etiquetas numéricas un hijo único conserva su
 * lado (menor a la izquierda, mayor a la derecha) reservando la ranura del hermano ausente: sin
 * eso un BST degenerado se dibujaría como una lista vertical y perdería su significado.
 */
function treeLayout(structure: StructureState, opts: Required<LayoutOptions>): Layout2D {
  const shape = treeShapeOf(structure)!;
  const byId = new Map(structure.nodes.map((n) => [n.id, n]));
  const slots = new Map<string, number>();

  const sideOf = (parent: Node3D, child: Node3D): 'left' | 'right' | null => {
    const p = numeric(parent.label);
    const c = numeric(child.label);
    if (p === null || c === null) return null;
    return c < p ? 'left' : 'right';
  };

  const measure = (id: string): number => {
    const kids = shape.children.get(id)!;
    if (kids.length === 0) {
      slots.set(id, 1);
      return 1;
    }
    let total = kids.reduce((acc, k) => acc + measure(k), 0);
    if (kids.length === 1 && sideOf(byId.get(id)!, byId.get(kids[0])!) !== null) total += 1;
    slots.set(id, total);
    return total;
  };
  measure(shape.root);

  const out: Layout2D = {};
  const place = (id: string, depth: number, start: number) => {
    const width = slots.get(id)!;
    out[id] = { x: (start + width / 2) * opts.gapX, y: depth * opts.gapY };
    const kids = shape.children.get(id)!;
    if (kids.length === 0) return;
    let cursor = start;
    if (kids.length === 1) {
      const side = sideOf(byId.get(id)!, byId.get(kids[0])!);
      if (side === 'right') cursor += 1;
    }
    for (const k of kids) {
      place(k, depth + 1, cursor);
      cursor += slots.get(k)!;
    }
  };
  place(shape.root, 0, 0);
  return out;
}

function circularLayout(nodes: Node3D[]): Layout2D {
  const n = nodes.length;
  const out: Layout2D = {};
  if (n === 1) {
    out[nodes[0].id] = { x: 0, y: 0 };
    return out;
  }
  const radius = Math.max(110, n * 22);
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    out[node.id] = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  return out;
}

function linearLayout({ nodes, edges }: StructureState, opts: Required<LayoutOptions>): Layout2D {
  const next = new Map(edges.map((e) => [e.from, e.to]));
  const hasIncoming = new Set(edges.map((e) => e.to));
  const order: string[] = [];
  let cur: string | undefined = nodes.find((n) => !hasIncoming.has(n.id))?.id ?? nodes[0]?.id;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    order.push(cur);
    cur = next.get(cur);
  }
  for (const n of nodes) if (!seen.has(n.id)) order.push(n.id);
  const out: Layout2D = {};
  order.forEach((id, i) => {
    out[id] = { x: i * opts.gapX * 1.4, y: 0 };
  });
  return out;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(layout: Layout2D, padding = 0): Bounds {
  const pts = Object.values(layout);
  if (pts.length === 0) return { minX: -padding, minY: -padding, maxX: padding, maxY: padding };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  };
}

/** Dos nodos se solapan si sus discos de radio `radius` se cortan. */
export function overlappingPairs(layout: Layout2D, radius: number): [string, string][] {
  const entries = Object.entries(layout);
  const pairs: [string, string][] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, pa] = entries[i];
      const [b, pb] = entries[j];
      if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < 2 * radius) pairs.push([a, b]);
    }
  }
  return pairs;
}

export function edgeEndpoints(edge: Edge3D, layout: Layout2D): { from: Point2D; to: Point2D } | null {
  const from = layout[edge.from];
  const to = layout[edge.to];
  return from && to ? { from, to } : null;
}
