import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  detectLayoutKind,
  edgeEndpoints,
  forceLayout,
  isQueue,
  isStack,
  layout2D,
  structureFitsFamily,
  overlappingPairs,
  treeShapeOf,
} from '@/core';
import { bst, completeGraph, edge, node } from './fixtures';

const NODE_RADIUS = 22;

describe('layout2D — árboles', () => {
  it('un BST de 15 nodos se dispone por niveles sin solapes', () => {
    const structure = bst([50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93]);
    expect(detectLayoutKind(structure)).toBe('tree');
    const layout = layout2D(structure);
    expect(Object.keys(layout)).toHaveLength(15);
    expect(overlappingPairs(layout, NODE_RADIUS)).toEqual([]);
    const depthOf = new Map(structure.nodes.map((n) => [n.id, n.depth]));
    for (const [id, p] of Object.entries(layout)) {
      expect(p.y).toBe(depthOf.get(id)! * 96);
    }
  });

  it('el padre queda centrado sobre sus hijos y el hijo menor a la izquierda', () => {
    const layout = layout2D(bst([10, 5, 15]));
    expect(layout['node-5'].x).toBeLessThan(layout['node-10'].x);
    expect(layout['node-15'].x).toBeGreaterThan(layout['node-10'].x);
    expect(layout['node-10'].x).toBeCloseTo((layout['node-5'].x + layout['node-15'].x) / 2);
  });

  it('un hijo único conserva su lado: un BST degenerado a la derecha se lee como escalera', () => {
    const layout = layout2D(bst([1, 2, 3, 4]));
    expect(layout['node-2'].x).toBeGreaterThan(layout['node-1'].x);
    expect(layout['node-3'].x).toBeGreaterThan(layout['node-2'].x);
    const left = layout2D(bst([4, 3, 2, 1]));
    expect(left['node-3'].x).toBeLessThan(left['node-4'].x);
    expect(overlappingPairs(layout, NODE_RADIUS)).toEqual([]);
  });

  it('el resultado es determinista', () => {
    const s = bst([8, 3, 10, 1, 6, 14, 4, 7, 13]);
    expect(layout2D(s)).toEqual(layout2D(s));
  });

  it('con etiquetas no numéricas un hijo único cae bajo el padre', () => {
    const structure = {
      nodes: [node('a', 'raíz'), node('b', 'hoja', { parent: 'a', depth: 1 })],
      edges: [edge('a', 'b')],
    };
    const layout = layout2D(structure);
    expect(layout.a.x).toBeCloseTo(layout.b.x);
  });
});

describe('layout2D — detección de forma', () => {
  it('un grafo con ciclo no es árbol: hasta 3 nodos en círculo, más grandes por fuerzas', () => {
    const k3 = completeGraph(3);
    expect(treeShapeOf(k3)).toBeNull();
    expect(detectLayoutKind(k3)).toBe('circular');
    const small = layout2D(k3);
    const r = Math.hypot(small.n0.x, small.n0.y);
    for (const p of Object.values(small)) expect(Math.hypot(p.x, p.y)).toBeCloseTo(r);

    const g = completeGraph(12);
    expect(detectLayoutKind(g)).toBe('force');
    const layout = layout2D(g);
    expect(Object.keys(layout)).toHaveLength(12);
    expect(overlappingPairs(layout, NODE_RADIUS)).toEqual([]);
  });

  it('dos raíces o una arista hacia un nodo inexistente no forman árbol', () => {
    expect(treeShapeOf({ nodes: [node('a'), node('b')], edges: [] })).toBeNull();
    expect(treeShapeOf({ nodes: [node('a')], edges: [edge('a', 'zz')] })).toBeNull();
    expect(treeShapeOf({ nodes: [node('a'), node('b')], edges: [edge('a', 'b'), edge('b', 'a')] })).toBeNull();
  });

  it('una cadena se dispone en línea siguiendo las aristas', () => {
    const chain = {
      nodes: [node('c'), node('a'), node('b')],
      edges: [edge('a', 'b'), edge('b', 'c')],
    };
    // Una cadena es también un árbol (raíz única): la forma más específica gana.
    expect(detectLayoutKind(chain)).toBe('tree');
    const cycleFree = { nodes: [node('a'), node('b'), node('c')], edges: [edge('a', 'b', false), edge('b', 'c', false)] };
    expect(detectLayoutKind(cycleFree)).toBe('tree');
  });

  it('un nodo solo y el vacío no fallan', () => {
    const solo = layout2D({ nodes: [node('solo')], edges: [] });
    expect(Object.keys(solo)).toEqual(['solo']);
    expect(solo.solo.y).toBe(0);
    expect(layout2D({ nodes: [], edges: [] })).toEqual({});
    expect(detectLayoutKind({ nodes: [], edges: [] })).toBe('circular');
  });

  it('una lista con dos componentes cae en lineal y ordena por las aristas', () => {
    const s = {
      nodes: [node('b'), node('a'), node('d'), node('c')],
      edges: [edge('a', 'b'), edge('c', 'd')],
    };
    expect(detectLayoutKind(s)).toBe('linear');
    const layout = layout2D(s);
    expect(layout.a.x).toBeLessThan(layout.b.x);
    expect(new Set(Object.values(layout).map((p) => p.x)).size).toBe(4);
  });
});

describe('layout2D — fuerzas (HU-19)', () => {
  function cycle(n: number) {
    const nodes = Array.from({ length: n }, (_, i) => node(`v${i}`, `V${i + 1}`));
    const edges = nodes.map((_, i) => edge(`v${i}`, `v${(i + 1) % n}`, false));
    return { nodes, edges };
  }

  it('C12 y K6 quedan sin solapes y con las aristas de longitud razonable', () => {
    for (const s of [cycle(12), completeGraph(6), cycle(20)]) {
      expect(overlappingPairs(forceLayout(s), NODE_RADIUS), `${s.nodes.length} nodos`).toEqual([]);
    }
    // En un ciclo ninguna arista cruza el dibujo de punta a punta: la atracción mantiene a los
    // vecinos cerca. (En un grafo completo las aristas largas son inevitables.)
    for (const s of [cycle(12), cycle(20)]) {
      const layout = forceLayout(s);
      const b = boundsOf(layout);
      const diagonal = Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
      for (const e of s.edges) {
        const p = layout[e.from];
        const q = layout[e.to];
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(diagonal * 0.6);
      }
    }
  });

  it('es determinista y queda centrada en el origen', () => {
    const s = cycle(9);
    const a = forceLayout(s);
    const b = forceLayout(s);
    expect(a).toEqual(b);
    const pts = Object.values(a);
    const cx = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
    const cy = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
    expect(Math.abs(cx)).toBeLessThan(0.01);
    expect(Math.abs(cy)).toBeLessThan(0.01);
  });

  it('ignora aristas hacia nodos inexistentes y bucles, y no falla con 0/1/2 nodos', () => {
    expect(forceLayout({ nodes: [], edges: [] })).toEqual({});
    expect(forceLayout({ nodes: [node('a')], edges: [] })).toEqual({ a: { x: 0, y: 0 } });
    const two = forceLayout({ nodes: [node('a'), node('b')], edges: [edge('a', 'a'), edge('a', 'zz')] });
    expect(Object.keys(two)).toEqual(['a', 'b']);
    expect(Math.hypot(two.a.x - two.b.x, two.a.y - two.b.y)).toBeGreaterThan(2 * NODE_RADIUS);
  });
});

describe('layout2D — pila y cola (HU-19)', () => {
  const stack = {
    nodes: [
      node('n0', '3', { properties: { index: 0, role: 'bottom' } }),
      node('n1', '42', { properties: { index: 1, role: 'middle' } }),
      node('n2', '8', { properties: { index: 2, role: 'middle' } }),
      node('n3', '17', { properties: { index: 3, role: 'top' } }),
    ],
    edges: [],
  };
  const queue = {
    nodes: [
      node('n0', '5', { properties: { index: 0, role: 'front' } }),
      node('n1', '9', { properties: { index: 1, role: 'middle' } }),
      node('n2', '14', { properties: { index: 2, role: 'rear' } }),
    ],
    edges: [edge('n0', 'n1'), edge('n1', 'n2')],
  };

  it('la pila se apila en una columna con el tope arriba', () => {
    expect(isStack(stack)).toBe(true);
    expect(detectLayoutKind(stack)).toBe('stack');
    const layout = layout2D(stack);
    expect(new Set(Object.values(layout).map((p) => p.x)).size).toBe(1);
    expect(layout.n3.y).toBeLessThan(layout.n2.y);
    expect(layout.n0.y).toBeGreaterThan(layout.n1.y);
    expect(layout.n0.y, 'la base anclada en el origen').toBe(0);
    // Tras un pop la base no se mueve y el nuevo tope ocupa la altura del anterior menos una celda.
    const popped = layout2D({
      nodes: [stack.nodes[0], stack.nodes[1], node('n2', '8', { properties: { index: 2, role: 'top' } })],
      edges: [],
    });
    expect(popped.n0).toEqual(layout.n0);
    expect(popped.n2.y).toBeGreaterThan(layout.n3.y);
    expect(overlappingPairs(layout, NODE_RADIUS)).toEqual([]);
  });

  it('la cola es una fila con el frente a la izquierda', () => {
    expect(isQueue(queue)).toBe(true);
    expect(detectLayoutKind(queue)).toBe('queue');
    const layout = layout2D(queue);
    expect(new Set(Object.values(layout).map((p) => p.y)).size).toBe(1);
    expect(layout.n0.x).toBeLessThan(layout.n1.x);
    expect(layout.n1.x).toBeLessThan(layout.n2.x);
  });

  it('una pila o cola de un solo elemento se reconoce por su único rol', () => {
    expect(isStack({ nodes: [node('n0', '7', { properties: { index: 0, role: 'top' } })], edges: [] })).toBe(true);
    expect(isQueue({ nodes: [node('n0', '7', { properties: { index: 0, role: 'front' } })], edges: [] })).toBe(true);
    expect(isStack({ nodes: [node('a')], edges: [] })).toBe(false);
    expect(isQueue({ nodes: [], edges: [] })).toBe(false);
  });
});

describe('structureFitsFamily (HU-22b)', () => {
  const stack = {
    nodes: [
      node('n0', '3', { properties: { index: 0, role: 'bottom' } }),
      node('n1', '8', { properties: { index: 1, role: 'top' } }),
    ],
    edges: [],
  };
  const queue = {
    nodes: [node('n0', '5', { properties: { index: 0, role: 'front' } }), node('n1', '9', { properties: { index: 1, role: 'rear' } })],
    edges: [edge('n0', 'n1')],
  };

  it('un árbol sirve para árboles y grafos; un grafo sólo para grafos', () => {
    const tree = bst([10, 5, 15]);
    const graph = completeGraph(4);
    expect(structureFitsFamily('tree', tree)).toBe(true);
    expect(structureFitsFamily('graph', tree)).toBe(true);
    expect(structureFitsFamily('tree', graph)).toBe(false);
    expect(structureFitsFamily('graph', graph)).toBe(true);
  });

  it('pilas y colas sólo encajan con su familia y nunca como árbol o grafo', () => {
    expect(structureFitsFamily('stack', stack)).toBe(true);
    expect(structureFitsFamily('queue', queue)).toBe(true);
    expect(structureFitsFamily('tree', queue)).toBe(false);
    expect(structureFitsFamily('graph', queue)).toBe(false);
    expect(structureFitsFamily('graph', stack)).toBe(false);
    expect(structureFitsFamily('stack', queue)).toBe(false);
  });

  it('el lienzo vacío no encaja con nada; una familia desconocida acepta cualquier estructura', () => {
    expect(structureFitsFamily('tree', { nodes: [], edges: [] })).toBe(false);
    expect(structureFitsFamily('otra', completeGraph(3))).toBe(true);
  });
});

describe('layout2D — utilidades', () => {
  it('boundsOf envuelve todos los puntos con el margen pedido', () => {
    const b = boundsOf({ a: { x: -10, y: 5 }, b: { x: 30, y: -20 } }, 4);
    expect(b).toEqual({ minX: -14, minY: -24, maxX: 34, maxY: 9 });
    expect(boundsOf({}, 10)).toEqual({ minX: -10, minY: -10, maxX: 10, maxY: 10 });
  });

  it('edgeEndpoints devuelve nulo si falta un extremo', () => {
    const layout = { a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
    expect(edgeEndpoints(edge('a', 'b'), layout)).toEqual({ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } });
    expect(edgeEndpoints(edge('a', 'zz'), layout)).toBeNull();
  });
});
