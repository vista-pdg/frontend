import { QuizBadge } from '@/components/quiz/QuizBadge';
import { duration, metricNumber, percent, quizPhaseLabel } from '@/lib/analytics';
import { formatGrade } from '@/lib/quiz';
import type { QuizInsight } from '@/types/analytics';

const heading = 'px-3 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground';

/** HU-36 · CA-8: cada quiz del grupo con su tema más débil y más fuerte. */
export function AnalyticsQuizzes({ quizzes }: { quizzes: QuizInsight[] }) {
  if (quizzes.length === 0) {
    return <p className="border border-border p-6 text-sm text-muted-foreground" data-cy="analytics-empty">Este curso no tiene quizzes publicados.</p>;
  }
  return (
    <div className="space-y-3" data-cy="analytics-quizzes">
      <div role="region" aria-label="Tabla de quizzes, desplazable" tabIndex={0} className="relative overflow-x-auto border border-border scrollbar-custom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <table className="w-full min-w-[960px] text-left text-[13px]">
          <caption className="sr-only">Quizzes del grupo</caption>
          <thead>
            <tr className="border-b border-border">
              {['Quiz', 'Estado', 'Entregas', 'Nota promedio', 'Acierto', 'Tiempo mediano', 'Tema más débil', 'Tema más fuerte'].map(h => <th key={h} scope="col" className={heading}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {quizzes.map(q => (
              <tr key={q.id} className="border-b border-border last:border-b-0" data-cy="analytics-quiz-row">
                <th scope="row" className="px-3 py-3 font-semibold break-words">{q.title}</th>
                <td className="px-3 py-3"><QuizBadge label={quizPhaseLabel[q.phase]} tone={q.phase === 'OPEN' ? 'success' : q.phase === 'SCHEDULED' ? 'primary' : 'neutral'} /></td>
                <td className="px-3 py-3 font-mono">{metricNumber(q.finished)} / {metricNumber(q.enrolled)}</td>
                <td className="px-3 py-3 font-mono">{formatGrade(q.averageGrade)}</td>
                <td className="px-3 py-3 font-mono">{percent(q.accuracy)}</td>
                <td className="px-3 py-3 font-mono">{duration(q.medianSeconds)}</td>
                <td className="px-3 py-3 text-xs break-words">{q.weakestTopic ?? '—'}</td>
                <td className="px-3 py-3 text-xs break-words">{q.strongestTopic ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Acierto y tiempo cuentan solo intentos finalizados. Un quiz abierto puede cambiar mientras los estudiantes lo presentan.</p>
    </div>
  );
}
