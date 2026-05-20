import http from '@/lib/http';
import type { StructureResponse } from '@/types/graph';

export async function generateGraph(prompt: string): Promise<StructureResponse> {
  const { data } = await http.post<StructureResponse>('/generate', { prompt });

  if (data.error) {
    throw new Error(data.message ?? 'Error desconocido del servidor');
  }

  return data;
}
