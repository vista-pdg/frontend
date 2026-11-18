import type { ReactNode } from 'react';
import { CircleAlert, ShieldCheck } from 'lucide-react';
import { INSUFFICIENT_DATA, UNMEASURED_STEPS, metricNumber, structureLabel, analyticsViews, type AnalyticsView } from '@/lib/analytics';
import type { PedagogicalReport } from '@/types/analytics';
import { cn } from '@/lib/utils';
function ProtectedMetric() {
  return <span className="inline-flex items-start gap-2 text-sm text-muted-foreground" data-cy="analytics-suppressed">
    <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{INSUFFICIENT_DATA}</span>;
}
function Value({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm tabular-nums text-foreground">{children}</dd></div>;
}
const number = (value: number | null, percent = false) => value === null ? <ProtectedMetric /> : `${metricNumber(value)}${percent ? ' %' : ''}`;
/** El orden procede del servidor; nunca se deduce el valor de una fila suprimida. */
export function AnalyticsRanking({ report, view }: { report: PedagogicalReport; view: AnalyticsView }) {
  const empty = report[view].length === 0;
  const rowClass = 'grid gap-4 px-4 py-5 sm:grid-cols-[1.2fr_2fr] sm:items-center sm:px-5';
  return <section aria-label={`Ranking de ${analyticsViews.find(v => v.id === view)!.label.toLowerCase()}`} data-cy="analytics-ranking">
    <h2 className="sr-only">Ranking de {analyticsViews.find(v => v.id === view)!.label.toLowerCase()}</h2>
    {view === 'retries' && <p className="mb-4 text-sm leading-relaxed text-muted-foreground" data-cy="analytics-retry-rule">
      Sesiones con al menos {report.retryMinAttempts} solicitudes en {report.retryWindowSeconds} s. Se destacan tasas superiores al {metricNumber(report.retryThreshold * 100)} %.
    </p>}
    {empty ? <p className="border border-border p-6 text-sm text-muted-foreground" data-cy="analytics-empty">No hay eventos para esta vista en el curso y periodo seleccionados.</p> : <ul className="divide-y divide-border border border-border">
      {view === 'structures' && report.structures.map(row => <li key={row.structure} data-cy="analytics-structure-row" className={rowClass}>
        <h3 className="break-words text-sm font-semibold">{structureLabel(row.structure)}</h3>
        {row.status !== 'AVAILABLE' ? <ProtectedMetric /> : <dl className="grid grid-cols-2 gap-4">
          <Value label="Solicitudes">{number(row.frequency)}</Value><Value label="% del total">{number(row.percentage, true)}</Value>
        </dl>}
      </li>)}
      {view === 'algorithms' && report.algorithms.map(row => <li key={row.algorithm} data-cy="analytics-algorithm-row" className={rowClass}>
        <h3 className="break-words text-sm font-semibold">{row.algorithm}</h3>
        {row.status !== 'AVAILABLE' ? <ProtectedMetric /> : <dl className="grid grid-cols-2 gap-4">
          <Value label="Ejecuciones">{number(row.executions)}</Value>
          <Value label="Promedio de pasos completados">{row.stepsStatus === 'UNAVAILABLE' ? <span className="text-muted-foreground">{UNMEASURED_STEPS}</span>
            : row.stepsStatus !== 'AVAILABLE' ? <ProtectedMetric /> : number(row.averageCompletedSteps)}</Value>
        </dl>}
      </li>)}
      {view === 'retries' && report.retries.map(row => <li key={row.structure} data-cy="analytics-retry-row" data-highlighted={row.status === 'AVAILABLE' && row.highlighted === true}
        className={cn(rowClass, row.status === 'AVAILABLE' && row.highlighted && 'border-l-2 border-l-annotation-orange bg-orange-main/5')}>
        <div><h3 className="break-words text-sm font-semibold">{structureLabel(row.structure)}</h3>
          {row.status === 'AVAILABLE' && row.highlighted && <p className="mt-1 flex items-center gap-1.5 text-xs text-annotation-orange"><CircleAlert className="size-4 shrink-0" aria-hidden="true" />Supera el umbral</p>}</div>
        {row.status !== 'AVAILABLE' ? <ProtectedMetric /> : <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Value label="Sesiones">{number(row.sessions)}</Value><Value label="Con reintentos">{number(row.sessionsWithRetries)}</Value>
          <Value label="Tasa de reintento">{number(row.retryRate === null ? null : row.retryRate * 100, true)}</Value>
        </dl>}
      </li>)}
    </ul>}
    {view === 'structures' && !empty && <div className="mt-4 text-sm" data-cy="analytics-total">
      {report.totalRequests === null ? <><span className="mr-2">Total del periodo:</span><ProtectedMetric /></> : `${metricNumber(report.totalRequests)} solicitudes en el periodo`}
      {report.totalRequests === null && <p className="mt-2 text-xs text-muted-foreground">El total y los porcentajes también se ocultan para proteger los segmentos con datos insuficientes.</p>}
    </div>}
  </section>;
}
