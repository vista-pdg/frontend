import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Play } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { QuizPageShell } from '@/components/quiz/QuizPageShell';
import { StudyQuizSection } from '@/components/quiz/StudyQuizSection';
import { useAuth } from '@/contexts/useAuth';
import { fetchMyQuizzes } from '@/services/quizService';
import { formatDateTime, formatGrade, studentStateLabel } from '@/lib/quiz';
import type { StudentQuizDto, StudentQuizListDto } from '@/types/quiz';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: StudentQuizListDto };

const outlineActionClass = 'inline-flex min-h-11 items-center justify-center gap-2 border border-border px-4 text-[13px] font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:w-full';

function windowLine(quiz: StudentQuizDto): string {
  if (quiz.state === 'FINISHED') return `Entregado ${formatDateTime(quiz.result?.finishedAt)}`;
  if (quiz.state === 'IN_PROGRESS') return `En curso · vence ${formatDateTime(quiz.deadline)}`;
  if (quiz.state === 'MISSED') return `Cerró ${formatDateTime(quiz.closesAt)}`;
  return `Abre ${formatDateTime(quiz.opensAt)} · Cierra ${formatDateTime(quiz.closesAt)}`;
}

function QuizAction({ quiz }: { quiz: StudentQuizDto }) {
  if (quiz.state === 'OPEN' || quiz.state === 'IN_PROGRESS') {
    return (
      <Link to={`/quizzes/${quiz.id}/presentar`} data-cy={`quiz-open-${quiz.id}`} className={actionClass}>
        <Play className="size-4" aria-hidden="true" />{quiz.state === 'OPEN' ? 'Iniciar quiz' : 'Continuar'}
      </Link>
    );
  }
  if (quiz.state === 'UPCOMING') {
    return <Button variant="outline" disabled className="min-h-11 px-4 max-sm:w-full" data-cy={`quiz-upcoming-${quiz.id}`}>Aún no abre</Button>;
  }
  if (quiz.state === 'MISSED') return <p className="text-xs text-muted-foreground">Cerrado</p>;
  const result = quiz.result;
  if (!result?.gradeVisible) {
    return <p className="text-[13px] text-muted-foreground" data-cy={`quiz-grade-hidden-${quiz.id}`}>El docente aún no publica la nota; la revisión se habilita cuando lo haga.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
      <p className="text-[13px]" data-cy={`quiz-grade-${quiz.id}`}>Nota <span className="font-mono font-semibold">{formatGrade(result.grade)} / 5,0</span> · {result.score} de {result.total} aciertos</p>
      {quiz.reviewAvailable
        ? (
          <Link to={`/quizzes/${quiz.id}/revision`} data-cy={`quiz-review-${quiz.id}`} className={`${outlineActionClass} max-sm:w-full`}>
            <ListChecks className="size-4" aria-hidden="true" />Revisar
          </Link>
        )
        : <p className="text-xs text-muted-foreground" data-cy={`quiz-review-pending-${quiz.id}`}>Revisión desde el cierre · {formatDateTime(quiz.closesAt)}</p>}
    </div>
  );
}

/** HU-34 · Lista de quizzes del curso del estudiante; HU-35 · revisión y quizzes de estudio. */
export function QuizListPage() {
  const { roles } = useAuth();
  const isStudent = roles.includes('STUDENT');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchMyQuizzes(controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ status: 'ready', data }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }); });
    return () => controller.abort();
  }, [attempt]);

  const data = state.status === 'ready' ? state.data : null;
  return (
    <QuizPageShell section="Quizzes" data-cy="quiz-list-page">
      <h1 className="text-[20px] font-bold tracking-tight">Quizzes de tu curso</h1>
      <p className="mt-1 text-[13px] text-muted-foreground" data-cy="quiz-list-course">
        {data?.courseCode
          ? `${data.courseCode} · ${data.courseName}. Resuelve cada quiz dentro de su ventana usando VISTA.`
          : 'Resuelve cada quiz dentro de su ventana usando VISTA.'}
      </p>

      {state.status === 'loading' && <p role="status" className="mt-6 text-sm" data-cy="quiz-list-loading">Cargando tus quizzes…</p>}
      {state.status === 'error' && (
        <div className="mt-6">
          <Alert><span data-cy="quiz-list-error">No se pudieron cargar los quizzes. Intenta de nuevo.</span></Alert>
          <Button variant="outline" className="mt-3 min-h-11 px-4" data-cy="quiz-list-retry" onClick={() => { setState({ status: 'loading' }); setAttempt(n => n + 1); }}>Reintentar</Button>
        </div>
      )}
      {data && !data.courseCode && (
        <p className="mt-6 border border-border p-6 text-sm" data-cy="quiz-list-no-course">
          Tu cuenta no está vinculada a un curso. Pide a tu docente o al administrador que te matricule.
        </p>
      )}
      {data?.courseCode && data.quizzes.length === 0 && (
        <p className="mt-6 border border-border p-6 text-sm" data-cy="quiz-list-empty">
          Tu curso aún no tiene quizzes asignados. Cuando tu docente publique uno aparecerá aquí.
        </p>
      )}
      {data && data.quizzes.length > 0 && (
        <ul className="mt-6 border border-border" data-cy="quiz-list" aria-label="Quizzes del curso">
          {data.quizzes.map(quiz => {
            const state = studentStateLabel[quiz.state];
            return (
              <li key={quiz.id} data-cy={`quiz-row-${quiz.id}`} data-state={quiz.state}
                className="flex flex-col gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <QuizBadge label={state.label} tone={state.tone} className="sm:hidden" />
                  <h2 className="text-[15px] font-semibold break-words">{quiz.title}</h2>
                  <p className="text-xs text-muted-foreground">{quiz.questionCount} preguntas · {quiz.timeLimitMinutes} min</p>
                  <p className="text-[11px] text-muted-foreground break-words">{quiz.topics.join(' · ')}</p>
                  <p className="font-mono text-xs text-muted-foreground">{windowLine(quiz)}</p>
                </div>
                <QuizBadge label={state.label} tone={state.tone} className="max-sm:hidden" data-cy={`quiz-state-${quiz.id}`} />
                <div className="flex sm:w-64 sm:justify-end"><QuizAction quiz={quiz} /></div>
              </li>
            );
          })}
        </ul>
      )}
      {isStudent && <StudyQuizSection />}
    </QuizPageShell>
  );
}
