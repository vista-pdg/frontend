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

export type LayoutKind = 'tree' | 'circular' | 'linear' | 'force' | 'stack' | 'queue';

export interface LayoutOptions {
  /** Separación horizontal entre hojas del árbol / entre elementos de una lista. */
  gapX?: number;
  /** Separación vertical entre niveles del árbol. */
  gapY?: number;
}

const DEFAULTS: Required<LayoutOptions> = { gapX: 72, gapY: 96 };

/** Separación entre elementos apilados / encolados (cajas de 2·R con margen). */
const CELL = 56;

function roleOf(n: Node3D): string | undefined {
  const r = n.properties?.role;
  return typeof r === 'string' ? r : undefined;
}

/** Pila: el generador marca `top`/`bottom`; una pila de uno sólo trae `top`. */
export function isStack(structure: StructureState): boolean {
  const { nodes, edges } = structure;
  if (nodes.length === 0 || edges.length > 0) return false;
  const roles = new Set(nodes.map(roleOf));
  return roles.has('top') && (nodes.length === 1 || roles.has('bottom'));
}

/** Cola: `front`/`rear` y una cadena de aristas del frente al final. */
export function isQueue(structure: StructureState): boolean {
  const { nodes } = structure;
  if (nodes.length === 0) return false;
  const roles = new Set(nodes.map(roleOf));
  return roles.has('front') && (nodes.length === 1 || roles.has('rear'));
}

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
  if (isStack(structure)) return 'stack';
  if (isQueue(structure)) return 'queue';
  if (treeShapeOf(structure)) return 'tree';
  if (isChain(structure)) return 'linear';
  return structure.nodes.length <= 3 ? 'circular' : 'force';
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
    case 'stack':
      return stackLayout(structure.nodes);
    case 'queue':
      return queueLayout(structure.nodes);
    case 'force':
      return forceLayout(structure);
    default:
      return circularLayout(structure.nodes);
  }
}

/** Índice de apilado: `properties.index` si viene, si no la posición en la lista. */
function indexOf(n: Node3D, fallback: number): number {
  const i = n.properties?.index;
  return typeof i === 'number' ? i : fallback;
}

/**
 * La base queda anclada en y = 0 y la pila crece hacia arriba (y negativa). Anclar la base y no
 * el tope es lo que hace que un `pop` se vea como "quitar el de arriba" en vez de desplazar toda
 * la columna.
 */
function stackLayout(nodes: Node3D[]): Layout2D {
  const out: Layout2D = {};
  nodes.forEach((node, i) => {
    out[node.id] = { x: 0, y: -(indexOf(node, i) * CELL) || 0 };
  });
  return out;
}

/** El frente a la izquierda, el final a la derecha. */
function queueLayout(nodes: Node3D[]): Layout2D {
  const out: Layout2D = {};
  nodes.forEach((node, i) => {
    out[node.id] = { x: indexOf(node, i) * CELL * 1.6, y: 0 };
  });
  return out;
}

/** Generador congruente lineal: la misma semilla produce siempre la misma disposición. */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Fuerzas (Fruchterman–Reingold simplificado, HU-19): repulsión entre todos los pares, atracción
 * por arista, temperatura decreciente. Arranca de un círculo perturbado por una semilla fija, así que
 * es determinista: el cambio de modo y las pruebas no mueven los nodos. Al final se separa cualquier
 * par que quede a menos de un diámetro y se recentra en el origen.
 */
export function forceLayout(structure: StructureState, iterations = 300): Layout2D {
  const { nodes, edges } = structure;
  const n = nodes.length;
  if (n === 0) return {};
  if (n === 1) return { [nodes[0].id]: { x: 0, y: 0 } };
  const rand = seeded(n * 7919 + edges.length);
  const area = Math.max(360, n * 90);
  const k = Math.sqrt((area * area) / n) * 0.9;
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const pos = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = area / 2.6;
    return { x: r * Math.cos(angle) + (rand() - 0.5) * 8, y: r * Math.sin(angle) + (rand() - 0.5) * 8 };
  });
  const links = edges
    .map((e) => [index.get(e.from), index.get(e.to)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined && p[0] !== p[1]);

  let temperature = area / 6;
  const cool = temperature / (iterations + 1);
  for (let it = 0; it < iterations; it++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          dx = rand() - 0.5;
          dy = rand() - 0.5;
          d = Math.hypot(dx, dy);
        }
        const f = (k * k) / d;
        disp[i].x += (dx / d) * f;
        disp[i].y += (dy / d) * f;
        disp[j].x -= (dx / d) * f;
        disp[j].y -= (dy / d) * f;
      }
    }
    for (const [a, b] of links) {
      const dx = pos[a].x - pos[b].x;
      const dy = pos[a].y - pos[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = (d * d) / k;
      disp[a].x -= (dx / d) * f;
      disp[a].y -= (dy / d) * f;
      disp[b].x += (dx / d) * f;
      disp[b].y += (dy / d) * f;
    }
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      const step = Math.min(d, temperature);
      pos[i].x += (disp[i].x / d) * step;
      pos[i].y += (disp[i].y / d) * step;
    }
    temperature = Math.max(temperature - cool, 1);
  }

  // Garantía final de no solape: separa pares a menos de un diámetro (con margen).
  const minDist = 2 * 22 + 14;
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < minDist) {
          const push = (minDist - d) / 2 + 0.5;
          pos[i].x -= (dx / d) * push;
          pos[i].y -= (dy / d) * push;
          pos[j].x += (dx / d) * push;
          pos[j].y += (dy / d) * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  const cx = pos.reduce((a, p) => a + p.x, 0) / n;
  const cy = pos.reduce((a, p) => a + p.y, 0) / n;
  const out: Layout2D = {};
  nodes.forEach((node, i) => {
    out[node.id] = { x: Math.round((pos[i].x - cx) * 100) / 100, y: Math.round((pos[i].y - cy) * 100) / 100 };
  });
  return out;
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
