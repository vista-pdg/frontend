import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { ManagementHeader } from '@/components/ManagementHeader';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AnalyticsRanking } from '@/components/AnalyticsRanking';
import { fetchAnalyticsCourses, fetchAnalyticsCsv, fetchPedagogicalReport } from '@/services/pedagogicalAnalyticsService';
import { analyticsDateLabel, defaultAnalyticsDates, sameAnalyticsFilter, validateAnalyticsFilter, analyticsViews, type AnalyticsView } from '@/lib/analytics';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { CourseDto } from '@/types/auth';
import type { AnalyticsFilter, PedagogicalReport } from '@/types/analytics';

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };
const controlClass = 'min-h-11 w-full min-w-0 border border-border bg-shell px-3 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50';

export function AnalyticsPage() {
  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState<LoadState<CourseDto[]>>({ status: 'loading' });
  const [courseAttempt, setCourseAttempt] = useState(0);
  const [draft, setDraft] = useState<AnalyticsFilter>(() => ({ courseCode: '', ...defaultAnalyticsDates() }));
  const [applied, setApplied] = useState<AnalyticsFilter | null>(null);
  const [result, setResult] = useState<LoadState<PedagogicalReport>>({ status: 'loading' });
  const [errors, setErrors] = useState<Partial<Record<keyof AnalyticsFilter, string>>>({});
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
        const filter = { courseCode: data[0].code, ...defaultAnalyticsDates() };
        setDraft(filter);
        setApplied(filter);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setCourses({ status: 'error', message: 'No se pudieron cargar los cursos. Intenta de nuevo.' });
    });
    return () => controller.abort();
  }, [courseAttempt]);

  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController();
    fetchPedagogicalReport(applied, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ status: 'ready', data });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ status: 'error', message: error instanceof ApiError && error.status === 403
        ? 'No tienes acceso a este curso.' : 'No se pudo cargar el reporte. Intenta de nuevo.' });
    });
    return () => controller.abort();
  }, [applied]);
  useEffect(() => () => exportRequest.current?.abort(), []);

  const dirty = applied !== null && !sameAnalyticsFilter(draft, applied);
  const hasCourses = courses.status === 'ready' && courses.data.length > 0;
  const busy = applied !== null && result.status === 'loading';
  function cancelExport() {
    exportRequest.current?.abort();
    setExporting(false);
    setExportError('');
    setExportNotice('');
  }
  function changeFilter(field: keyof AnalyticsFilter, value: string) {
    cancelExport();
    setDraft(current => ({ ...current, [field]: value }));
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
      link.download = `vista-analitica-${applied.from}-${applied.to}.csv`;
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

  return <div className="h-full w-full overflow-y-auto bg-shell text-foreground scrollbar-custom [scrollbar-gutter:stable]" data-cy="analytics-page">
    <a href="#analytics-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-shell focus:p-3 focus:text-foreground focus:outline-2 focus:outline-ring">Saltar al reporte</a>
    <div className="fixed top-0 left-0 right-0 z-30 h-[2px] bg-primary" />
    <ManagementHeader section="Panel analítico" />
    <main id="analytics-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-[20px] font-bold tracking-tight">Analítica pedagógica</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Identifica los temas que necesitan refuerzo en tu cohorte.</p>
      {courses.status === 'loading' && <p role="status" className="mt-6 text-sm" data-cy="analytics-courses-loading">Cargando cursos…</p>}
      {courses.status === 'error' && <div className="mt-6"><Alert><span data-cy="analytics-courses-error">{courses.message}</span></Alert>
        <Button className="mt-3 min-h-11" data-cy="analytics-courses-retry" onClick={() => { setCourses({ status: 'loading' }); setCourseAttempt(n => n + 1); }}>Reintentar</Button></div>}
      {courses.status === 'ready' && !hasCourses && <p className="mt-6 border border-border p-6 text-sm" data-cy="analytics-no-courses">
        No tienes cursos disponibles para consultar. {isAdmin ? 'Revisa los cursos configurados en Administración.' : 'Solicita la asignación de tu curso al administrador.'}</p>}
      {hasCourses && <>
        <form ref={formRef} onSubmit={submit} noValidate autoComplete="off" className="mt-8 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]" aria-label="Filtros del reporte">
          <div className="min-w-0"><label htmlFor="analytics-course" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Curso</label>
            <select id="analytics-course" name="courseCode" data-cy="analytics-course" className={controlClass} value={draft.courseCode}
              onChange={e => changeFilter('courseCode', e.target.value)} aria-invalid={!!errors.courseCode} aria-describedby={errors.courseCode ? 'analytics-course-error' : undefined}>
              {courses.status === 'ready' && courses.data.map(course => <option key={course.code} value={course.code}>{course.code} · {course.name} · {course.termCode}</option>)}
            </select>
            {errors.courseCode && <p id="analytics-course-error" role="alert" className="mt-2 text-xs text-foreground">{errors.courseCode}</p>}
          </div>
          {(['from', 'to'] as const).map(field => <div key={field} className="min-w-0">
            <label htmlFor={`analytics-${field}`} className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{field === 'from' ? 'Desde' : 'Hasta'}</label>
            <input id={`analytics-${field}`} name={field} data-cy={`analytics-${field}`} type="date" min="0001-01-01" max="9999-12-31" className={controlClass}
              value={draft[field]} onChange={e => changeFilter(field, e.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `analytics-${field}-error` : undefined} />
            {errors[field] && <p id={`analytics-${field}-error`} role="alert" className="mt-2 text-xs text-foreground">{errors[field]}</p>}
          </div>)}
          <Button type="submit" data-cy="analytics-apply" className="min-h-11 px-4 sm:mt-6" disabled={busy && !dirty}>Aplicar filtros</Button>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Fechas inclusivas · Hora de Bogotá. Solo se muestran métricas de grupos con al menos 5 estudiantes.</p>
        {dirty && <p role="status" data-cy="analytics-dirty" className="mt-3 text-sm text-muted-foreground">Tienes filtros sin aplicar. Aplica los filtros para actualizar el reporte.</p>}
        {applied && <div className="my-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" data-cy="analytics-applied">{applied.courseCode} · {courses.status === 'ready' && courses.data.find(c => c.code === applied.courseCode)?.termCode}
            {' · '}{analyticsDateLabel(applied.from)} – {analyticsDateLabel(applied.to)}</p>
          <Button variant="outline" className="min-h-11 w-full px-4 sm:w-auto" data-cy="analytics-export" disabled={result.status !== 'ready' || dirty || exporting} onClick={() => void exportCsv()}>
            {exporting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download aria-hidden="true" />}{exporting ? 'Exportando…' : 'Exportar CSV'}
          </Button>
        </div>}
        {exportError && <Alert className="mb-4"><span data-cy="analytics-export-error">{exportError}</span></Alert>}
        <p role="status" className="text-sm text-muted-foreground" data-cy="analytics-export-status">{exportNotice}</p>
        <div className="mb-6 flex border-b border-border" role="group" aria-label="Vista del reporte">
          {analyticsViews.map(({ id, label }) => <button key={id} type="button" data-cy={`analytics-view-${id}`} aria-pressed={view === id}
            className={cn('min-h-11 flex-1 border-b-2 px-2 py-3 text-[12px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-none sm:px-5', view === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            onClick={() => setView(id)}>{label}</button>)}
        </div>
        {busy && <p role="status" data-cy="analytics-loading" className="py-8 text-sm">Calculando métricas…</p>}
        {result.status === 'error' && <><Alert><span data-cy="analytics-report-error">{result.message}</span></Alert>
          <Button variant="outline" data-cy="analytics-report-retry" className="mt-3 min-h-11" onClick={() => applied && loadReport(applied)}>Reintentar</Button></>}
        {result.status === 'ready' && <AnalyticsRanking report={result.data} view={view} />}
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">Reporte agregado. No permite consultar ni filtrar el desempeño individual.</p>
      </>}
    </main>
  </div>;
}
