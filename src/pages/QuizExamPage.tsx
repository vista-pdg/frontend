import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleCheck, EyeOff, Maximize, Send, ShieldCheck, Timer, TimerOff } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { Workspace } from '@/components/Workspace';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel } from '@/components/quiz/QuizPageShell';
import { useAuth } from '@/contexts/useAuth';
import { enterFullscreen, leaveFullscreen, useExamGuard } from '@/hooks/useExamGuard';
import { ApiError } from '@/lib/http';
import { answeredCount, clockOffset, formatDateTime, formatGrade, formatRemaining, remainingMs } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { answerQuestion, fetchAttempt, fetchMyQuizzes, reportIntegrityEvent, startAttempt, submitAttempt } from '@/services/quizService';
import type { AttemptDto, AttemptResultDto, IntegrityEventType, StudentQuizDto } from '@/types/quiz';

type Stage =
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'gate'; quiz: StudentQuizDto }
  | { kind: 'running' }
  | { kind: 'done'; result: AttemptResultDto; title: string };

const backLinkClass = 'inline-flex min-h-11 items-center justify-center border border-border px-4 text-[13px] font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const RULES = [
  'El tiempo corre desde que comienzas y no se pausa.',
  'Solo tienes un intento. Si recargas la página, retomas donde ibas.',
  'Usa el lienzo, el chat y los algoritmos de VISTA para razonar cada respuesta.',
  'Copiar, pegar, imprimir y salir de la pestaña están bloqueados y se registran para tu docente.',
];

function Centered({ children, 'data-cy': dataCy }: { children: React.ReactNode; 'data-cy': string }) {
  return (
    <div className="flex h-dvh w-screen items-center justify-center overflow-y-auto bg-shell p-4 text-foreground" data-cy="quiz-exam-page">
      <div className="h-[2px] bg-primary fixed inset-x-0 top-0" />
      <section data-cy={dataCy} className="w-full max-w-lg space-y-4 border border-border bg-card p-6">{children}</section>
    </div>
  );
}

function ResultView({ result, title }: { result: AttemptResultDto; title: string }) {
  const expired = result.status === 'EXPIRED';
  return (
    <Centered data-cy="quiz-result">
      <MicroLabel>{title}</MicroLabel>
      {expired
        ? <TimerOff className="size-7 text-annotation-orange" aria-hidden="true" />
        : <CircleCheck className="size-7 text-annotation-green" aria-hidden="true" />}
      <h1 className="text-lg font-semibold" data-cy="quiz-result-title">{expired ? 'Se acabó el tiempo' : 'Quiz entregado'}</h1>
      {expired && <p className="text-[13px] leading-relaxed">El quiz se cerró automáticamente y se calificó con lo que alcanzaste a responder.</p>}
      {result.gradeVisible ? (
        <div data-cy="quiz-result-grade">
          <p className="flex items-end gap-2"><span className="font-mono text-[44px] font-bold leading-none">{formatGrade(result.grade)}</span><span className="pb-1 font-mono text-base text-muted-foreground">/ 5,0</span></p>
          <p className="mt-3 text-[13px]">{result.score} de {result.total} respuestas correctas</p>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed" data-cy="quiz-result-hidden">Tus respuestas quedaron guardadas. Tu docente publicará la nota cuando lo decida.</p>
      )}
      <Link to="/quizzes" data-cy="quiz-result-back" className={backLinkClass}>Volver a mis quizzes</Link>
    </Centered>
  );
}

/** HU-34 · Modo de prueba: la pregunta junto al espacio de trabajo de VISTA, con protecciones. */
export function QuizExamPage() {
  const quizId = Number(useParams().quizId);
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [attempt, setAttempt] = useState<AttemptDto | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [current, setCurrent] = useState(1);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [incidents, setIncidents] = useState(0);
  const [mobileTab, setMobileTab] = useState<'question' | 'vista'>('question');
  const closing = useRef(false);

  const finish = useCallback((finished: AttemptDto) => {
    if (!finished.result) return;
    void leaveFullscreen();
    setConfirming(false);
    setAttempt(null);
    setStage({ kind: 'done', result: finished.result, title: finished.title });
  }, []);

  // Carga inicial: qué quiz es y en qué estado está para esta cuenta.
  useEffect(() => {
    const controller = new AbortController();
    fetchMyQuizzes(controller.signal).then(({ quizzes }) => {
      if (controller.signal.aborted) return;
      const quiz = quizzes.find(candidate => candidate.id === quizId);
      if (!quiz) return setStage({ kind: 'unavailable', message: 'Este quiz no está disponible para tu curso.' });
      if (quiz.state === 'UPCOMING') return setStage({ kind: 'unavailable', message: `Este quiz abre el ${formatDateTime(quiz.opensAt)}.` });
      if (quiz.state === 'MISSED') return setStage({ kind: 'unavailable', message: `Este quiz cerró el ${formatDateTime(quiz.closesAt)}.` });
      if (quiz.state === 'FINISHED' && quiz.result) return setStage({ kind: 'done', result: quiz.result, title: quiz.title });
      setStage({ kind: 'gate', quiz });
    }).catch(() => {
      if (!controller.signal.aborted) setStage({ kind: 'unavailable', message: 'No se pudo cargar el quiz. Revisa tu conexión e intenta de nuevo.' });
    });
    return () => controller.abort();
  }, [quizId]);

  const running = stage.kind === 'running' && attempt !== null;

  const onIncident = useCallback((type: IntegrityEventType) => {
    setIncidents(count => count + 1);
    reportIntegrityEvent(quizId, type).then(setIncidents).catch(() => undefined);
  }, [quizId]);
  const { obscured, resume } = useExamGuard(running, onIncident);

  async function begin() {
    if (starting) return;
    setStarting(true);
    setStartError('');
    await enterFullscreen();
    try {
      const started = await startAttempt(quizId);
      if (started.result) return finish(started);
      setOffset(clockOffset(started.serverTime, Date.now()));
      setNow(Date.now());
      setIncidents(started.integrityEvents);
      setAttempt(started);
      setCurrent(started.questions.find(q => q.selectedOption === null)?.position ?? 1);
      setStage({ kind: 'running' });
    } catch (error) {
      void leaveFullscreen();
      setStartError(error instanceof ApiError && error.status === 409 ? error.message : 'No se pudo iniciar el quiz. Intenta de nuevo.');
    } finally {
      setStarting(false);
    }
  }

  // Reloj: el plazo es del servidor; aquí solo se pinta y se dispara el cierre al llegar a cero.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [running]);

  const remaining = attempt ? remainingMs(attempt, offset, now) : 0;
  useEffect(() => {
    if (!running || remaining > 0 || closing.current) return;
    closing.current = true;
    submitAttempt(quizId).then(finish).catch(() => fetchAttempt(quizId).then(finish).catch(() => {
      setStage({ kind: 'unavailable', message: 'Se acabó el tiempo. Vuelve a tus quizzes para ver el resultado.' });
    }));
  }, [running, remaining, quizId, finish]);

  async function choose(position: number, option: number) {
    if (!attempt) return;
    const previous = attempt;
    setSaveError('');
    setAttempt({ ...attempt, questions: attempt.questions.map(q => q.position === position ? { ...q, selectedOption: option } : q) });
    try {
      const saved = await answerQuestion(quizId, position, option);
      setAttempt(saved);
      setSavedAt(new Date().toLocaleTimeString('es-CO', { hour12: false }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ATTEMPT_CLOSED') {
        fetchAttempt(quizId).then(finish).catch(() => undefined);
        return;
      }
      setAttempt(previous);
      setSaveError('No se pudo guardar tu respuesta. Revisa tu conexión y elige de nuevo.');
    }
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      finish(await submitAttempt(quizId));
    } catch {
      setSubmitError('No se pudo entregar el quiz. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const question = useMemo(() => attempt?.questions.find(q => q.position === current) ?? null, [attempt, current]);

  if (stage.kind === 'loading') {
    return <Centered data-cy="quiz-exam-loading"><p role="status" className="text-sm">Cargando el quiz…</p></Centered>;
  }
  if (stage.kind === 'unavailable') {
    return (
      <Centered data-cy="quiz-exam-unavailable">
        <Alert><span data-cy="quiz-exam-unavailable-message">{stage.message}</span></Alert>
        <Link to="/quizzes" className={backLinkClass}>Volver a mis quizzes</Link>
      </Centered>
    );
  }
  if (stage.kind === 'done') return <ResultView result={stage.result} title={stage.title} />;
  if (stage.kind === 'gate') {
    const { quiz } = stage;
    const resuming = quiz.state === 'IN_PROGRESS';
    return (
      <Centered data-cy="quiz-gate">
        <MicroLabel>{resuming ? 'Retomar el quiz' : 'Antes de comenzar'}</MicroLabel>
        <h1 className="text-lg font-semibold break-words">{quiz.title}</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {quiz.questionCount} preguntas · {quiz.timeLimitMinutes} minutos · cierra {formatDateTime(quiz.closesAt)}
        </p>
        <ul className="space-y-2">
          {RULES.map(rule => (
            <li key={rule} className="flex gap-2 text-[13px] leading-relaxed">
              <Check className="mt-0.5 size-3.5 shrink-0 text-annotation-green" aria-hidden="true" />{rule}
            </li>
          ))}
        </ul>
        {startError && <Alert><span data-cy="quiz-start-error">{startError}</span></Alert>}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void begin()} disabled={starting} data-cy="quiz-start" className="min-h-11 px-4">
            <Maximize aria-hidden="true" />{starting ? 'Comenzando…' : resuming ? 'Entrar en pantalla completa y continuar' : 'Entrar en pantalla completa y comenzar'}
          </Button>
          <Link to="/quizzes" className={backLinkClass}>Ahora no</Link>
        </div>
      </Centered>
    );
  }
  if (!attempt || !question) return null;

  const total = attempt.questions.length;
  const answered = answeredCount(attempt);
  const critical = remaining <= 60_000;
  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-shell text-foreground" data-cy="quiz-exam-page" data-exam-active="true">
      <div className="h-[2px] shrink-0 bg-primary" />
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <QuizBadge label="Modo de prueba" tone="warning" className="max-sm:hidden" />
          <h1 className="truncate text-sm font-semibold" data-cy="quiz-exam-title">{attempt.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground max-sm:hidden" data-cy="quiz-answered">Respondidas {answered} de {total}</p>
          <div role="timer" aria-label="Tiempo restante" data-cy="quiz-timer" data-critical={critical}
            className={cn('flex items-center gap-2 border px-2.5 py-1.5', critical ? 'border-destructive bg-destructive/15' : 'border-border')}>
            <Timer className="size-4" aria-hidden="true" />
            <span className="font-mono text-base font-semibold tabular-nums">{formatRemaining(remaining)}</span>
          </div>
          <span className="sr-only" role="status">{critical ? 'Queda menos de un minuto' : ''}</span>
          <Button onClick={() => { setSubmitError(''); setConfirming(true); }} data-cy="quiz-submit" className="min-h-11 px-4">
            <Send aria-hidden="true" />Entregar<span className="max-sm:hidden">&nbsp;quiz</span>
          </Button>
        </div>
      </header>

      <div className="flex shrink-0 border-b border-border lg:hidden" role="group" aria-label="Vista del quiz">
        {(['question', 'vista'] as const).map(tab => (
          <button key={tab} type="button" data-cy={`quiz-tab-${tab}`} aria-pressed={mobileTab === tab} onClick={() => setMobileTab(tab)}
            className={cn('min-h-11 flex-1 border-b-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              mobileTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground')}>
            {tab === 'question' ? 'Pregunta' : 'VISTA'}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <section aria-label="Pregunta del quiz" data-cy="quiz-question-panel"
          className={cn('relative flex w-full shrink-0 flex-col overflow-hidden border-r border-border bg-card lg:w-[420px]', mobileTab === 'vista' && 'max-lg:hidden')}>
          {/* Marca de agua con el correo: disuade de compartir fotos. Es un patrón SVG decorativo. */}
          <svg aria-hidden="true" focusable="false" data-cy="quiz-watermark" className="pointer-events-none absolute inset-0 z-10 size-full text-foreground opacity-[0.07]">
            <defs>
              <pattern id="quiz-watermark-pattern" width="260" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
                <text x="0" y="60" fontSize="12" fontFamily="ui-monospace, monospace" fill="currentColor">{user?.email}</text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#quiz-watermark-pattern)" />
          </svg>
          <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-custom">
            <nav aria-label="Preguntas" className="flex flex-wrap gap-2">
              {attempt.questions.map(q => (
                <button key={q.position} type="button" data-cy={`quiz-nav-${q.position}`} aria-current={q.position === current ? 'step' : undefined}
                  aria-label={`Pregunta ${q.position}${q.selectedOption !== null ? ', respondida' : ', sin responder'}`}
                  onClick={() => setCurrent(q.position)}
                  className={cn('flex size-11 items-center justify-center border font-mono text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    q.position === current ? 'border-2 border-primary bg-primary/12' : q.selectedOption !== null ? 'border-annotation-green' : 'border-border')}>
                  {q.position}
                </button>
              ))}
            </nav>
            <MicroLabel>Pregunta {current} de {total} · {question.topicLabel}</MicroLabel>
            <div className="space-y-2 border-l-2 border-annotation-yellow bg-shell p-3">
              <MicroLabel>Escenario para reproducir en VISTA</MicroLabel>
              <p className="text-[13px] leading-relaxed break-words" data-cy="quiz-scenario">{question.scenario}</p>
            </div>
            <p id="quiz-statement" className="text-sm font-medium leading-relaxed break-words" data-cy="quiz-statement">{question.statement}</p>
            <div role="radiogroup" aria-labelledby="quiz-statement" className="space-y-2" data-cy="quiz-options">
              {question.options.map((option, index) => {
                const selected = question.selectedOption === index;
                return (
                  <label key={index} data-cy={`quiz-option-${index}`} data-selected={selected}
                    className={cn('flex min-h-11 cursor-pointer gap-3 border p-3 text-[13px] leading-relaxed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                      selected ? 'border-2 border-primary bg-primary/12' : 'border-border hover:bg-muted')}>
                    <input type="radio" name={`question-${question.position}`} className="mt-1 size-4 shrink-0 accent-primary"
                      checked={selected} onChange={() => void choose(question.position, index)} />
                    <span className="min-w-0 break-words">{option}</span>
                  </label>
                );
              })}
            </div>
            {saveError && <Alert><span data-cy="quiz-save-error">{saveError}</span></Alert>}
            <div className="flex justify-between gap-3">
              <Button variant="outline" className="min-h-11 px-4" data-cy="quiz-prev" disabled={current <= 1} onClick={() => setCurrent(c => c - 1)}>
                <ArrowLeft aria-hidden="true" />Anterior
              </Button>
              <Button variant="outline" className="min-h-11 px-4" data-cy="quiz-next" disabled={current >= total} onClick={() => setCurrent(c => c + 1)}>
                Siguiente<ArrowRight aria-hidden="true" />
              </Button>
            </div>
            <p role="status" className="font-mono text-[11px] text-muted-foreground" data-cy="quiz-saved">{savedAt ? `Guardado · ${savedAt}` : ''}</p>
            <p className="flex gap-2 border border-border p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>Copiar, pegar, imprimir y salir de la pestaña están bloqueados y quedan registrados.{' '}
                <span data-cy="quiz-incidents">Incidentes: {incidents}</span></span>
            </p>
          </div>
        </section>

        <div className={cn('flex min-w-0 flex-1', mobileTab === 'question' && 'max-lg:hidden')} data-cy="quiz-workspace">
          <AppSidebar examMode onTutorial={() => undefined} />
          <Workspace />
        </div>

        {obscured && (
          <div role="alertdialog" aria-modal="true" aria-labelledby="quiz-obscured-title" data-cy="quiz-obscured"
            className="absolute inset-0 z-50 flex items-center justify-center bg-shell p-4">
            <div className="w-full max-w-md space-y-4 border border-border bg-card p-6">
              <EyeOff className="size-7 text-annotation-yellow" aria-hidden="true" />
              <h2 id="quiz-obscured-title" className="text-lg font-semibold">Saliste del quiz</h2>
              <p className="text-[13px] leading-relaxed">
                El contenido se oculta mientras la ventana no está activa. Este incidente quedó registrado
                ({incidents} en total) y tu docente podrá verlo.
              </p>
              <Button autoFocus onClick={resume} data-cy="quiz-resume" className="min-h-11 px-4">Volver al quiz</Button>
              <p className="text-[11px] text-muted-foreground">El temporizador sigue corriendo.</p>
            </div>
          </div>
        )}
      </div>

      <Modal open={confirming} title="¿Entregar el quiz?" onClose={() => setConfirming(false)} busy={submitting}>
        <p className="text-[13px] leading-relaxed" data-cy="quiz-confirm-message">
          {answered < total
            ? `Tienes ${total - answered} ${total - answered === 1 ? 'pregunta' : 'preguntas'} sin responder. `
            : 'Respondiste todas las preguntas. '}
          Después de entregar no podrás cambiar tus respuestas.
        </p>
        {submitError && <Alert className="mt-4"><span data-cy="quiz-submit-error">{submitError}</span></Alert>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" className="min-h-11 flex-1 px-4" onClick={() => setConfirming(false)} disabled={submitting} data-cy="quiz-confirm-cancel">Seguir respondiendo</Button>
          <Button className="min-h-11 flex-1 px-4" onClick={() => void submit()} disabled={submitting} data-cy="quiz-confirm-submit">{submitting ? 'Entregando…' : 'Entregar'}</Button>
        </div>
      </Modal>
    </div>
  );
}
