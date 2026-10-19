import { structureFitsFamily, type StructureState } from '@/core';
import type { AlgorithmDescriptor } from '@/types/graph';
import { algorithmFitsContext } from './workContext';

type CanvasContext = { type: string; subtype: string | null };

/** Check the actual canvas identity, not the navigation selection for the next operation. */
export function algorithmFitsCanvas(algorithm: AlgorithmDescriptor, structure: StructureState, context: CanvasContext | null) {
  if (!structureFitsFamily(algorithm.family, structure)) return false;
  return context !== null && algorithmFitsContext(algorithm, context.type, context.subtype);
}

export function canvasParameter(algorithm: AlgorithmDescriptor): 'target' | 'value' | null {
  return algorithm.parameter ?? (algorithm.input === 'values' && ['insert', 'push', 'enqueue'].includes(algorithm.operation) ? 'value' : null);
}
