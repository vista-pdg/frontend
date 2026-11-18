import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { BankProgress } from '@/components/quiz/BankProgress';
import { BankQuestionCard } from '@/components/quiz/BankQuestionCard';
import { GuidancePanel } from '@/components/quiz/GuidancePanel';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel, QuizPageShell } from '@/components/quiz/QuizPageShell';
import { useBankGeneration } from '@/hooks/useBankGeneration';
import { ApiError } from '@/lib/http';
import { answerMark, formatDateTime, formatGrade, phaseLabel, resultStatusLabel } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { deleteBankQuestion, deleteQuiz, fetchQuizDetail, fetchQuizReport, fetchQuizResults, publishQuiz, setGradeVisibility } from '@/services/quizService';
import type { BankQuestionDto, QuizDetailDto, QuizResultsDto } from '@/types/quiz';

type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };
type Tab = 'results' | 'bank';
type Pending = { kind: 'question'; question: BankQuestionDto } | { kind: 'quiz' } | null;

function loadMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return 'No tienes acceso a este quiz.';
  if (error instanceof ApiError && error.status === 404) return 'Este quiz ya no existe.';
  return 'No se pudo cargar el quiz. Intenta de nuevo.';
}

function ResultsPanel({ quizId, showGrade, onVisibility }: { quizId: number; showGrade: boolean; onVisibility: (show: boolean) => Promise<void> }) {
  const [results, setResults] = useState<LoadState<QuizResultsDto>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuizResults(quizId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResults({ status: 'ready', data }); })
      .catch(err => { if (!controller.signal.aborted) setResults({ status: 'error', message: loadMessage(err) }); });
    return () => controller.abort();
  }, [quizId, attempt]);

  async function download(format: 'csv' | 'xlsx') {
    if (exporting) return;
    setExporting(format);
    setError('');
    setNotice('');
    try {
      const blob = await fetchQuizReport(quizId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vista-quiz-${quizId}-resultados.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Reporte ${format.toUpperCase()} descargado.`);
    } catch {
      setError('No se pudo exportar el reporte. Intenta de nuevo.');
    } finally {
      setExporting(null);
    }
  }
  async function toggle(show: boolean) {
    setToggling(true);
    setError('');
    try {
      await onVisibility(show);
      setNotice(show ? 'Los estudiantes ya pueden ver su nota.' : 'La nota quedó oculta para los estudiantes.');
    } catch {
      setError('No se pudo cambiar la visibilidad de la nota.');
    } finally {
      setToggling(false);
    }
  }

  if (results.status === 'loading') return <p role="status" className="py-8 text-sm" data-cy="quiz-results-loading">Cargando resultados…</p>;
  if (results.status === 'error') {
    return (
      <div className="py-6">
        <Alert><span data-cy="quiz-results-error">{results.message}</span></Alert>
        <Button variant="outline" className="mt-3 min-h-11 px-4" data-cy="quiz-results-retry" onClick={() => { setResults({ status: 'loading' }); setAttempt(n => n + 1); }}>Reintentar</Button>
      </div>
    );
  }
  const { stats, rows, quiz } = results.data;
  const questions = Array.from({ length: quiz.questionsPerStudent }, (_, i) => i);
  const started = rows.some(row => row.status !== 'NOT_STARTED');
  const tiles = [
    ['Promedio', formatGrade(stats.average), 'sobre 5,0'],
    ['Nota más alta', formatGrade(stats.highest), 'sobre 5,0'],
    ['Nota más baja', formatGrade(stats.lowest), 'sobre 5,0'],
    ['Entregas', `${stats.finished} / ${stats.enrolled}`, `${stats.inProgress} en curso · ${stats.notStarted} sin presentar`],
  ];
  return (
    <div className="space-y-5" data-cy="quiz-results">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" className="min-h-11 px-4" data-cy="quiz-results-refresh" onClick={() => { setResults({ status: 'loading' }); setAttempt(n => n + 1); }}>
          <RefreshCw aria-hidden="true" />Actualizar
        </Button>
        {(['csv', 'xlsx'] as const).map(format => (
          <Button key={format} variant="outline" className="min-h-11 px-4" data-cy={`quiz-export-${format}`} disabled={exporting !== null} onClick={() => void download(format)}>
            {exporting === format ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download aria-hidden="true" />}
            {format.toUpperCase()}
          </Button>
        ))}
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-cy="quiz-stats">
        {tiles.map(([label, value, detail], index) => (
          <div key={label} className="space-y-1.5 border border-border p-4">
            <dt><MicroLabel>{label}</MicroLabel></dt>
            <dd className="font-mono text-[26px] font-bold leading-tight" data-cy={`quiz-stat-${index}`}>{value}</dd>
            <dd className="text-[11px] text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px]">
        <input type="checkbox" role="switch" className="size-4 accent-primary" data-cy="quiz-grade-visibility" checked={showGrade} disabled={toggling}
          onChange={e => void toggle(e.target.checked)} />
        Los estudiantes ven su nota al finalizar
      </label>
      {error && <Alert><span data-cy="quiz-results-action-error">{error}</span></Alert>}
      <p role="status" className="text-sm text-muted-foreground" data-cy="quiz-results-notice">{notice}</p>
      {rows.length === 0 ? (
        <p className="border border-border p-6 text-sm" data-cy="quiz-results-empty">Este curso no tiene estudiantes matriculados ni entregas.</p>
      ) : (
        <>
          {!started && <p className="text-sm text-muted-foreground" data-cy="quiz-results-none">Aún no hay entregas para este quiz.</p>}
          <div role="region" aria-label="Tabla de resultados, desplazable" tabIndex={0} className="relative overflow-x-auto border border-border scrollbar-custom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <table className="w-full min-w-[860px] text-left text-[13px]" data-cy="quiz-results-table">
              <caption className="sr-only">Resultados por estudiante</caption>
              <thead>
                <tr className="border-b border-border">
                  {['Estudiante', 'Correo', 'Estado', 'Aciertos', 'Nota', 'Incidentes', ...questions.map(i => `P${i + 1}`)].map(heading => (
                    <th key={heading} scope="col" className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const status = resultStatusLabel[row.status];
                  return (
                    <tr key={row.studentId} data-cy="quiz-result-row" data-email={row.email} data-status={row.status} className="border-b border-border last:border-b-0">
                      <th scope="row" className="px-3 py-3 font-normal break-words">{row.displayName}</th>
                      <td className="px-3 py-3 text-muted-foreground break-all">{row.email}</td>
                      <td className="px-3 py-3"><QuizBadge label={status.label} tone={status.tone} /></td>
                      <td className="px-3 py-3 font-mono" data-cy="quiz-result-score">{row.score === null ? '—' : `${row.score} / ${row.total}`}</td>
                      <td className="px-3 py-3 font-mono" data-cy="quiz-result-grade">{formatGrade(row.grade)}</td>
                      <td className="px-3 py-3 font-mono" data-cy="quiz-result-incidents">{row.integrityEvents ?? '—'}</td>
                      {questions.map(i => {
                        const mark = row.answers[i] ? answerMark[row.answers[i]] : null;
                        return <td key={i} className="px-3 py-3 font-mono"><span aria-hidden="true">{mark?.symbol ?? '·'}</span><span className="sr-only">{mark?.label ?? 'Sin dato'}</span></td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">✓ correcta · ✗ incorrecta · — sin responder · «·» intento sin cerrar o sin presentar.</p>
        </>
      )}
    </div>
  );
}

/** HU-34 · Detalle docente de un quiz: banco de preguntas y resultados. */
export function QuizDetailPage() {
  const quizId = Number(useParams().quizId);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<LoadState<QuizDetailDto>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [publishing, setPublishing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const trigger = useRef<HTMLElement | null>(null);

  const reload = useCallback(() => setAttempt(n => n + 1), []);
  const generation = useBankGeneration(Number.isInteger(quizId) ? quizId : null, reload);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuizDetail(quizId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setDetail({ status: 'ready', data }); })
      .catch(err => { if (!controller.signal.aborted) setDetail({ status: 'error', message: loadMessage(err) }); });
    return () => controller.abort();
  }, [quizId, attempt]);

  if (detail.status !== 'ready') {
    return (
      <QuizPageShell section="Quizzes del curso" data-cy="quiz-detail-page">
        {detail.status === 'loading'
          ? <p role="status" className="text-sm" data-cy="quiz-detail-loading">Cargando el quiz…</p>
          : <>
              <Alert><span data-cy="quiz-detail-error">{detail.message}</span></Alert>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="outline" className="min-h-11 px-4" data-cy="quiz-detail-retry" onClick={() => { setDetail({ status: 'loading' }); reload(); }}>Reintentar</Button>
                <Link to="/docencia/quizzes" className="inline-flex min-h-11 items-center border border-border px-4 text-[13px] font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Volver a quizzes</Link>
              </div>
            </>}
      </QuizPageShell>
    );
  }

  const { quiz, questions } = detail.data;
  const draft = quiz.status === 'DRAFT';
  const active: Tab = tab ?? (draft ? 'bank' : 'results');
  const missing = Math.max(0, quiz.bankTarget - quiz.bankSize);
  const phase = phaseLabel[quiz.phase];
  const generating = generation.state.status === 'running';

  async function publish() {
    setPublishing(true);
    setActionError('');
    try {
      await publishQuiz(quizId);
      setNotice('Quiz publicado. Los estudiantes del curso ya lo ven.');
      setTab('results');
      reload();
    } catch (error) {
      setActionError(error instanceof ApiError && error.status === 409 ? error.message : 'No se pudo publicar el quiz. Intenta de nuevo.');
    } finally {
      setPublishing(false);
    }
  }
  async function confirmPending() {
    if (!pending) return;
    try {
      if (pending.kind === 'question') {
        await deleteBankQuestion(quizId, pending.question.id);
        setNotice('Pregunta eliminada. Genera el reemplazo antes de publicar.');
        reload();
      } else {
        await deleteQuiz(quizId);
        navigate('/docencia/quizzes');
      }
    } catch (error) {
      throw new Error(error instanceof ApiError && error.status === 409 ? error.message : 'No se pudo eliminar. Intenta de nuevo.', { cause: error });
    }
  }
  async function changeVisibility(show: boolean) {
    const updated = await setGradeVisibility(quizId, show);
    setDetail(current => current.status === 'ready' ? { status: 'ready', data: { ...current.data, quiz: updated } } : current);
  }

  return (
    <QuizPageShell section="Quizzes del curso" data-cy="quiz-detail-page">
      <Link to="/docencia/quizzes" data-cy="quiz-detail-back" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeft className="size-4" aria-hidden="true" />Quizzes
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[20px] font-bold tracking-tight break-words" data-cy="quiz-detail-title">{quiz.title}</h1>
            <QuizBadge label={phase.label} tone={phase.tone} data-cy="quiz-detail-phase" />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {quiz.courseCode} · {quiz.questionsPerStudent} por estudiante · {quiz.timeLimitMinutes} min · {formatDateTime(quiz.opensAt)} → {formatDateTime(quiz.closesAt)}
          </p>
          <p className="text-xs text-muted-foreground break-words">{quiz.topics.map(topic => topic.label).join(' · ')}</p>
        </div>
        {quiz.attemptsStarted === 0 && (
          <Button variant="destructive" className="min-h-11 px-4" data-cy="quiz-delete" disabled={generating}
            onClick={event => { trigger.current = event.currentTarget; setPending({ kind: 'quiz' }); }}>
            <Trash2 aria-hidden="true" />Eliminar quiz
          </Button>
        )}
      </div>

      {actionError && <Alert className="mt-4"><span data-cy="quiz-detail-action-error">{actionError}</span></Alert>}
      <p role="status" className="mt-3 text-sm text-muted-foreground" data-cy="quiz-detail-notice">{notice}</p>

      <div className="my-5 flex border-b border-border" role="group" aria-label="Sección del quiz">
        {([['results', 'Resultados'], ['bank', `Banco (${quiz.bankSize})`]] as const).map(([id, label]) => (
          <button key={id} type="button" data-cy={`quiz-detail-tab-${id}`} aria-pressed={active === id} onClick={() => setTab(id)}
            className={cn('min-h-11 flex-1 border-b-2 px-2 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-none sm:px-6',
              active === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {active === 'results' && (draft
        ? <p className="border border-border p-6 text-sm" data-cy="quiz-results-draft">Publica el quiz para que los estudiantes puedan presentarlo. Los resultados aparecerán aquí.</p>
        : <ResultsPanel quizId={quizId} showGrade={quiz.showGrade} onVisibility={changeVisibility} />)}

      {active === 'bank' && (
        <div className="space-y-5" data-cy="quiz-bank">
          {draft && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <BankProgress state={generation.state} bankSize={quiz.bankSize} bankTarget={quiz.bankTarget}
                onStart={() => void generation.start()} onPause={generation.pause} />
              <div className="flex flex-wrap gap-3 lg:flex-col">
                <Button variant="outline" className="min-h-11 px-4" data-cy="bank-generate" disabled={missing === 0 || generating} onClick={() => void generation.start()}>
                  <Sparkles aria-hidden="true" />{missing === 0 ? 'Banco completo' : `Generar ${missing} ${missing === 1 ? 'faltante' : 'faltantes'}`}
                </Button>
                <Button className="min-h-11 px-4" data-cy="quiz-publish" disabled={missing > 0 || generating || publishing} onClick={() => void publish()}>
                  <Send aria-hidden="true" />{publishing ? 'Publicando…' : 'Publicar quiz'}
                </Button>
                <p className="max-w-56 text-[11px] leading-relaxed text-muted-foreground">Publicar se habilita con el banco completo; al publicar ya no se edita.</p>
              </div>
            </div>
          )}
          <GuidancePanel quizId={quizId} editable={draft} instructions={detail.data.instructions} materials={detail.data.materials}
            onChange={next => setDetail(current => current.status === 'ready' ? { status: 'ready', data: { ...current.data, ...next } } : current)} />
          {questions.length === 0
            ? <p className="border border-border p-6 text-sm" data-cy="quiz-bank-empty">El banco está vacío. Genera las preguntas para revisarlas.</p>
            : (
              <ol className="space-y-4" data-cy="quiz-bank-list">
                {questions.map((question, index) => (
                  <BankQuestionCard key={question.id} quizId={quizId} question={question} number={index + 1} canDelete={draft} busy={generating}
                    onDelete={target => { trigger.current = target; setPending({ kind: 'question', question }); }}
                    onSaved={updated => {
                      setNotice(`Pregunta ${index + 1} actualizada.`);
                      setDetail(current => current.status === 'ready'
                        ? { status: 'ready', data: { ...current.data, questions: current.data.questions.map(q => q.id === updated.id ? updated : q) } }
                        : current);
                    }} />
                ))}
              </ol>
            )}
        </div>
      )}

      <ConfirmationDialog
        open={pending !== null}
        title={pending?.kind === 'quiz' ? 'Eliminar quiz' : 'Eliminar pregunta'}
        description={pending?.kind === 'quiz'
          ? 'Se eliminará el quiz con todo su banco. Esta acción no se puede deshacer.'
          : 'La pregunta saldrá del banco y habrá que generar un reemplazo antes de publicar.'}
        target={pending?.kind === 'quiz' ? { name: quiz.title, detail: quiz.courseCode } : pending ? { name: pending.question.statement, detail: pending.question.topicLabel } : null}
        confirmLabel="Eliminar"
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
        restoreFocus={() => trigger.current}
      />
    </QuizPageShell>
  );
}
