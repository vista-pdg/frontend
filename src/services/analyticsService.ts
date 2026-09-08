import http from '@/lib/http';

/**
 * Instrumentación del cliente (HU-21 · CA-2).
 *
 * <p>El servidor sabe cuántos pasos entregó, pero no cuántos recorrió el estudiante: eso sólo lo
 * sabe el navegador. Este es el único hecho que el cliente reporta, y el payload es mínimo a
 * propósito: el seudónimo, el curso, la sesión y la hora los pone el servidor.
 */
export interface AlgorithmCompletedEvent {
  type: string;
  subtype?: string | null;
  algorithm: string;
  stepCount: number;
  nodeCount: number;
}

/** Nunca lanza: la telemetría no puede estropear la experiencia que está midiendo. */
export async function reportAlgorithmCompleted(event: AlgorithmCompletedEvent): Promise<void> {
  try {
    await http.post('/assistant/events', { event: 'algorithm_completed', ...event });
  } catch {
    /* el servidor ya lo registra en su log; el estudiante no tiene nada que hacer con esto */
  }
}
