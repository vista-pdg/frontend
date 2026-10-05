import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlgorithmDescriptor, StructureResponse } from '@/types/graph';

vi.mock('@/renderers/appEngine', async () => {
  const { VisualizationEngine } = await import('@/core');
  const engine = new VisualizationEngine({ initialMode: '2D' });
  return { engine, chooseMode: (m: '2D' | '3D') => engine.setMode(m), preferredMode: '2D', webglAvailable: true };
});
vi.mock('@/services/graphService', () => ({ generateGraphWithQuota: vi.fn() }));
vi.mock('@/services/algorithmService', () => ({ algorithmKey: (d: AlgorithmDescriptor) => `${d.type}/${d.subtype}/${d.operation}`, fetchCatalog: vi.fn(), runAlgorithm: vi.fn() }));
vi.mock('@/services/assistantService', () => ({ clearSession: vi.fn().mockResolvedValue(undefined), fetchQuota: vi.fn(), fetchSessionStatus: vi.fn().mockResolvedValue({ active: false, available: true }) }));
vi.mock('@/services/analyticsService', () => ({ reportAlgorithmCompleted: vi.fn() }));
import { useGraphStore } from './graphStore';
import { generateGraphWithQuota } from '@/services/graphService';
import { runAlgorithm } from '@/services/algorithmService';
import { engine } from '@/renderers/appEngine';

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
  engine.loadStructure([node], [], null);
  useGraphStore.getState().selectAlgorithm(descriptor);
  vi.mocked(runAlgorithm).mockResolvedValue({ error: false, message: null, steps: [] });
  await useGraphStore.getState().runSelectedAlgorithm({ argument: 7 });
  expect(runAlgorithm).toHaveBeenCalledWith(expect.objectContaining({ argument: 7, nodes: [node], edges: [], type: 'linked-list' }));
});
