import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/http';
import { GENERATION_RETRY_DELAYS_MS, KEEPS_BANK, generationFailure } from '@/lib/quiz';
import { generateBankBatch } from '@/services/quizService';
import type { GenerateBatchResponse } from '@/types/quiz';

export type BankGeneration =
  | { status: 'idle' }
  /** `retry`: reintento en curso tras un fallo transitorio (1 = primero). */
  | { status: 'running'; retry?: number }
  | { status: 'paused' }
  | { status: 'error'; message: string }
  | { status: 'complete' };

export interface BankProgress {
  bankSize: number;
  bankTarget: number;
}

/** Lotes seguidos sin ninguna pregunta válida antes de rendirse: el modelo no está colaborando. */
const MAX_EMPTY_BATCHES = 3;

/** Espera cancelable: pausar durante un reintento no debe dejar un temporizador vivo. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

/**
 * Genera el banco pidiendo lotes al servidor hasta completarlo (HU-34 · CA-2). El progreso vive en
 * el servidor: pausar, cerrar la página o un fallo conservan lo ya generado y la generación se
 * reanuda desde donde quedó.
 *
 * <p>Un banco de 60 preguntas son 15 o más peticiones seguidas; un corte breve de red o un 503 del
 * modelo en una sola de ellas no debe detenerlo todo. Esos fallos se reintentan solos con espera
 * creciente, y solo si persisten se muestra el error con su causa.
 *
 * <p>HU-35: los quizzes de estudio generan igual, con su propio endpoint (`request`) y su propio
 * texto de lo que se conserva (`keeps`).
 */
export function useBankGeneration(
  quizId: number | null,
  onProgress: (progress: BankProgress) => void,
  request: (id: number, signal: AbortSignal) => Promise<GenerateBatchResponse> = generateBankBatch,
  keeps: string = KEEPS_BANK,
) {
  const [state, setState] = useState<BankGeneration>({ status: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const notify = useRef(onProgress);
  useEffect(() => { notify.current = onProgress; }, [onProgress]);
  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(async (id: number | null = quizId) => {
    if (id === null || controller.current) return;
    const run = new AbortController();
    controller.current = run;
    setState({ status: 'running' });
    let empty = 0;
    let failures = 0;
    try {
      for (;;) {
        try {
          const batch = await request(id, run.signal);
          if (run.signal.aborted) return;
          if (failures > 0) setState({ status: 'running' });
          failures = 0;
          notify.current({ bankSize: batch.bankSize, bankTarget: batch.bankTarget });
          if (batch.complete) return setState({ status: 'complete' });
          empty = batch.generated === 0 ? empty + 1 : 0;
          if (empty >= MAX_EMPTY_BATCHES) {
            return setState({ status: 'error', message: 'El modelo no produjo preguntas válidas en varios intentos. Reanuda la generación en unos minutos.' });
          }
        } catch (error) {
          if (run.signal.aborted) return;
          const failure = error instanceof ApiError
            ? generationFailure(error.status, error.message, error.code, keeps)
            : generationFailure(undefined, undefined, undefined, keeps);
          if (!failure.retryable || failures >= GENERATION_RETRY_DELAYS_MS.length) {
            return setState({ status: 'error', message: failure.message });
          }
          failures += 1;
          setState({ status: 'running', retry: failures });
          await wait(GENERATION_RETRY_DELAYS_MS[failures - 1], run.signal);
          if (run.signal.aborted) return;
        }
      }
    } finally {
      if (controller.current === run) controller.current = null;
    }
  }, [quizId, request, keeps]);

  const pause = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState({ status: 'paused' });
  }, []);

  return { state, start, pause };
}
