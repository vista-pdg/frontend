import { CircleX, FlaskConical, TrendingDown, TrendingUp } from 'lucide-react';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel } from '@/components/quiz/QuizPageShell';
import { AccuracyBar } from '@/components/analytics/AccuracyBar';
import { duration, levelLabel, metricNumber, percent } from '@/lib/analytics';
import type { PedagogicalReport, TopicInsight } from '@/types/analytics';

function Tile({ label, value, detail, cy }: { label: string; value: string; detail: string; cy: string }) {
  return (
    <div className="min-w-0 space-y-1.5 border border-border p-4">
      <dt><MicroLabel>{label}</MicroLabel></dt>
      <dd className="font-mono text-[26px] font-bold leading-tight tabular-nums" data-cy={cy}>{value}</dd>
      <dd className="text-[11px] leading-relaxed text-muted-foreground">{detail}</dd>
    </div>
  );
}

function TopicRow({ topic }: { topic: TopicInsight }) {
  const level = levelLabel[topic.level];
  const accuracy = topic.quizAccuracy ?? topic.studyAccuracy;
  const facts = [
    topic.quizAnswers > 0 ? `${metricNumber(topic.quizAnswers)} respuestas en quizzes` : `${metricNumber(topic.studyAnswers)} respuestas de estudio`,
    topic.medianSeconds !== null ? `${duration(topic.medianSeconds)} de mediana` : null,
    topic.hintRate !== null ? `${percent(topic.hintRate)} pidió la pista en estudio` : null,
    topic.smallSample ? 'muestra pequeña' : null,
  ].filter(Boolean).join(' · ');
  return (
    <li className="space-y-2 border-b border-border py-3 last:border-b-0" data-cy="analytics-summary-topic">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="min-w-0 text-[13px] font-semibold break-words">{topic.topicLabel}</h4>
        <QuizBadge label={level.label} tone={level.tone} />
      </div>
      <AccuracyBar value={accuracy} level={topic.level} />
      <p className="text-[11px] leading-relaxed text-muted-foreground">{facts}</p>
      {topic.commonMistake && topic.level !== 'DOMINADO' && (
        <p className="flex items-start gap-2 text-xs leading-relaxed" data-cy="analytics-common-mistake">
          <CircleX className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
          <span className="min-w-0 break-words">Más elegida por error ({percent(topic.commonMistakeShare)}): «{topic.commonMistake}».</span>
        </p>
      )}
    </li>
  );
}

/** HU-36 · CA-6 y CA-8: lo esencial del grupo en una vista. */
export function AnalyticsSummary({ report }: { report: PedagogicalReport }) {
  const o = report.overview!;
  const evaluated = report.topics.filter(t => t.level !== 'SIN_DATOS');
  const hardest = evaluated.filter(t => t.level !== 'DOMINADO').slice(0, 3);
  const best = [...evaluated].filter(t => t.level === 'DOMINADO').reverse().slice(0, 3);
  const practice = report.topics.filter(t => t.practicedAccuracy !== null && t.unpracticedAccuracy !== null).slice(0, 4);
  return (
    <div className="space-y-6" data-cy="analytics-summary">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile cy="analytics-kpi-active" label="Estudiantes activos" value={metricNumber(report.activeStudents ?? 0)}
          detail={`de ${metricNumber(report.enrolledStudents ?? 0)} matriculados usaron VISTA, presentaron quizzes o estudiaron`} />
        <Tile cy="analytics-kpi-accuracy" label="Acierto en quizzes" value={percent(o.quizAccuracy)}
          detail={o.quizAnswers > 0 ? `${metricNumber(o.quizAnswers)} respuestas en ${o.quizzesWithAnswers} ${o.quizzesWithAnswers === 1 ? 'quiz' : 'quizzes'} · ${percent(o.unansweredRate)} sin responder` : 'Aún no hay intentos finalizados'} />
        <Tile cy="analytics-kpi-time" label="Tiempo mediano" value={duration(o.medianSeconds)}
          detail={o.timedShare === null ? 'por pregunta · sin respuestas medidas' : `por pregunta · medido en el ${percent(o.timedShare)} de las respuestas`} />
        <Tile cy="analytics-kpi-practice" label="Práctica en VISTA" value={metricNumber(o.algorithmExecutions)}
          detail={`ejecuciones de algoritmos · ${metricNumber(o.structureRequests)} estructuras generadas`} />
      </dl>
      {evaluated.length === 0 ? (
        <p className="border border-border p-6 text-sm text-muted-foreground" data-cy="analytics-no-answers">
          Aún no hay respuestas de quizzes ni de estudio en este alcance. Los temas aparecerán cuando el grupo entregue un quiz o resuelva quizzes de estudio; el uso de VISTA sigue disponible.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="border border-border bg-card px-5 pt-4 pb-1" aria-labelledby="analytics-hardest-title" data-cy="analytics-hardest-topics">
            <h3 id="analytics-hardest-title" className="flex items-center gap-2"><TrendingDown className="size-3.5 text-destructive" aria-hidden="true" /><MicroLabel>Temas que más cuestan</MicroLabel></h3>
            {hardest.length === 0 ? <p className="py-4 text-[13px] text-muted-foreground">Ningún tema baja del 75 % de acierto.</p>
              : <ul>{hardest.map(t => <TopicRow key={t.topicKey} topic={t} />)}</ul>}
          </section>
          <section className="border border-border bg-card px-5 pt-4 pb-1" aria-labelledby="analytics-best-title" data-cy="analytics-best-topics">
            <h3 id="analytics-best-title" className="flex items-center gap-2"><TrendingUp className="size-3.5 text-annotation-green" aria-hidden="true" /><MicroLabel>Mejor dominados</MicroLabel></h3>
            {best.length === 0 ? <p className="py-4 text-[13px] text-muted-foreground">Ningún tema llega todavía al 75 % de acierto.</p>
              : <ul>{best.map(t => <TopicRow key={t.topicKey} topic={t} />)}</ul>}
          </section>
        </div>
      )}
      {practice.length > 0 && (
        <section className="space-y-3 border border-border bg-card p-5" aria-labelledby="analytics-practice-title" data-cy="analytics-practice">
          <h3 id="analytics-practice-title" className="flex items-center gap-2"><FlaskConical className="size-3.5 text-primary-light" aria-hidden="true" /><MicroLabel>Práctica en VISTA y acierto en quizzes</MicroLabel></h3>
          <p className="text-xs leading-relaxed text-muted-foreground">Acierto en preguntas del tema de quienes ejecutaron su algoritmo en VISTA antes de empezar el quiz, frente a quienes no lo hicieron.</p>
          <ul className="space-y-3">
            {practice.map(t => (
              <li key={t.topicKey} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_1fr] sm:items-center" data-cy="analytics-practice-row">
                <span className="text-[13px] font-semibold break-words">{t.topicLabel}</span>
                <span className="flex items-center gap-2"><span className="w-20 shrink-0 text-[11px] text-muted-foreground">Practicó</span><AccuracyBar value={t.practicedAccuracy} level="SIN_DATOS" className="flex-1" fillClass="bg-primary" /></span>
                <span className="flex items-center gap-2"><span className="w-20 shrink-0 text-[11px] text-muted-foreground">No practicó</span><AccuracyBar value={t.unpracticedAccuracy} level="SIN_DATOS" className="flex-1" /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
