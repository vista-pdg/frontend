import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarX, Download, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { ManagementHeader } from '@/components/ManagementHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AnalyticsRanking } from '@/components/AnalyticsRanking';
import { AnalyticsSummary } from '@/components/analytics/AnalyticsSummary';
import { AnalyticsTopics } from '@/components/analytics/AnalyticsTopics';
import { AnalyticsQuestions } from '@/components/analytics/AnalyticsQuestions';
import { AnalyticsQuizzes } from '@/components/analytics/AnalyticsQuizzes';
import { fetchAnalyticsCourses, fetchAnalyticsCsv, fetchAnalyticsQuizzes, fetchPedagogicalReport } from '@/services/pedagogicalAnalyticsService';
import {
  INSUFFICIENT_DATA, analyticsCsvName, analyticsTabs, analyticsViews, emptyAnalyticsFilter, periodLabel, sameAnalyticsFilter,
  validateAnalyticsFilter, type AnalyticsTab, type AnalyticsView,
} from '@/lib/analytics';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { CourseDto } from '@/types/auth';
import type { AnalyticsFilter, PedagogicalReport, QuizRef } from '@/types/analytics';

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };
const controlClass = 'min-h-11 w-full min-w-0 border border-border bg-shell px-3 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50';
const labelClass = 'mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground';
const tabClass = (active: boolean) => cn('min-h-11 shrink-0 border-b-2 px-3 py-3 text-[12px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5',
  active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground');

/** HU-06 y HU-36: analítica pedagógica del grupo, con filtros opcionales y umbral por grupo. */
export function AnalyticsPage() {
  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState<LoadState<CourseDto[]>>({ status: 'loading' });
  const [courseAttempt, setCourseAttempt] = useState(0);
  const [draft, setDraft] = useState<AnalyticsFilter>(() => emptyAnalyticsFilter());
  const [applied, setApplied] = useState<AnalyticsFilter | null>(null);
  const [quizzes, setQuizzes] = useState<{ courseCode: string; list: QuizRef[] }>({ courseCode: '', list: [] });
  const [result, setResult] = useState<LoadState<PedagogicalReport>>({ status: 'loading' });
  const [errors, setErrors] = useState<Partial<Record<keyof AnalyticsFilter, string>>>({});
  const [tab, setTab] = useState<AnalyticsTab>('summary');
  const [view, setView] = useState<AnalyticsView>('structures');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const exportRequest = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalyticsCourses(controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setCourses({ status: 'ready', data });
      if (data.length > 0) {
        // HU-36 · CA-5: sin fechas ni quiz, todo lo que tenga el grupo en su periodo.
        const filter = emptyAnalyticsFilter(data[0].code);
        setDraft(filter);
        setApplied(filter);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setCourses({ status: 'error', message: 'No se pudieron cargar los cursos. Intenta de nuevo.' });
    });
    return () => controller.abort();
  }, [courseAttempt]);

  // Quizzes del curso elegido para el filtro opcional; si fallan, queda «Todos los quizzes».
  useEffect(() => {
    if (!draft.courseCode) return;
    const controller = new AbortController();
    fetchAnalyticsQuizzes(draft.courseCode, controller.signal)
      .then(list => { if (!controller.signal.aborted) setQuizzes({ courseCode: draft.courseCode, list }); })
      .catch(() => { if (!controller.signal.aborted) setQuizzes({ courseCode: draft.courseCode, list: [] }); });
    return () => controller.abort();
  }, [draft.courseCode]);

  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController();
    fetchPedagogicalReport(applied, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ status: 'ready', data });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ status: 'error', message: error instanceof ApiError && error.status === 403
        ? 'No tienes acceso a este curso.' : error instanceof ApiError && error.status === 400 ? error.message : 'No se pudo cargar el reporte. Intenta de nuevo.' });
    });
    return () => controller.abort();
  }, [applied]);
  useEffect(() => () => exportRequest.current?.abort(), []);

  const dirty = applied !== null && !sameAnalyticsFilter(draft, applied);
  const hasCourses = courses.status === 'ready' && courses.data.length > 0;
  const busy = applied !== null && result.status === 'loading';
  const quizOptions = quizzes.courseCode === draft.courseCode ? quizzes.list : [];
  const appliedCourse = courses.status === 'ready' && applied ? courses.data.find(c => c.code === applied.courseCode) : undefined;
  const optional = applied !== null && (applied.from !== '' || applied.to !== '' || applied.quizId !== '');

  function cancelExport() {
    exportRequest.current?.abort();
    setExporting(false);
    setExportError('');
    setExportNotice('');
  }
  function changeFilter(field: keyof AnalyticsFilter, value: string) {
    cancelExport();
    // Cambiar de curso descarta el quiz elegido: los quizzes son de cada curso.
    setDraft(current => ({ ...current, [field]: value, ...(field === 'courseCode' ? { quizId: '' } : {}) }));
    setErrors({});
  }
  function loadReport(filter: AnalyticsFilter) {
    cancelExport();
    setResult({ status: 'loading' });
    setApplied({ ...filter });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateAnalyticsFilter(draft);
    if (courses.status !== 'ready' || !courses.data.some(c => c.code === draft.courseCode)) validation.courseCode = 'Selecciona un curso disponible.';
    setErrors(validation);
    const first = Object.keys(validation)[0];
    if (first) {
      (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    loadReport(draft);
  }
  function clearOptional(keepQuiz = false) {
    if (!applied) return;
    const filter = { ...emptyAnalyticsFilter(applied.courseCode), quizId: keepQuiz ? applied.quizId : '' };
    setDraft(filter);
    setErrors({});
    loadReport(filter);
  }
  async function exportCsv() {
    if (!applied || dirty || result.status !== 'ready' || exporting) return;
    const controller = new AbortController();
    exportRequest.current = controller;
    setExporting(true);
    setExportError('');
    setExportNotice('');
    try {
      const blob = await fetchAnalyticsCsv(applied, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = analyticsCsvName(applied, result.data.course.termCode);
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportNotice('Reporte CSV descargado.');
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 403) setResult({ status: 'error', message: 'No tienes acceso a este curso.' });
      setExportError('No se pudo exportar el reporte. Intenta de nuevo.');
    } finally {
      if (!controller.signal.aborted) setExporting(false);
    }
  }

  const report = result.status === 'ready' ? result.data : null;
  return <div className="h-full w-full overflow-y-auto bg-shell text-foreground scrollbar-custom [scrollbar-gutter:stable]" data-cy="analytics-page">
    <a href="#analytics-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-shell focus:p-3 focus:text-foreground focus:outline-2 focus:outline-ring">Saltar al reporte</a>
    <div className="fixed top-0 left-0 right-0 z-30 h-[2px] bg-primary" />
    <ManagementHeader section="Panel analítico" />
    <main id="analytics-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-[20px] font-bold tracking-tight">Analítica pedagógica</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Encuentra los temas que más cuestan a tu grupo, en qué fallan y cómo se relaciona la práctica en VISTA con los quizzes.</p>
      {courses.status === 'loading' && <p role="status" className="mt-6 text-sm" data-cy="analytics-courses-loading">Cargando cursos…</p>}
      {courses.status === 'error' && <div className="mt-6"><Alert><span data-cy="analytics-courses-error">{courses.message}</span></Alert>
        <Button className="mt-3 min-h-11" data-cy="analytics-courses-retry" onClick={() => { setCourses({ status: 'loading' }); setCourseAttempt(n => n + 1); }}>Reintentar</Button></div>}
      {courses.status === 'ready' && !hasCourses && <p className="mt-6 border border-border p-6 text-sm" data-cy="analytics-no-courses">
        No tienes cursos disponibles para consultar. {isAdmin ? 'Revisa los cursos configurados en Administración.' : 'Solicita la asignación de tu curso al administrador.'}</p>}
      {hasCourses && <>
        <form ref={formRef} onSubmit={submit} noValidate autoComplete="off" className="mt-8 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.4fr_auto]" aria-label="Filtros del reporte">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1"><label htmlFor="analytics-course" className={labelClass}>Curso</label>
            <select id="analytics-course" name="courseCode" data-cy="analytics-course" className={controlClass} value={draft.courseCode}
              onChange={e => changeFilter('courseCode', e.target.value)} aria-invalid={!!errors.courseCode} aria-describedby={errors.courseCode ? 'analytics-course-error' : undefined}>
              {courses.status === 'ready' && courses.data.map(course => <option key={course.code} value={course.code}>{course.code} · {course.name} · {course.termCode}</option>)}
            </select>
            {errors.courseCode && <p id="analytics-course-error" role="alert" className="mt-2 text-xs text-foreground">{errors.courseCode}</p>}
          </div>
          {(['from', 'to'] as const).map(field => <div key={field} className="min-w-0">
            <label htmlFor={`analytics-${field}`} className={labelClass}>{field === 'from' ? 'Desde (opcional)' : 'Hasta (opcional)'}</label>
            <input id={`analytics-${field}`} name={field} data-cy={`analytics-${field}`} type="date" min="0001-01-01" max="9999-12-31" className={controlClass}
              value={draft[field]} onChange={e => changeFilter(field, e.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `analytics-${field}-error` : 'analytics-filter-hint'} />
            {errors[field] && <p id={`analytics-${field}-error`} role="alert" className="mt-2 text-xs text-foreground">{errors[field]}</p>}
          </div>)}
          <div className="min-w-0"><label htmlFor="analytics-quiz" className={labelClass}>Quiz (opcional)</label>
            <select id="analytics-quiz" name="quizId" data-cy="analytics-quiz" className={controlClass} value={draft.quizId}
              onChange={e => changeFilter('quizId', e.target.value)} aria-describedby="analytics-filter-hint">
              <option value="">Todos los quizzes</option>
              {quizOptions.map(quiz => <option key={quiz.id} value={String(quiz.id)}>{quiz.title}</option>)}
            </select>
          </div>
          <Button type="submit" data-cy="analytics-apply" className="min-h-11 px-4 sm:col-span-2 lg:col-span-1 lg:mt-6" disabled={busy && !dirty}>Aplicar</Button>
        </form>
        <p id="analytics-filter-hint" className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Sin fechas se usa todo el periodo del curso. El quiz filtra solo las métricas de quizzes; el uso de VISTA y el estudio siguen el periodo. Fechas inclusivas, hora de Bogotá.
        </p>
        {dirty && <p role="status" data-cy="analytics-dirty" className="mt-3 text-sm text-muted-foreground">Tienes filtros sin aplicar. Pulsa «Aplicar» para actualizar el reporte.</p>}
        {applied && <div className="my-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" data-cy="analytics-applied">
            {applied.courseCode} · {appliedCourse?.termCode} · {periodLabel(applied)} · {report?.quiz?.title ?? (applied.quizId ? 'Quiz elegido' : 'Todos los quizzes')}
          </p>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {optional && <Button variant="ghost" className="min-h-11 px-3" data-cy="analytics-clear" onClick={() => clearOptional()}><X aria-hidden="true" />Quitar filtros</Button>}
            <Button variant="outline" className="min-h-11 flex-1 px-4 sm:flex-none" data-cy="analytics-export" disabled={result.status !== 'ready' || dirty || exporting} onClick={() => void exportCsv()}>
              {exporting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download aria-hidden="true" />}{exporting ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          </div>
        </div>}
        {exportError && <Alert className="mb-4"><span data-cy="analytics-export-error">{exportError}</span></Alert>}
        <p role="status" className="text-sm text-muted-foreground" data-cy="analytics-export-status">{exportNotice}</p>
        {busy && <p role="status" data-cy="analytics-loading" className="py-8 text-sm">Calculando métricas…</p>}
        {result.status === 'error' && <><Alert><span data-cy="analytics-report-error">{result.message}</span></Alert>
          <Button variant="outline" data-cy="analytics-report-retry" className="mt-3 min-h-11" onClick={() => applied && loadReport(applied)}>Reintentar</Button></>}
        {report && report.status !== 'AVAILABLE' && (
          <section className="border border-border bg-card p-5" data-cy="analytics-suppressed" aria-labelledby="analytics-suppressed-title">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 space-y-1.5">
                <h2 id="analytics-suppressed-title" className="text-sm font-semibold">{INSUFFICIENT_DATA}</h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  En {report.wholeTerm ? 'todo el periodo' : 'el periodo elegido'}, {report.course.code} tiene menos de {report.minimumParticipants} estudiantes con actividad en VISTA, en quizzes o en quizzes de estudio.
                  {report.wholeTerm ? ' El reporte aparecerá cuando el grupo tenga más actividad.' : ' Amplía el periodo o quita las fechas.'}
                </p>
                {!report.wholeTerm && <Button variant="outline" className="mt-2 min-h-11 px-3" data-cy="analytics-clear-dates" onClick={() => clearOptional(true)}><CalendarX aria-hidden="true" />Quitar fechas</Button>}
              </div>
            </div>
          </section>
        )}
        {report && report.status === 'AVAILABLE' && <>
          <div className="mb-6 flex overflow-x-auto border-b border-border scrollbar-custom" role="group" aria-label="Vista del reporte">
            {analyticsTabs.map(({ id, label }) => <button key={id} type="button" data-cy={`analytics-tab-${id}`} aria-pressed={tab === id}
              className={tabClass(tab === id)} onClick={() => setTab(id)}>{label}</button>)}
          </div>
          {tab === 'summary' && <AnalyticsSummary report={report} />}
          {tab === 'topics' && <AnalyticsTopics topics={report.topics} />}
          {tab === 'questions' && <AnalyticsQuestions hardest={report.hardestQuestions} easiest={report.easiestQuestions} />}
          {tab === 'quizzes' && <AnalyticsQuizzes quizzes={report.quizzes} />}
          {tab === 'usage' && <div className="space-y-5">
            <div className="inline-flex border border-border" role="group" aria-label="Vista de uso de VISTA">
              {analyticsViews.map(({ id, label }) => <button key={id} type="button" data-cy={`analytics-view-${id}`} aria-pressed={view === id}
                className={cn('min-h-11 px-4 text-[12px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  view === id ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => setView(id)}>{label}</button>)}
            </div>
            <AnalyticsRanking report={report} view={view} />
          </div>}
        </>}
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">Reporte agregado del grupo. No permite consultar ni filtrar el desempeño individual; los resultados por estudiante están en cada quiz.</p>
      </>}
    </main>
  </div>;
}
