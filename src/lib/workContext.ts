import type { AlgorithmDescriptor } from '@/types/graph';

export const STRUCTURES = [
  { key: 'graph', type: 'graph', subtype: null, label: 'Grafo' },
  { key: 'tree/avl', type: 'tree', subtype: 'avl', label: 'Árbol AVL' },
  { key: 'tree/bst', type: 'tree', subtype: 'bst', label: 'Árbol BST' },
  { key: 'tree/btree', type: 'tree', subtype: 'btree', label: 'B-árbol' },
  { key: 'tree/heap', type: 'tree', subtype: 'heap', label: 'Heap' },
  { key: 'stack', type: 'stack', subtype: null, label: 'Pila' },
  { key: 'queue', type: 'queue', subtype: null, label: 'Cola' },
  { key: 'linked-list', type: 'linked-list', subtype: null, label: 'Lista enlazada' },
  { key: 'hash-table', type: 'hash-table', subtype: null, label: 'Tabla hash' },
] as const;

export function contextKey(type: string | null, subtype: string | null) {
  return subtype ? `${type}/${subtype}` : type ?? '';
}

export function algorithmFitsContext(d: AlgorithmDescriptor, type: string | null, subtype: string | null) {
  if (!type) return true;
  // Inorder accepts AVL's binary-tree shape as well as BST; B-trees do not share that contract.
  return d.type === type && (!subtype || d.subtype === subtype || (subtype === 'avl' && d.operation === 'inorder'));
}

/** Heaps share the tree data contract but have a separate, exclusive navigation item. */
export function navigationFamily(type: string | null, subtype: string | null) {
  return type === 'tree' && subtype === 'heap' ? 'heap' : type;
}
