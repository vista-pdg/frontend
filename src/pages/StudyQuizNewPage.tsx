import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BankProgress, type BankProgressCopy } from '@/components/quiz/BankProgress';
import { QuizField } from '@/components/quiz/QuizField';
import { QuizPageShell, quizControlClass } from '@/components/quiz/QuizPageShell';
import { TopicPicker } from '@/components/quiz/TopicPicker';
import { useBankGeneration, type BankProgress as Progress } from '@/hooks/useBankGeneration';
import { ApiError } from '@/lib/http';
import { KEEPS_STUDY, estimatedBatches, fieldDescribedBy, validateStudyForm, type StudyFormErrors } from '@/lib/quiz';
import { fetchQuota } from '@/services/assistantService';
import { createStudyQuiz, fetchStudyTopics, generateStudyBatch } from '@/services/studyQuizService';
import type { QuizTopicDto } from '@/types/quiz';

const STUDY_COPY: BankProgressCopy = {
  running: 'Generando tu quiz',
  complete: 'Quiz listo',
  idle: 'Tu quiz de estudio',
  explanation: 'VISTA valida cada escenario con la ruta del chat y ejecuta el algoritmo antes de pedir la pregunta al modelo. Puedes salir: tu quiz conserva lo generado.',
  completeMessage: size => `Tu quiz de estudio está listo: ${size} ${size === 1 ? 'pregunta' : 'preguntas'}.`,
  resume: 'Reintentar',
  review: 'Empezar',
};

const backClass = 'inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-primary-light hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

type TopicsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; topics: QuizTopicDto[] };

/** HU-35 · CA-5: el estudiante arma un quiz de estudio con el mismo generador de los de curso. */
export function StudyQuizNewPage() {
  const navigate = useNavigate();
  const [topicsState, setTopicsState] = useState<TopicsState>({ status: 'loading' });
  const [reload, setReload] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState('5');
  const [errors, setErrors] = useState<StudyFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [quizId, setQuizId] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ bankSize: 0, bankTarget: 0 });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudyTopics(controller.signal)
      .then(topics => { if (!controller.signal.aborted) setTopicsState({ status: 'ready', topics }); })
      .catch(() => { if (!controller.signal.aborted) setTopicsState({ status: 'error' }); });
    fetchQuota().then(quota => { if (!controller.signal.aborted) setRemaining(quota.remaining); }).catch(() => undefined);
    return () => controller.abort();
  }, [reload]);

  const onProgress = useCallback((next: Progress) => setProgress(next), []);
  const generation = useBankGeneration(quizId, onProgress, generateStudyBatch, KEEPS_STUDY);
  const locked = quizId !== null;

  function toggle(key: string) {
    setSelected(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || locked) return;
    const found = validateStudyForm({ title, topics: selected, questionCount });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = found.topics ? '[data-cy^="quiz-topic-"]' : found.questionCount ? '#study-count' : '#study-title';
      formRef.current?.querySelector<HTMLElement>(first)?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await createStudyQuiz({ title: title.trim(), topics: selected, questionCount: Number(questionCount) });
      setQuizId(created.id);
      setProgress({ bankSize: 0, bankTarget: created.questionCount });
      void generation.start(created.id);
    } catch (error) {
      setSubmitError(error instanceof ApiError && (error.status ?? 500) < 500 ? error.message : 'No se pudo crear el quiz. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const count = Number(questionCount);
  const batches = Number.isInteger(count) && count >= 1 && count <= 10 ? estimatedBatches(count, Math.max(1, selected.length)) : 0;
  const quotaShort = remaining !== null && batches > remaining;

  return (
    <QuizPageShell section="Quizzes" data-cy="study-new-page">
      <Link to="/quizzes" className={backClass}><ArrowLeft className="size-4" aria-hidden="true" />Volver a mis quizzes</Link>
      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form ref={formRef} noValidate onSubmit={event => void submit(event)} className="min-w-0 space-y-6" data-cy="study-form">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Nuevo quiz de estudio</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Elige los temas que quieres practicar. Solo tú verás este quiz.</p>
          </div>
          <QuizField id="study-title" label="Título (opcional)" error={errors.title} hint="Si lo dejas vacío, se nombra con los temas.">
            <input id="study-title" className={quizControlClass} value={title} maxLength={200} disabled={locked}
              onChange={event => setTitle(event.target.value)} data-cy="study-title"
              aria-invalid={!!errors.title} aria-describedby={fieldDescribedBy('study-title', errors.title, 'hint')} />
          </QuizField>
          {topicsState.status === 'loading' && <p role="status" className="text-sm">Cargando temas…</p>}
          {topicsState.status === 'error' && (
            <div>
              <Alert><span data-cy="study-topics-error">No se pudieron cargar los temas.</span></Alert>
              <Button type="button" variant="outline" className="mt-3 min-h-11 px-4" onClick={() => { setTopicsState({ status: 'loading' }); setReload(n => n + 1); }}>Reintentar</Button>
            </div>
          )}
          {topicsState.status === 'ready' && (
            <TopicPicker topics={topicsState.topics} selected={selected} onToggle={toggle} disabled={locked} error={errors.topics}
              legend="Temas" hint="Cada pregunta trae un escenario que VISTA reproduce desde el chat o el panel de algoritmos." />
          )}
          <QuizField id="study-count" label="Número de preguntas (1 a 10)" error={errors.questionCount}>
            <input id="study-count" type="number" min={1} max={10} inputMode="numeric" className={quizControlClass} value={questionCount}
              disabled={locked} onChange={event => setQuestionCount(event.target.value)} data-cy="study-count"
              aria-invalid={!!errors.questionCount} aria-describedby={fieldDescribedBy('study-count', errors.questionCount)} />
          </QuizField>
          {batches > 0 && (
            <p className="flex items-start gap-3 bg-card p-3 text-[13px] leading-relaxed" data-cy="study-cost">
              <Database className="mt-0.5 size-4 shrink-0 text-primary-light" aria-hidden="true" />
              <span>
                {count} {count === 1 ? 'pregunta' : 'preguntas'} en {batches} {batches === 1 ? 'lote' : 'lotes'} · usa {batches} {batches === 1 ? 'mensaje' : 'mensajes'} de tu cuota diaria
                {remaining !== null && <> (te quedan {remaining})</>}.
                {quotaShort && <> No alcanza para todo: lo generado se conserva y podrás completarlo mañana.</>}
              </span>
            </p>
          )}
          {submitError && <Alert><span data-cy="study-submit-error">{submitError}</span></Alert>}
          {!locked && (
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="min-h-11 px-4" disabled={submitting || topicsState.status !== 'ready'} data-cy="study-submit">
                <Sparkles aria-hidden="true" />{submitting ? 'Creando…' : 'Generar quiz de estudio'}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 px-4" onClick={() => navigate('/quizzes')}>Cancelar</Button>
            </div>
          )}
        </form>
        {quizId !== null && (
          <div className="min-w-0">
            <BankProgress state={generation.state} bankSize={progress.bankSize} bankTarget={progress.bankTarget}
              onStart={() => void generation.start()} onPause={generation.pause} reviewTo={`/quizzes/estudio/${quizId}`} copy={STUDY_COPY} />
            {generation.state.status !== 'running' && generation.state.status !== 'complete' && progress.bankSize > 0 && (
              <Link to={`/quizzes/estudio/${quizId}`} data-cy="study-start-partial" className={`${backClass} mt-3`}>
                Empezar con las {progress.bankSize} preguntas generadas
              </Link>
            )}
          </div>
        )}
      </div>
    </QuizPageShell>
  );
}
