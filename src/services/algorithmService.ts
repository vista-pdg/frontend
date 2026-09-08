import http from '@/lib/http';
import type { AlgorithmDescriptor, Edge3D, Node3D, StepsResponse } from '@/types/graph';

/** Petición de pasos (HU-19): valores para los que construyen, estructura para los que recorren. */
export interface AlgorithmRunRequest {
  type: string;
  subtype: string;
  operation: string;
  values?: number[];
  nodes?: Node3D[];
  edges?: Edge3D[];
  start?: string;
}

export function algorithmKey(d: Pick<AlgorithmDescriptor, 'type' | 'subtype' | 'operation'>): string {
  return `${d.type}/${d.subtype}/${d.operation}`;
}

/** El catálogo es del servidor: la misma lista llegue de donde llegue (CA-4). */
export async function fetchCatalog(): Promise<AlgorithmDescriptor[]> {
  const { data } = await http.get<AlgorithmDescriptor[]>('/algorithm/catalog');
  return data;
}

export async function runAlgorithm(req: AlgorithmRunRequest): Promise<StepsResponse> {
  const { data } = await http.post<StepsResponse>('/algorithm/steps', req);
  return data;
}
