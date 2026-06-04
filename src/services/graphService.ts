import http from '@/lib/http';
import type { StructureResponse, StepsResponse } from '@/types/graph';

export async function generateGraph(prompt: string): Promise<StructureResponse> {
  const { data } = await http.post<StructureResponse>('/generate', { prompt });

  if (data.error) {
    throw new Error(data.message ?? 'Error desconocido del servidor');
  }

  return data;
}

export async function fetchAlgorithmSteps(
  type: string,
  subtype: string,
  operation: string,
  values: number[]
): Promise<StepsResponse> {
  const { data } = await http.post<StepsResponse>('/algorithm/steps', {
    type,
    subtype,
    operation,
    values,
  });
  return data;
}
