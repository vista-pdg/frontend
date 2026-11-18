import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel, QuizPageShell } from '@/components/quiz/QuizPageShell';
import { OptionOutcome } from '@/components/quiz/OptionOutcome';
import { ApiError } from '@/lib/http';
import { formatDateTime, formatGrade, optionMark, type QuizTone } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { fetchAttemptReview } from '@/services/quizService';
import type { AnswerOutcome, AttemptReviewDto } from '@/types/quiz';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; review: AttemptReviewDto };

const OUTCOME: Record<AnswerOutcome, { label: string; tone: QuizTone; border: string }> = {
  CORRECT: { label: 'Correcta', tone: 'success', border: 'border-annotation-green bg-annotation-green/8' },
  INCORRECT: { label: 'Incorrecta', tone: 'danger', border: 'border-destructive bg-destructive/8' },
  UNANSWERED: { label: 'Sin responder', tone: 'neutral', border: 'border-muted-foreground/60 bg-muted' },
};

const backClass = 'inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-primary-light hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** HU-35 · CA-4: revisión de solo lectura de un quiz entregado, cuando cerró y la nota es visible. */
export function QuizReviewPage() {
  const quizId = Number(useParams().quizId);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchAttemptReview(quizId, controller.signal)
      .then(review => { if (!controller.signal.aborted) setState({ status: 'ready', review }); })
      .catch(error => {
        if (controller.signal.aborted) return;
        const message = error instanceof ApiError && (error.status === 409 || error.status === 404)
          ? error.message
          : 'No se pudo cargar la revisión. Revisa tu conexión e intenta de nuevo.';
        setState({ status: 'error', message });
      });
    return () => controller.abort();
  }, [quizId]);

  return (
    <QuizPageShell section="Quizzes" data-cy="quiz-review-page">
      <Link to="/quizzes" className={backClass} data-cy="quiz-review-back"><ArrowLeft className="size-4" aria-hidden="true" />Volver a mis quizzes</Link>
      {state.status === 'loading' && <p role="status" className="mt-6 text-sm">Cargando la revisión…</p>}
      {state.status === 'error' && <div className="mt-6"><Alert><span data-cy="quiz-review-error">{state.message}</span></Alert></div>}
      {state.status === 'ready' && <Review review={state.review} />}
    </QuizPageShell>
  );
}

function Review({ review }: { review: AttemptReviewDto }) {
  return (
    <>
      <h1 className="mt-2 text-[20px] font-bold tracking-tight break-words" data-cy="quiz-review-title">Revisión · {review.title}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground" data-cy="quiz-review-summary">
        {review.status === 'EXPIRED' ? 'Cerrado por tiempo' : 'Entregado'} {formatDateTime(review.finishedAt)} · Nota {formatGrade(review.grade)} / 5,0 · {review.score} de {review.total} aciertos. Solo lectura: tus respuestas ya no se pueden cambiar.
      </p>
      <nav aria-label="Resultado por pregunta" className="mt-5 flex flex-wrap gap-2">
        {review.questions.map(q => (
          <a key={q.position} href={`#review-${q.position}`} data-cy={`review-nav-${q.position}`} data-outcome={q.outcome}
            aria-label={`Pregunta ${q.position}: ${OUTCOME[q.outcome].label}`}
            className={cn('flex size-11 items-center justify-center border font-mono text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', OUTCOME[q.outcome].border)}>
            {q.position}
          </a>
        ))}
      </nav>
      <p className="mt-2 text-[11px] text-muted-foreground">Verde: correcta · Rojo: incorrecta · Gris: sin responder</p>
      <ol className="mt-5 max-w-3xl space-y-4">
        {review.questions.map(q => {
          const outcome = OUTCOME[q.outcome];
          return (
            <li key={q.position} id={`review-${q.position}`} data-cy={`review-question-${q.position}`} data-outcome={q.outcome}
              className="scroll-mt-6 space-y-3 border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <MicroLabel className="min-w-0 flex-1">Pregunta {q.position} · {q.topicLabel}</MicroLabel>
                <QuizBadge label={outcome.label} tone={outcome.tone} data-cy={`review-outcome-${q.position}`} />
              </div>
              <div className="space-y-2 border-l-2 border-annotation-yellow bg-shell p-3">
                <MicroLabel>Escenario para reproducir en VISTA</MicroLabel>
                <p className="text-[13px] leading-relaxed break-words">{q.scenario}</p>
              </div>
              <p className="text-sm font-medium leading-relaxed break-words">{q.statement}</p>
              <div className="space-y-2" role="list" aria-label="Opciones">
                {q.options.map((option, index) => (
                  <div role="listitem" key={index}>
                    <OptionOutcome text={option} mark={optionMark(index, q.selectedOption, q.correctOption)} data-cy={`review-option-${q.position}-${index}`} />
                  </div>
                ))}
              </div>
              {q.explanation && (
                <div className="space-y-1.5 border-l-2 border-primary bg-primary/8 p-3" data-cy={`review-explanation-${q.position}`}>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                    <BookOpen className="size-3.5 text-primary-light" aria-hidden="true" />Justificación
                  </p>
                  <p className="text-[13px] leading-relaxed break-words">{q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
