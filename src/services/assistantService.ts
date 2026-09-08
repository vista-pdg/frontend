import http from '@/lib/http';
import type { QuotaStatus } from '@/types/auth';

/** Estado de la cuota del usuario autenticado; se pide al entrar al lienzo (HU-17 CA-5). */
export async function fetchQuota(): Promise<QuotaStatus> {
  const { data } = await http.get<QuotaStatus>('/assistant/quota');
  return data;
}

/**
 * Las cabeceras X-Quota-* que /api/generate añade a cada respuesta. Permiten actualizar el
 * contador sin una petición extra. Devuelve null si el servidor no las envió.
 */
export function quotaFromHeaders(
  headers: Record<string, unknown>
): Pick<QuotaStatus, 'limit' | 'remaining' | 'resetsAt'> | null {
  const limit = Number(headers['x-quota-limit']);
  const remaining = Number(headers['x-quota-remaining']);
  const resetsAt = headers['x-quota-reset'];
  if (!Number.isFinite(limit) || !Number.isFinite(remaining) || typeof resetsAt !== 'string') {
    return null;
  }
  return { limit, remaining, resetsAt };
}
