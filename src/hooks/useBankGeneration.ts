import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/http';
import { generateBankBatch } from '@/services/quizService';

export type BankGeneration =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'paused' }
  | { status: 'error'; message: string }
  | { status: 'complete' };

export interface BankProgress {
  bankSize: number;
  bankTarget: number;
}

/** Lotes seguidos sin ninguna pregunta válida antes de rendirse: el modelo no está colaborando. */
const MAX_EMPTY_BATCHES = 3;

/**
 * Genera el banco pidiendo lotes al servidor hasta completarlo (HU-34 · CA-2). El progreso vive en
 * el servidor: pausar, cerrar la página o un fallo del modelo conservan lo ya generado y la
 * generación se reanuda desde donde quedó.
 */
export function useBankGeneration(quizId: number | null, onProgress: (progress: BankProgress) => void) {
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
    try {
      for (;;) {
        const batch = await generateBankBatch(id, run.signal);
        if (run.signal.aborted) return;
        notify.current({ bankSize: batch.bankSize, bankTarget: batch.bankTarget });
        if (batch.complete) return setState({ status: 'complete' });
        empty = batch.generated === 0 ? empty + 1 : 0;
        if (empty >= MAX_EMPTY_BATCHES) {
          return setState({ status: 'error', message: 'El modelo no produjo preguntas válidas en varios intentos. Reanuda la generación en unos minutos.' });
        }
      }
    } catch (error) {
      if (run.signal.aborted) return;
      setState({
        status: 'error',
        message: error instanceof ApiError && error.status === 503
          ? `${error.message} El banco conserva lo generado.`
          : 'No se pudo generar el lote. El banco conserva lo generado.',
      });
    } finally {
      if (controller.current === run) controller.current = null;
    }
  }, [quizId]);

  const pause = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState({ status: 'paused' });
  }, []);

  return { state, start, pause };
}
