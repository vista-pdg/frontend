import { CircleCheck, CircleX } from 'lucide-react';
import { MicroLabel } from '@/components/quiz/QuizPageShell';
import { duration, metricNumber, percent } from '@/lib/analytics';
import type { QuestionInsight } from '@/types/analytics';

/** HU-36 · CA-7: dónde fallan (opción incorrecta más elegida) y qué responden con facilidad. */
export function AnalyticsQuestions({ hardest, easiest }: { hardest: QuestionInsight[]; easiest: QuestionInsight[] }) {
  if (hardest.length === 0 && easiest.length === 0) {
    return <p className="border border-border p-6 text-sm text-muted-foreground" data-cy="analytics-empty">Ninguna pregunta tiene todavía al menos 3 respuestas en intentos finalizados.</p>;
  }
  return (
    <div className="space-y-6" data-cy="analytics-questions">
      <section className="space-y-3" aria-labelledby="analytics-hard-q">
        <h3 id="analytics-hard-q"><MicroLabel>Preguntas más difíciles · al menos 3 respuestas</MicroLabel></h3>
        <ol className="space-y-3">
          {hardest.map(q => (
            <li key={`${q.quizId}-${q.statement}`} className="space-y-2.5 border border-border p-4" data-cy="analytics-hard-question">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MicroLabel>{q.quizTitle ?? 'Quiz'} · {q.topicLabel}</MicroLabel>
                <span className="font-mono text-xs font-bold">{percent(q.accuracy)} · {metricNumber(q.answers)} respuestas · {duration(q.medianSeconds)}</span>
              </div>
              <p className="text-sm font-medium leading-relaxed break-words">{q.statement}</p>
              {q.correctOption && (
                <p className="flex items-start gap-2 border-l-2 border-annotation-green px-2.5 py-1.5 text-[13px] leading-relaxed">
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-annotation-green" aria-hidden="true" /><span className="min-w-0 break-words">Correcta: {q.correctOption}</span>
                </p>
              )}
              {q.commonWrongOption && (
                <p className="flex items-start gap-2 border-l-2 border-destructive bg-destructive/8 px-2.5 py-1.5 text-[13px] leading-relaxed" data-cy="analytics-wrong-option">
                  <CircleX className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                  <span className="min-w-0 break-words">Más elegida por error · {percent(q.commonWrongShare)}: {q.commonWrongOption}</span>
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
      {easiest.length > 0 && (
        <section className="space-y-3" aria-labelledby="analytics-easy-q">
          <h3 id="analytics-easy-q"><MicroLabel>Más fáciles y rápidas</MicroLabel></h3>
          <ul className="border border-border">
            {easiest.map(q => (
              <li key={`${q.quizId}-${q.statement}`} className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4" data-cy="analytics-easy-question">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-relaxed break-words">{q.statement}</p>
                  <p className="text-[11px] text-muted-foreground">{q.topicLabel} · {q.quizTitle ?? 'Quiz'}</p>
                </div>
                <span className="shrink-0 font-mono text-[13px] font-bold">{percent(q.accuracy)}</span>
                <span className="shrink-0 font-mono text-xs">{duration(q.medianSeconds)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
