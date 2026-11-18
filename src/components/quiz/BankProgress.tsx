import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { GENERATION_RETRY_DELAYS_MS } from '@/lib/quiz';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MicroLabel } from './QuizPageShell';
import type { BankGeneration } from '@/hooks/useBankGeneration';

/** Textos del avance: los del banco docente por defecto; el quiz de estudio (HU-35) trae los suyos. */
export interface BankProgressCopy {
  running: string;
  complete: string;
  idle: string;
  explanation: string;
  completeMessage: (size: number) => string;
  resume: string;
  review: string;
}

const BANK_COPY: BankProgressCopy = {
  running: 'Generando banco con IA',
  complete: 'Banco completo',
  idle: 'Banco de preguntas',
  explanation: 'Cada lote ejecuta el algoritmo real y pide al modelo preguntas sobre ese rastro. Puedes cerrar esta página: el banco conserva lo generado.',
  completeMessage: size => `Banco listo: ${size} preguntas. Revísalo y publica el quiz.`,
  resume: 'Reanudar generación',
  review: 'Revisar banco',
};

/** Avance de la generación del banco, con pausa, error reanudable y cierre. */
export function BankProgress({ state, bankSize, bankTarget, onStart, onPause, reviewTo, copy = BANK_COPY }: {
  state: BankGeneration;
  bankSize: number;
  bankTarget: number;
  onStart: () => void;
  onPause: () => void;
  reviewTo?: string;
  copy?: BankProgressCopy;
}) {
  const ratio = bankTarget > 0 ? Math.min(1, bankSize / bankTarget) : 0;
  const running = state.status === 'running';
  return (
    <section aria-label="Generación del banco" data-cy="bank-progress" data-status={state.status} className="space-y-3 border border-border bg-card p-5">
      <MicroLabel>{running ? copy.running : state.status === 'complete' ? copy.complete : copy.idle}</MicroLabel>
      <p className="font-mono text-xl font-semibold" data-cy="bank-progress-count">{bankSize} de {bankTarget} preguntas</p>
      <div role="progressbar" aria-label="Preguntas generadas" aria-valuemin={0} aria-valuemax={bankTarget} aria-valuenow={bankSize} className="h-1.5 bg-muted">
        <div className="h-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${ratio * 100}%` }} />
      </div>
      {running && state.retry !== undefined && (
        <p role="status" data-cy="bank-retrying" className="flex items-center gap-2 text-xs leading-relaxed text-foreground">
          <RefreshCw className="size-3.5 shrink-0 text-annotation-yellow motion-safe:animate-spin" aria-hidden="true" />
          Se perdió la conexión. Reintentando el lote ({state.retry} de {GENERATION_RETRY_DELAYS_MS.length})…
        </p>
      )}
      {running && (
        <>
          <p role={state.retry === undefined ? 'status' : undefined} className="text-xs leading-relaxed text-muted-foreground">
            {copy.explanation}
          </p>
          <Button variant="outline" className="min-h-11 px-4" onClick={onPause} data-cy="bank-pause">Pausar</Button>
        </>
      )}
      {state.status === 'error' && <Alert><span data-cy="bank-error">{state.message}</span></Alert>}
      {state.status === 'complete' && <Alert tone="success"><span data-cy="bank-complete">{copy.completeMessage(bankSize)}</span></Alert>}
      {(state.status === 'error' || state.status === 'paused') && (
        <Button className="min-h-11 px-4" onClick={onStart} data-cy="bank-resume">{copy.resume}</Button>
      )}
      {state.status === 'complete' && reviewTo && (
        <Link to={reviewTo} data-cy="bank-review"
          className="inline-flex min-h-11 items-center bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {copy.review}
        </Link>
      )}
    </section>
  );
}
