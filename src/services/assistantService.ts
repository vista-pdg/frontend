import http from '@/lib/http';
import type { QuotaStatus, SessionStatus } from '@/types/auth';

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

/** Estado de la sesión de trabajo del asistente (HU-32): si recuerda algo y cuánto le queda. */
export async function fetchSessionStatus(): Promise<SessionStatus> {
  const { data } = await http.get<SessionStatus>('/assistant/session');
  return data;
}

/** Olvida la estructura vigente en el servidor. Lo llama «Limpiar» (HU-32 · CA-7). */
export async function clearSession(): Promise<void> {
  await http.delete('/assistant/session');
}

/**
 * Cabecera `X-Assistant-Memory` de /api/generate: dice si el servidor pudo recordar esta
 * generación. `null` cuando el servidor no la envía (versión anterior).
 */
export function memoryFromHeaders(headers: Record<string, unknown>): boolean | null {
  const value = headers['x-assistant-memory'];
  if (typeof value !== 'string') return null;
  return value === 'active';
}
