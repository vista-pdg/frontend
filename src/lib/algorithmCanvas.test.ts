import { expect, it } from 'vitest';
import { algorithmFitsCanvas } from './algorithmCanvas';
import type { AlgorithmDescriptor } from '@/types/graph';

const inorder: AlgorithmDescriptor = { type: 'tree', subtype: 'bst', operation: 'inorder', family: 'tree', label: '', description: '', input: 'structure' };
const shape = { nodes: [{ id: 'a', label: '7', x: 0, y: 0, z: 0, depth: 0, parent: null, properties: {} }], edges: [] };
it('uses actual type and subtype as well as shape', () => {
  expect(algorithmFitsCanvas(inorder, shape, { type: 'tree', subtype: 'avl' })).toBe(true);
  expect(algorithmFitsCanvas(inorder, shape, { type: 'tree', subtype: 'btree' })).toBe(false);
  expect(algorithmFitsCanvas(inorder, shape, { type: 'graph', subtype: 'simple' })).toBe(false);
  expect(algorithmFitsCanvas(inorder, { nodes: [], edges: [] }, { type: 'tree', subtype: 'bst' })).toBe(false);
});
