import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, CircleX, Eye, Lightbulb, Sparkles } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { Workspace } from '@/components/Workspace';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BankProgress, type BankProgressCopy } from '@/components/quiz/BankProgress';
import { OptionOutcome } from '@/components/quiz/OptionOutcome';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel } from '@/components/quiz/QuizPageShell';
import { ScenarioCard } from '@/components/quiz/ScenarioCard';
import { StudyTutor } from '@/components/quiz/StudyTutor';
import { useBankGeneration, type BankProgress as Progress } from '@/hooks/useBankGeneration';
import { useVisibleTime } from '@/hooks/useVisibleTime';
import { ApiError } from '@/lib/http';
import { KEEPS_STUDY, optionMark, studySummary } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { fetchQuota } from '@/services/assistantService';
import { answerStudyQuestion, fetchStudyQuiz, generateStudyBatch, revealStudyHint, revealStudySolution } from '@/services/studyQuizService';
import type { StudyQuestionDto, StudyQuizDto, TutorTurn } from '@/types/quiz';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

const linkButton = 'inline-flex min-h-11 items-center justify-center gap-2 border border-border px-4 text-[13px] font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const COMPLETE_COPY: BankProgressCopy = {
  running: 'Completando tu quiz',
  complete: 'Quiz completo',
  idle: 'Quiz incompleto',
  explanation: 'Cada lote usa un mensaje de tu cuota diaria. Puedes responder mientras tanto: lo generado se conserva.',
  completeMessage: size => `Tu quiz ya tiene sus ${size} preguntas.`,
  resume: 'Completar',
  review: 'Empezar',
};

function resolved(q: StudyQuestionDto) {
  return q.selectedOption !== null || q.solutionShown;
}

/** HU-35 · CA-6 y CA-7: resolver un quiz de estudio junto a VISTA, con pista, solución y tutor. */
export function StudyQuizPage() {
  const id = Number(useParams().id);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [quiz, setQuiz] = useState<StudyQuizDto | null>(null);
  const [reload, setReload] = useState(0);
  const [current, setCurrent] = useState(1);
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<'hint' | 'check' | 'solution' | null>(null);
  const [actionError, setActionError] = useState('');
  const [mobileTab, setMobileTab] = useState<'question' | 'vista'>('question');
  const [conversations, setConversations] = useState<Record<number, TutorTurn[]>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudyQuiz(id, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      // La primera carga abre la primera pregunta sin resolver; las recargas respetan la actual.
      if (firstLoad.current) {
        firstLoad.current = false;
        setCurrent(data.questions.find(q => !resolved(q))?.position ?? 1);
      }
      setQuiz(data);
      setLoad({ status: 'ready' });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setLoad({ status: 'error', message: error instanceof ApiError && error.status === 404 ? error.message : 'No se pudo cargar tu quiz. Revisa tu conexión e intenta de nuevo.' });
    });
    fetchQuota().then(quota => { if (!controller.signal.aborted) setRemaining(quota.remaining); }).catch(() => undefined);
    return () => controller.abort();
  }, [id, reload]);

  // Completar un quiz que quedó a medias: el mismo generador de la creación.
  const onProgress = useCallback((next: Progress) => { setProgress(next); setReload(n => n + 1); }, []);
  const generation = useBankGeneration(id, onProgress, generateStudyBatch, KEEPS_STUDY);

  // HU-36 · CA-9: tiempo que la pregunta estuvo visible antes de comprobarla.
  const elapsed = useVisibleTime(quiz ? current : null);

  function replace(updated: StudyQuestionDto) {
    setQuiz(previous => previous && { ...previous, questions: previous.questions.map(q => q.position === updated.position ? updated : q) });
  }

  async function act(kind: 'hint' | 'check' | 'solution', position: number) {
    if (busy) return;
    setBusy(kind);
    setActionError('');
    try {
      if (kind === 'hint') replace(await revealStudyHint(id, position));
      else if (kind === 'solution') replace(await revealStudySolution(id, position));
      else replace(await answerStudyQuestion(id, position, choices[position], elapsed(position)));
    } catch (error) {
      setActionError(error instanceof ApiError && error.status === 409 ? error.message : 'No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(null);
    }
  }

  if (load.status === 'loading') {
    return <div className="flex h-dvh items-center justify-center bg-shell text-foreground" data-cy="study-page"><p role="status" className="text-sm">Cargando tu quiz…</p></div>;
  }
  if (load.status === 'error' || !quiz) {
    return (
      <div className="flex h-dvh items-center justify-center bg-shell p-4 text-foreground" data-cy="study-page">
        <section className="w-full max-w-lg space-y-4 border border-border bg-card p-6">
          <Alert><span data-cy="study-page-error">{load.status === 'error' ? load.message : ''}</span></Alert>
          <Link to="/quizzes" className={linkButton}><ArrowLeft className="size-4" aria-hidden="true" />Volver a mis quizzes</Link>
        </section>
      </div>
    );
  }

  const questions = quiz.questions;
  const total = quiz.quiz.questionCount;
  const summary = studySummary(questions);
  const incomplete = questions.length < total;
  const question = questions.find(q => q.position === current) ?? questions[0] ?? null;
  const done = !incomplete && summary.resolved === total;

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-shell text-foreground" data-cy="study-page">
      <div className="h-[2px] shrink-0 bg-primary" />
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <QuizBadge label="Modo estudio" tone="success" className="max-sm:hidden" />
          <h1 className="truncate text-sm font-semibold" data-cy="study-title-heading">{quiz.quiz.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground" data-cy="study-summary-line">
            Respondidas {summary.answered} de {total} · {summary.correct} {summary.correct === 1 ? 'acierto' : 'aciertos'}
          </p>
          <Link to="/quizzes" className={cn(linkButton, 'max-sm:px-3')} data-cy="study-exit"><ArrowLeft className="size-4" aria-hidden="true" /><span className="max-sm:hidden">Mis quizzes</span><span className="sm:hidden">Salir</span></Link>
        </div>
      </header>

      <div className="flex shrink-0 border-b border-border lg:hidden" role="group" aria-label="Vista del quiz">
        {(['question', 'vista'] as const).map(tab => (
          <button key={tab} type="button" data-cy={`study-tab-${tab}`} aria-pressed={mobileTab === tab} onClick={() => setMobileTab(tab)}
            className={cn('min-h-11 flex-1 border-b-2 text-[13px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              mobileTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground')}>
            {tab === 'question' ? 'Pregunta' : 'VISTA'}
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <section aria-label="Pregunta de estudio" data-cy="study-question-panel"
          className={cn('flex w-full shrink-0 flex-col overflow-hidden border-r border-border bg-card lg:w-[420px]', mobileTab === 'vista' && 'max-lg:hidden')}>
          {/* relative: los textos sr-only del tutor (absolutos) quedan dentro del panel y no alargan el documento. */}
          <div className="relative flex-1 space-y-4 overflow-y-auto p-5 scrollbar-custom">
            {incomplete && (
              <div className="space-y-3" data-cy="study-incomplete">
                <p className="text-[13px] leading-relaxed">Tu quiz tiene {questions.length} de {total} preguntas. Puedes responderlas ya o completar la generación.</p>
                {generation.state.status === 'idle' && progress === null
                  ? <Button variant="outline" className="min-h-11 px-4" onClick={() => void generation.start()} data-cy="study-complete"><Sparkles aria-hidden="true" />Completar</Button>
                  : <BankProgress state={generation.state} bankSize={progress?.bankSize ?? questions.length} bankTarget={total}
                      onStart={() => void generation.start()} onPause={generation.pause} copy={COMPLETE_COPY} />}
              </div>
            )}
            {done && (
              <div className="space-y-2 border border-border bg-shell p-4" data-cy="study-done">
                <MicroLabel>Resumen</MicroLabel>
                <p className="font-mono text-xl font-semibold">{summary.correct} de {total} aciertos</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {summary.hints} {summary.hints === 1 ? 'pista' : 'pistas'} · {summary.solutions} {summary.solutions === 1 ? 'solución vista' : 'soluciones vistas'}. Puedes volver a cualquier pregunta para releer la justificación o seguir preguntando al tutor.
                </p>
              </div>
            )}
            {question && (
              <>
                <nav aria-label="Preguntas" className="flex flex-wrap gap-2">
                  {questions.map(q => {
                    const state = q.selectedOption === null ? (q.solutionShown ? 'solution' : 'open') : q.selectedOption === q.correctOption ? 'correct' : 'wrong';
                    return (
                      <button key={q.position} type="button" data-cy={`study-nav-${q.position}`} data-state={state} aria-current={q.position === question.position ? 'step' : undefined}
                        aria-label={`Pregunta ${q.position}, ${state === 'correct' ? 'correcta' : state === 'wrong' ? 'incorrecta' : state === 'solution' ? 'solución vista' : 'sin resolver'}`}
                        onClick={() => { setCurrent(q.position); setActionError(''); }}
                        className={cn('flex size-11 items-center justify-center border font-mono text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                          q.position === question.position ? 'border-2 border-primary bg-primary/12'
                            : state === 'correct' ? 'border-annotation-green' : state === 'wrong' ? 'border-destructive' : state === 'solution' ? 'border-muted-foreground' : 'border-border')}>
                        {q.position}
                      </button>
                    );
                  })}
                </nav>
                <StudyQuestion key={question.position} question={question} total={total} choice={choices[question.position] ?? null}
                  onChoose={index => setChoices(map => ({ ...map, [question.position]: index }))}
                  busy={busy} onAct={kind => void act(kind, question.position)} error={actionError}
                  onReveal={() => setMobileTab('vista')} />
                <div className="flex justify-between gap-3">
                  <Button variant="outline" className="min-h-11 px-4" data-cy="study-prev" disabled={question.position <= 1} onClick={() => { setCurrent(question.position - 1); setActionError(''); }}>
                    <ArrowLeft aria-hidden="true" />Anterior
                  </Button>
                  <Button variant="outline" className="min-h-11 px-4" data-cy="study-next" disabled={question.position >= questions.length} onClick={() => { setCurrent(question.position + 1); setActionError(''); }}>
                    Siguiente<ArrowRight aria-hidden="true" />
                  </Button>
                </div>
                <StudyTutor key={`tutor-${question.position}`} quizId={id} position={question.position}
                  turns={conversations[question.position] ?? []}
                  onTurns={turns => setConversations(map => ({ ...map, [question.position]: turns }))}
                  remaining={remaining} onRemaining={setRemaining} />
              </>
            )}
          </div>
        </section>

        <div className={cn('flex min-w-0 flex-1', mobileTab === 'question' && 'max-lg:hidden')} data-cy="study-workspace">
          <AppSidebar examMode onTutorial={() => undefined} />
          <Workspace />
        </div>
      </div>
    </div>
  );
}

function StudyQuestion({ question, total, choice, onChoose, busy, onAct, error, onReveal }: {
  question: StudyQuestionDto;
  total: number;
  choice: number | null;
  onChoose: (index: number) => void;
  busy: 'hint' | 'check' | 'solution' | null;
  onAct: (kind: 'hint' | 'check' | 'solution') => void;
  error: string;
  onReveal: () => void;
}) {
  const isResolved = resolved(question);
  const answered = question.selectedOption !== null;
  const correct = answered && question.selectedOption === question.correctOption;
  return (
    <div className="space-y-4" data-cy="study-question" data-resolved={isResolved}>
      <MicroLabel>Pregunta {question.position} de {total} · {question.topicLabel}</MicroLabel>
      <ScenarioCard scenario={question.scenario} setup={question.setup} position={question.position} onReveal={onReveal} />
      <p id="study-statement" className="text-sm font-medium leading-relaxed break-words" data-cy="quiz-statement">{question.statement}</p>
      {isResolved ? (
        <div className="space-y-2" role="list" aria-label="Opciones" data-cy="study-options">
          {question.options.map((option, index) => (
            <div role="listitem" key={index}>
              <OptionOutcome text={option} mark={optionMark(index, question.selectedOption, question.correctOption)} data-cy={`study-option-${index}`} />
            </div>
          ))}
        </div>
      ) : (
        <div role="radiogroup" aria-labelledby="study-statement" className="space-y-2" data-cy="study-options">
          {question.options.map((option, index) => {
            const selected = choice === index;
            return (
              <label key={index} data-cy={`study-option-${index}`} data-selected={selected}
                className={cn('flex min-h-11 cursor-pointer gap-3 border p-3 text-[13px] leading-relaxed has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                  selected ? 'border-2 border-primary bg-primary/12' : 'border-border hover:bg-muted')}>
                <input type="radio" name={`study-question-${question.position}`} className="mt-1 size-4 shrink-0 accent-primary" checked={selected} onChange={() => onChoose(index)} />
                <span className="min-w-0 break-words">{option}</span>
              </label>
            );
          })}
        </div>
      )}
      {question.hintShown && question.hint && (
        <div className="space-y-1.5 border-l-2 border-annotation-yellow bg-annotation-yellow/8 p-3" data-cy="study-hint">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-annotation-yellow"><Lightbulb className="size-3.5" aria-hidden="true" />Pista</p>
          <p className="text-[13px] leading-relaxed break-words">{question.hint}</p>
        </div>
      )}
      {!isResolved && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11 px-3 text-[12px]" disabled={question.hintShown || busy !== null} onClick={() => onAct('hint')} data-cy="study-hint-button">
            <Lightbulb aria-hidden="true" />{question.hintShown ? 'Pista vista' : busy === 'hint' ? 'Abriendo…' : 'Ver pista'}
          </Button>
          <Button className="min-h-11 px-3 text-[12px]" disabled={choice === null || busy !== null} onClick={() => onAct('check')} data-cy="study-check">
            <Check aria-hidden="true" />{busy === 'check' ? 'Comprobando…' : 'Comprobar'}
          </Button>
          <Button variant="outline" className="min-h-11 px-3 text-[12px]" disabled={busy !== null} onClick={() => onAct('solution')} data-cy="study-solution">
            <Eye aria-hidden="true" />{busy === 'solution' ? 'Abriendo…' : 'Ver solución'}
          </Button>
        </div>
      )}
      {error && <Alert><span data-cy="study-action-error">{error}</span></Alert>}
      {isResolved && (
        <div data-cy="study-result" data-outcome={answered ? (correct ? 'correct' : 'wrong') : 'solution'}
          className={cn('space-y-1.5 border-l-2 p-3', answered ? (correct ? 'border-annotation-green bg-annotation-green/8' : 'border-destructive bg-destructive/8') : 'border-muted-foreground bg-muted')}>
          <p className={cn('flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]', answered && correct ? 'text-annotation-green' : 'text-foreground')}>
            {answered ? (correct ? <CircleCheck className="size-3.5" aria-hidden="true" /> : <CircleX className="size-3.5 text-destructive" aria-hidden="true" />) : <BookOpen className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            {answered ? (correct ? 'Correcto' : 'Incorrecto') : 'Solución vista'}
          </p>
          {question.explanation && <p className="text-[13px] leading-relaxed break-words" data-cy="study-explanation">{question.explanation}</p>}
        </div>
      )}
    </div>
  );
}
