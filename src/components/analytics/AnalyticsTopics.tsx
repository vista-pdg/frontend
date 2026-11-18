import { QuizBadge } from '@/components/quiz/QuizBadge';
import { AccuracyBar } from '@/components/analytics/AccuracyBar';
import { duration, levelLabel, metricNumber, percent } from '@/lib/analytics';
import type { TopicInsight } from '@/types/analytics';

const heading = 'px-3 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground';

/** HU-36 · CA-6: temas de más a menos difícil, con estudio y práctica en VISTA. */
export function AnalyticsTopics({ topics }: { topics: TopicInsight[] }) {
  if (topics.length === 0) {
    return <p className="border border-border p-6 text-sm text-muted-foreground" data-cy="analytics-empty">No hay temas con respuestas ni práctica en este alcance.</p>;
  }
  return (
    <div className="space-y-3" data-cy="analytics-topics">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Ordenados de más a menos difícil por acierto en quizzes (o en estudio, si el tema no se evaluó). Nivel: «Cuesta trabajo» bajo 50 %, «En progreso» de 50 % a 75 %, «Dominado» desde 75 %.
      </p>
      <div role="region" aria-label="Tabla de temas, desplazable" tabIndex={0} className="relative overflow-x-auto border border-border scrollbar-custom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <caption className="sr-only">Temas del grupo ordenados por dificultad</caption>
          <thead>
            <tr className="border-b border-border">
              {['Tema', 'Nivel', 'Acierto en quizzes', 'Sin responder', 'Tiempo mediano', 'Quizzes de estudio', 'Práctica en VISTA'].map(h => <th key={h} scope="col" className={heading}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {topics.map(t => {
              const level = levelLabel[t.level];
              return (
                <tr key={t.topicKey} className="border-b border-border last:border-b-0" data-cy="analytics-topic-row" data-level={t.level}>
                  <th scope="row" className="px-3 py-3 font-normal">
                    <span className="block font-semibold break-words">{t.topicLabel}</span>
                    {t.smallSample && <span className="text-[11px] text-muted-foreground">Muestra pequeña · {metricNumber(t.quizAnswers || t.studyAnswers)} respuestas</span>}
                  </th>
                  <td className="px-3 py-3"><QuizBadge label={level.label} tone={level.tone} /></td>
                  <td className="w-52 px-3 py-3">{t.quizAccuracy === null ? <span className="text-muted-foreground">—</span> : <AccuracyBar value={t.quizAccuracy} level={t.level} />}</td>
                  <td className="px-3 py-3 font-mono">{percent(t.unansweredRate)}</td>
                  <td className="px-3 py-3 font-mono">{duration(t.medianSeconds)}</td>
                  <td className="px-3 py-3 text-xs leading-relaxed">
                    {t.studyAnswers === 0 && t.hintRate === null ? '—'
                      : `${percent(t.studyAccuracy)} · pistas ${percent(t.hintRate)} · soluciones ${percent(t.solutionRate)}`}
                  </td>
                  <td className="px-3 py-3 text-xs leading-relaxed">
                    {metricNumber(t.practiceExecutions)}
                    {t.practicedAccuracy !== null || t.unpracticedAccuracy !== null ? ` · ${percent(t.practicedAccuracy)} / ${percent(t.unpracticedAccuracy)}` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">Práctica en VISTA: ejecuciones del algoritmo en el periodo · acierto de quienes lo practicaron antes del quiz / de quienes no.</p>
    </div>
  );
}
