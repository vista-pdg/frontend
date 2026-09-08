import http from '@/lib/http';
import type { StructureResponse } from '@/types/graph';
import type { QuotaStatus } from '@/types/auth';
import { memoryFromHeaders, quotaFromHeaders } from '@/services/assistantService';

export interface GenerateResult {
  structure: StructureResponse;
  /** Contador tras este mensaje, leído de las cabeceras X-Quota-* (HU-17). */
  quota: Pick<QuotaStatus, 'limit' | 'remaining' | 'resetsAt'> | null;
  /** ¿El servidor pudo recordar esta generación en la sesión? (HU-32). */
  memory: boolean | null;
}

export async function generateGraphWithQuota(prompt: string): Promise<GenerateResult> {
  const res = await http.post<StructureResponse>('/generate', { prompt });
  if (res.data.error) {
    throw new Error(res.data.message ?? 'Error desconocido del servidor');
  }
  const headers = res.headers as Record<string, unknown>;
  return { structure: res.data, quota: quotaFromHeaders(headers), memory: memoryFromHeaders(headers) };
}

export async function generateGraph(prompt: string): Promise<StructureResponse> {
  const { data } = await http.post<StructureResponse>('/generate', { prompt });

  if (data.error) {
    throw new Error(data.message ?? 'Error desconocido del servidor');
  }

  return data;
}
