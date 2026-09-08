import { describe, expect, it } from 'vitest';
import { boundsOf, detectLayoutKind, edgeEndpoints, layout2D, overlappingPairs, treeShapeOf } from '@/core';
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
  it('un grafo con ciclo no es árbol y se dispone en círculo', () => {
    const g = completeGraph(12);
    expect(treeShapeOf(g)).toBeNull();
    expect(detectLayoutKind(g)).toBe('circular');
    const layout = layout2D(g);
    expect(Object.keys(layout)).toHaveLength(12);
    expect(overlappingPairs(layout, NODE_RADIUS)).toEqual([]);
    const r = Math.hypot(layout.n0.x, layout.n0.y);
    for (const p of Object.values(layout)) expect(Math.hypot(p.x, p.y)).toBeCloseTo(r);
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
