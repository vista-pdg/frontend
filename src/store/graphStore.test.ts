import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlgorithmDescriptor, AlgorithmStep, StructureResponse } from '@/types/graph';

vi.mock('@/renderers/appEngine', async () => {
  const { VisualizationEngine } = await import('@/core');
  const engine = new VisualizationEngine({ initialMode: '2D' });
  return { engine, chooseMode: (m: '2D' | '3D') => engine.setMode(m), preferredMode: '2D', webglAvailable: true };
});
vi.mock('@/services/graphService', () => ({ generateGraphWithQuota: vi.fn() }));
vi.mock('@/services/algorithmService', () => ({ algorithmKey: (d: AlgorithmDescriptor) => `${d.type}/${d.subtype}/${d.operation}`, fetchCatalog: vi.fn(), runAlgorithm: vi.fn() }));
vi.mock('@/services/assistantService', () => ({ clearSession: vi.fn().mockResolvedValue(undefined), fetchQuota: vi.fn(), fetchSessionStatus: vi.fn().mockResolvedValue({ active: false, available: true }) }));
vi.mock('@/services/analyticsService', () => ({ reportAlgorithmCompleted: vi.fn(), reportAlgorithmProgress: vi.fn() }));
import { useGraphStore } from './graphStore';
import { generateGraphWithQuota } from '@/services/graphService';
import { runAlgorithm } from '@/services/algorithmService';
import { engine } from '@/renderers/appEngine';
import { reportAlgorithmProgress } from '@/services/analyticsService';

const avl: AlgorithmDescriptor = { type: 'tree', subtype: 'avl', operation: 'insert', family: 'tree', label: 'AVL', description: '', input: 'values' };
const pop: AlgorithmDescriptor = { ...avl, type: 'stack', subtype: 'simple', operation: 'pop', family: 'stack' };
const response: StructureResponse = { error: false, message: null, contract: null, nodes: [], edges: [], meta: { type: 'tree', subtype: 'avl', nodeCount: 0, edgeCount: 0, computedProperties: {} } };

describe('shared work context', () => {
  beforeEach(() => { useGraphStore.getState().clearAll(); vi.clearAllMocks(); });

  it('rejects a stack operation while AVL is selected and clears an incompatible selection', () => {
    useGraphStore.getState().setActiveStructureType('tree', 'avl');
    expect(() => useGraphStore.getState().selectAlgorithm(pop)).toThrow(/estructura/);
    useGraphStore.getState().selectAlgorithm(avl);
    useGraphStore.getState().setActiveStructureType('queue');
    expect(useGraphStore.getState().selectedAlgorithm).toBeNull();
    expect(useGraphStore.getState().steps).toEqual([]);
  });

  it('sends the selected subtype and ignores a chat reply after context changes', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof generateGraphWithQuota>>) => void;
    vi.mocked(generateGraphWithQuota).mockImplementation(() => new Promise(r => { resolve = r; }));
    useGraphStore.getState().setActiveStructureType('tree', 'avl');
    const pending = useGraphStore.getState().sendPrompt('10, 5, 3');
    expect(generateGraphWithQuota).toHaveBeenCalledWith('10, 5, 3', 'tree', 'avl');
    useGraphStore.getState().setActiveStructureType('stack');
    resolve({ structure: response, quota: null, memory: null });
    await pending;
    expect(useGraphStore.getState().activeStructureType).toBe('stack');
    expect(useGraphStore.getState().canvasContext).toBeNull();
    expect(useGraphStore.getState().loading).toBe(false);
    expect(engine.getState().meta).toBeNull();
  });

  it('ignores late algorithm steps when the structure changes', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof runAlgorithm>>) => void;
    vi.mocked(runAlgorithm).mockImplementation(() => new Promise(r => { resolve = r; }));
    useGraphStore.getState().selectAlgorithm(avl);
    const pending = useGraphStore.getState().runSelectedAlgorithm({ values: [3, 2, 1] });
    useGraphStore.getState().setActiveStructureType('stack');
    resolve({ error: false, message: null, steps: [], code: ['old code'] });
    await pending;
    expect(engine.getState().code).toBeNull();
    expect(useGraphStore.getState().stepsLoading).toBe(false);
  });
});

it('sends a scalar and the real canvas to a list operation after sorting', async () => {
  useGraphStore.getState().clearAll(); vi.clearAllMocks();
  useGraphStore.getState().setActiveStructureType('linked-list', 'circular');
  const descriptor: AlgorithmDescriptor = { type: 'linked-list', subtype: 'simple', operation: 'search', family: 'linked-list', label: 'Buscar', description: '', input: 'structure', parameter: 'target' };
  const node = { id: 'original', label: '7', x: 3, y: 2, z: 1, depth: 0, parent: null, properties: { sequence: true, index: 0 } };
  engine.loadStructure([node], [], { type: 'linked-list', subtype: 'circular', nodeCount: 1, edgeCount: 0, computedProperties: {} });
  useGraphStore.getState().selectAlgorithm(descriptor);
  vi.mocked(runAlgorithm).mockResolvedValue({ error: false, message: null, steps: [] });
  await useGraphStore.getState().runSelectedAlgorithm({ argument: 7 });
  expect(runAlgorithm).toHaveBeenCalledWith(expect.objectContaining({ argument: 7, nodes: [node], edges: [], type: 'linked-list' }));
});

describe('HU-06 correlated algorithm progress', () => {
  beforeEach(() => { useGraphStore.getState().clearAll(); vi.clearAllMocks(); });

  async function run(executionId: string) {
    useGraphStore.getState().selectAlgorithm(avl);
    const steps: AlgorithmStep[] = Array.from({ length: 3 }, (_, index) => ({
      index, title: `Paso ${index + 1}`, nodes: [], edges: [], description: `Paso ${index + 1}`,
      highlightedNodeIds: [], highlightType: 'visit', rotationType: null,
    }));
    vi.mocked(runAlgorithm).mockResolvedValue({ error: false, message: null, executionId, steps });
    await useGraphStore.getState().runSelectedAlgorithm({ values: [3, 2, 1] });
  }

  it('reports partial progress, keeps a high-water mark and does not count replays', async () => {
    await run('first-execution');
    expect(reportAlgorithmProgress).toHaveBeenLastCalledWith('first-execution', 1);
    useGraphStore.getState().nextStep();
    expect(reportAlgorithmProgress).toHaveBeenLastCalledWith('first-execution', 2);
    useGraphStore.getState().prevStep();
    useGraphStore.getState().nextStep();
    expect(reportAlgorithmProgress).toHaveBeenCalledTimes(2);
    useGraphStore.getState().nextStep();
    useGraphStore.getState().setCurrentStep(2);
    expect(reportAlgorithmProgress).toHaveBeenCalledTimes(3);
    expect(reportAlgorithmProgress).toHaveBeenLastCalledWith('first-execution', 3);
  });

  it('distinguishes two executions of the same algorithm and trace length', async () => {
    await run('first-execution');
    useGraphStore.getState().setCurrentStep(2);
    await run('second-execution');
    expect(reportAlgorithmProgress).toHaveBeenLastCalledWith('second-execution', 1);
    useGraphStore.getState().setCurrentStep(2);
    expect(reportAlgorithmProgress).toHaveBeenLastCalledWith('second-execution', 3);
  });

  it('detaches telemetry when the context or canvas is cleared', async () => {
    await run('first-execution');
    useGraphStore.getState().setActiveStructureType('stack');
    expect(useGraphStore.getState().activeExecutionId).toBeNull();
    useGraphStore.getState().clearAll();
    useGraphStore.getState().nextStep();
    expect(reportAlgorithmProgress).toHaveBeenCalledTimes(1);
  });
});

describe('canvas or values source', () => {
  const node = { id: 'original', label: '7', x: 3, y: 2, z: 1, depth: 0, parent: null, properties: { index: 0, role: 'top' } };
  beforeEach(() => {
    useGraphStore.getState().clearAll(); vi.clearAllMocks();
    engine.loadStructure([node], [], { type: 'stack', subtype: 'simple', nodeCount: 1, edgeCount: 0, computedProperties: {} });
    vi.mocked(runAlgorithm).mockResolvedValue({ error: false, message: null, steps: [] });
  });

  it('opening a values demo preserves the original figure', () => {
    useGraphStore.setState({ catalog: [pop] });
    useGraphStore.getState().openAlgorithmDemo('stack', 'simple', 'pop');
    expect(engine.getState().structure.nodes).toEqual([node]);
  });

  it('selecting a demo detaches the previous trace without clearing the current figure', () => {
    useGraphStore.getState().setActiveStructureType('stack');
    useGraphStore.setState({ catalog: [pop], canvasContext: { type: 'stack', subtype: 'simple' } });
    engine.loadTrace([{ index: 0, title: 'Previous', description: '', highlightType: 'initial', highlightedNodeIds: [], rotationType: null, nodes: [node], edges: [] }], ['previous code']);
    useGraphStore.getState().openAlgorithmDemo('stack', 'simple', 'pop');
    expect(engine.getState().trace).toEqual([]);
    expect(engine.getState().structure.nodes).toEqual([node]);
    expect(useGraphStore.getState().selectedAlgorithm).toEqual(pop);
  });

  it('uses the compatible canvas by default and excludes preset values', async () => {
    useGraphStore.getState().selectAlgorithm(pop);
    await useGraphStore.getState().runSelectedAlgorithm({ source: 'canvas', values: [99] });
    expect(runAlgorithm).toHaveBeenCalledWith(expect.objectContaining({ nodes: [node], edges: [], values: undefined }));
  });

  it('creates with values only when explicitly selected', async () => {
    useGraphStore.getState().selectAlgorithm(pop);
    await useGraphStore.getState().runSelectedAlgorithm({ source: 'values', values: [99] });
    expect(runAlgorithm).toHaveBeenCalledWith(expect.objectContaining({ values: [99], nodes: undefined, edges: undefined }));
  });

  it('rejects a mismatched canvas even when navigation matches the algorithm', async () => {
    useGraphStore.getState().setActiveStructureType('tree', 'avl');
    useGraphStore.getState().selectAlgorithm(avl);
    await expect(useGraphStore.getState().runSelectedAlgorithm({ source: 'canvas', argument: 3 })).rejects.toThrow(/compatible/);
    expect(runAlgorithm).not.toHaveBeenCalled();
    expect(engine.getState().structure.nodes).toEqual([node]);
  });
});
