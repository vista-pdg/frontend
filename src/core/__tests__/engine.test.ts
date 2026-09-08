import { describe, expect, it, vi } from 'vitest';
import {
  RendererRegistry,
  VisualizationEngine,
  type EngineState,
  type ExecutionStep,
  type Renderer,
  type RenderFrame,
  type StructureState,
} from '@/core';
import { bst, completeGraph, trace } from './fixtures';

/** Adaptador de prueba: sólo anota lo que recibe. Es lo mínimo que el contrato permite. */
function fakeRenderer(id: '2D' | '3D') {
  let structure: StructureState = { nodes: [], edges: [] };
  let highlighted: string[] = [];
  const calls: string[] = [];
  const renderer: Renderer = {
    id,
    label: id,
    render(s) {
      structure = s;
      calls.push('render');
    },
    animateStep(step: ExecutionStep) {
      structure = { nodes: step.nodes, edges: step.edges };
      calls.push(`animateStep:${step.index}`);
    },
    highlight(ids: string[]) {
      highlighted = ids;
      calls.push('highlight');
    },
    clear() {
      structure = { nodes: [], edges: [] };
      highlighted = [];
      calls.push('clear');
    },
    snapshot() {
      return {
        nodeIds: structure.nodes.map((n) => n.id),
        edgeIds: structure.edges.map((e) => e.id),
        highlightedIds: highlighted,
        labels: Object.fromEntries(structure.nodes.map((n) => [n.id, n.label])),
      };
    },
  };
  return { renderer, calls };
}

function frames(state: EngineState): RenderFrame {
  return { structure: state.structure, highlight: state.highlight, stepIndex: state.stepIndex };
}

const VALUES = [10, 5, 15, 3, 7, 12, 20];

describe('VisualizationEngine — CA-4: independencia del núcleo', () => {
  it('arranca y opera sin ningún adaptador registrado', () => {
    const engine = new VisualizationEngine();
    expect(engine.activeRenderer()).toBeUndefined();
    expect(engine.availableModes()).toEqual([]);
    const { nodes, edges } = bst(VALUES);
    engine.loadStructure(nodes, edges);
    expect(engine.getState().structure.nodes).toHaveLength(7);
    engine.loadTrace(trace(VALUES));
    expect(engine.next()).toBe(true);
    expect(engine.getState().stepIndex).toBe(1);
    engine.clear();
    expect(engine.getState().structure.nodes).toHaveLength(0);
  });

  it('produce exactamente el mismo rastro de estados con y sin adaptador activo', () => {
    const bare = new VisualizationEngine();
    const withAdapter = new VisualizationEngine({
      registry: new RendererRegistry().register(fakeRenderer('3D').renderer),
    });
    const seen: RenderFrame[][] = [[], []];
    bare.subscribe((s) => seen[0].push(frames(s)));
    withAdapter.subscribe((s) => seen[1].push(frames(s)));

    for (const e of [bare, withAdapter]) {
      e.loadTrace(trace(VALUES));
      while (e.next()) {
        /* avanzar hasta el final */
      }
      e.prev();
      e.goTo(2);
    }
    expect(seen[0]).toEqual(seen[1]);
    expect(seen[0]).toHaveLength(1 + 6 + 1 + 1);
    expect(bare.frames()).toEqual(withAdapter.frames());
  });

  it('el rastro de cuadros derivado del rastro cargado no depende del paso actual', () => {
    const engine = new VisualizationEngine();
    engine.loadTrace(trace(VALUES));
    const before = engine.frames();
    engine.goTo(4);
    expect(engine.frames()).toEqual(before);
    expect(before.map((f) => f.stepIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(before[6].structure.nodes).toHaveLength(7);
  });
});

describe('VisualizationEngine — reenvío por el contrato', () => {
  it('render + highlight al cargar, animateStep + highlight al avanzar, clear al limpiar', () => {
    const { renderer, calls } = fakeRenderer('3D');
    const engine = new VisualizationEngine({ registry: new RendererRegistry().register(renderer) });
    const { nodes, edges } = bst(VALUES);
    engine.loadStructure(nodes, edges);
    expect(calls).toEqual(['render', 'highlight']);
    expect(renderer.snapshot().nodeIds).toHaveLength(7);

    calls.length = 0;
    engine.loadTrace(trace([1, 2, 3]));
    engine.next();
    expect(calls).toEqual(['render', 'highlight', 'animateStep:1', 'highlight']);
    expect(renderer.snapshot().highlightedIds).toEqual(['node-2']);

    calls.length = 0;
    engine.clear();
    expect(calls).toEqual(['clear']);
    expect(renderer.snapshot().nodeIds).toEqual([]);
  });

  it('goTo fuera de rango no cambia nada ni llama al adaptador', () => {
    const { renderer, calls } = fakeRenderer('3D');
    const engine = new VisualizationEngine({ registry: new RendererRegistry().register(renderer) });
    engine.loadTrace(trace([1, 2]));
    calls.length = 0;
    expect(engine.goTo(5)).toBe(false);
    expect(engine.goTo(-1)).toBe(false);
    expect(engine.prev()).toBe(false);
    expect(calls).toEqual([]);
    expect(engine.getState().stepIndex).toBe(0);
  });

  it('guarda el pseudocódigo del rastro (HU-22a) y lo suelta al limpiar o cargar otra estructura', () => {
    const engine = new VisualizationEngine();
    const code = ['inorden(nodo):', '  visitar(nodo)'];
    const steps = trace([2, 1, 3]).map((s, i) => ({ ...s, line: (i % 2) + 1 }));
    engine.loadTrace(steps, code);
    expect(engine.getState().code).toEqual(code);
    expect(engine.getState().trace[1].line).toBe(2);
    engine.goTo(2);
    expect(engine.getState().trace[engine.getState().stepIndex].line).toBe(1);
    engine.loadTrace(trace([1]));
    expect(engine.getState().code).toBeNull();
    engine.loadTrace(steps, code);
    engine.clear();
    expect(engine.getState().code).toBeNull();
    engine.loadTrace(steps, code);
    engine.loadStructure([], []);
    expect(engine.getState().code).toBeNull();
  });

  it('las variables y la pila de llamadas de cada paso viajan intactas por el motor (HU-22b)', () => {
    const engine = new VisualizationEngine();
    const steps = trace([2, 1]).map((s, i) => ({
      ...s,
      line: i + 1,
      variables: { nodo: String(i), salida: '[]' },
      callStack: [{ name: 'inorden', params: { nodo: String(i) } }],
    }));
    engine.loadTrace(steps, ['a', 'b']);
    engine.next();
    const current = engine.getState().trace[engine.getState().stepIndex];
    expect(current.variables).toEqual({ nodo: '1', salida: '[]' });
    expect(current.callStack).toEqual([{ name: 'inorden', params: { nodo: '1' } }]);
    expect(engine.frames()).toHaveLength(2);
  });

  it('un rastro vacío equivale a limpiar', () => {
    const engine = new VisualizationEngine();
    engine.loadStructure(bst([1]).nodes, []);
    engine.loadTrace([]);
    expect(engine.getState().structure.nodes).toEqual([]);
    expect(engine.getState().trace).toEqual([]);
  });

  it('highlight directo actualiza el estado y el adaptador', () => {
    const { renderer } = fakeRenderer('2D');
    const engine = new VisualizationEngine({
      registry: new RendererRegistry().register(renderer),
      initialMode: '2D',
    });
    engine.loadStructure(bst([2, 1, 3]).nodes, bst([2, 1, 3]).edges);
    engine.highlight(['node-3'], 'balanced');
    expect(engine.getState().highlight).toEqual({ ids: ['node-3'], type: 'balanced' });
    expect(renderer.snapshot().highlightedIds).toEqual(['node-3']);
  });
});

describe('VisualizationEngine — cambio de modo (CA-1, CA-2, CA-3)', () => {
  function twoModes() {
    const two = fakeRenderer('2D');
    const three = fakeRenderer('3D');
    const registry = new RendererRegistry().register(two.renderer).register(three.renderer);
    return { two, three, engine: new VisualizationEngine({ registry, initialMode: '3D' }) };
  }

  it('CA-1: al pasar de 3D a 2D el nuevo adaptador recibe la misma estructura, nodos, aristas y valores', () => {
    const { two, three, engine } = twoModes();
    const { nodes, edges } = bst(VALUES);
    engine.loadStructure(nodes, edges);
    const before = three.renderer.snapshot();

    expect(engine.setMode('2D')).toBe(true);
    const after = two.renderer.snapshot();
    expect(after.nodeIds).toEqual(before.nodeIds);
    expect(after.edgeIds).toEqual(before.edgeIds);
    expect(after.labels).toEqual(before.labels);
    expect(three.renderer.snapshot().nodeIds).toEqual([]);
    expect(engine.getState().structure).toEqual({ nodes, edges });
  });

  it('CA-2: cambiar de modo en el paso 5 deja la nueva vista en el paso 5 y la ejecución continúa', () => {
    const { two, engine } = twoModes();
    engine.loadTrace(trace(VALUES));
    engine.goTo(4);
    engine.setMode('2D');
    expect(engine.getState().stepIndex).toBe(4);
    expect(two.renderer.snapshot().nodeIds).toHaveLength(5);
    expect(two.renderer.snapshot().highlightedIds).toEqual(['node-7']);
    expect(engine.next()).toBe(true);
    expect(engine.getState().stepIndex).toBe(5);
    expect(engine.prev()).toBe(true);
    expect(engine.getState().stepIndex).toBe(4);
    expect(engine.getState().trace).toHaveLength(7);
  });

  it('CA-3: cinco alternancias con un grafo de 12 nodos no duplican ni pierden elementos', () => {
    const { two, three, engine } = twoModes();
    const { nodes, edges } = completeGraph(12);
    engine.loadStructure(nodes, edges);
    const expectedNodes = nodes.map((n) => n.id);
    const expectedEdges = edges.map((e) => e.id);
    for (let i = 0; i < 5; i++) {
      engine.setMode(i % 2 === 0 ? '2D' : '3D');
      const active = engine.activeRenderer()!.snapshot();
      const idle = (engine.getState().mode === '2D' ? three : two).renderer.snapshot();
      expect(active.nodeIds).toEqual(expectedNodes);
      expect(active.edgeIds).toEqual(expectedEdges);
      expect(new Set(active.nodeIds).size).toBe(12);
      expect(idle.nodeIds).toEqual([]);
      expect(idle.edgeIds).toEqual([]);
    }
    expect(engine.getState().structure.nodes).toEqual(nodes);
  });

  it('pedir el modo ya activo es idempotente y no repinta', () => {
    const { three, engine } = twoModes();
    engine.loadStructure(bst([1]).nodes, []);
    three.calls.length = 0;
    expect(engine.setMode('3D')).toBe(true);
    expect(three.calls).toEqual([]);
  });
});

describe('VisualizationEngine — WebGL (CA-6)', () => {
  it('sin WebGL arranca en 2D aunque se pida 3D y rechaza volver a 3D', () => {
    const engine = new VisualizationEngine({ initialMode: '3D', webglAvailable: false });
    expect(engine.getState().mode).toBe('2D');
    expect(engine.canUse('3D')).toBe(false);
    expect(engine.setMode('3D')).toBe(false);
    expect(engine.getState().mode).toBe('2D');
  });

  it('con WebGL respeta el modo inicial pedido', () => {
    expect(new VisualizationEngine({ initialMode: '2D' }).getState().mode).toBe('2D');
    expect(new VisualizationEngine().getState().mode).toBe('3D');
  });

  it('los suscriptores reciben cada cambio y se pueden dar de baja', () => {
    const engine = new VisualizationEngine();
    const spy = vi.fn();
    const off = engine.subscribe(spy);
    engine.loadStructure([], []);
    off();
    engine.loadStructure([], []);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
