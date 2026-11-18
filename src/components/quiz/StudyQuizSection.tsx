import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { formatDateTime, studyProgressLine, studyState, studyStateLabel } from '@/lib/quiz';
import { deleteStudyQuiz, fetchStudyQuizzes } from '@/services/studyQuizService';
import { QuizBadge } from './QuizBadge';
import type { StudyQuizSummaryDto } from '@/types/quiz';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; quizzes: StudyQuizSummaryDto[] };

const primaryAction = 'inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const outlineAction = 'inline-flex min-h-11 items-center justify-center gap-2 border border-border px-4 text-[13px] font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** HU-35 · Quizzes de estudio del estudiante: solo los suyos, con su avance y su ayuda usada. */
export function StudyQuizSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState<StudyQuizSummaryDto | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudyQuizzes(controller.signal)
      .then(quizzes => { if (!controller.signal.aborted) setState({ status: 'ready', quizzes }); })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }); });
    return () => controller.abort();
  }, [reload]);

  async function confirmDelete() {
    if (!pending) return;
    await deleteStudyQuiz(pending.id);
    setState(current => current.status === 'ready' ? { status: 'ready', quizzes: current.quizzes.filter(q => q.id !== pending.id) } : current);
  }

  return (
    <section aria-labelledby="study-title" className="mt-10" data-cy="study-section">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 id="study-title" className="text-base font-bold">Quizzes de estudio</h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Solo tú los ves. Elige temas y practica con pistas, solución y el tutor IA. Cada lote de preguntas usa un mensaje de tu cuota diaria del asistente.
          </p>
        </div>
        <Link to="/quizzes/estudio/nuevo" data-cy="study-new" className={`${primaryAction} max-sm:w-full`}>
          <Plus className="size-4" aria-hidden="true" />Nuevo quiz de estudio
        </Link>
      </div>

      {state.status === 'loading' && <p role="status" className="mt-4 text-sm" data-cy="study-loading">Cargando tus quizzes de estudio…</p>}
      {state.status === 'error' && (
        <div className="mt-4">
          <Alert><span data-cy="study-error">No se pudieron cargar tus quizzes de estudio.</span></Alert>
          <Button variant="outline" className="mt-3 min-h-11 px-4" onClick={() => { setState({ status: 'loading' }); setReload(n => n + 1); }}>Reintentar</Button>
        </div>
      )}
      {state.status === 'ready' && state.quizzes.length === 0 && (
        <p className="mt-4 border border-border p-6 text-sm" data-cy="study-empty">
          Aún no tienes quizzes de estudio. Crea uno con los temas que quieras practicar.
        </p>
      )}
      {state.status === 'ready' && state.quizzes.length > 0 && (
        <ul className="mt-4 border border-border" aria-label="Quizzes de estudio" data-cy="study-list">
          {state.quizzes.map(quiz => {
            const kind = studyState(quiz);
            const badge = studyStateLabel[kind];
            const label = kind === 'INCOMPLETE' ? 'Completar' : kind === 'COMPLETE' ? 'Abrir' : 'Continuar';
            const Icon = kind === 'INCOMPLETE' ? Sparkles : kind === 'COMPLETE' ? BookOpen : Play;
            return (
              <li key={quiz.id} data-cy={`study-row-${quiz.id}`} data-state={kind}
                className="flex flex-col gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <QuizBadge label={badge.label} tone={badge.tone} className="sm:hidden" />
                  <h3 className="text-[15px] font-semibold break-words">{quiz.title}</h3>
                  <p className="text-xs text-muted-foreground">{quiz.questionCount} preguntas · creado {formatDateTime(quiz.createdAt)}</p>
                  <p className="font-mono text-xs text-muted-foreground" data-cy={`study-progress-${quiz.id}`}>{studyProgressLine(quiz)}</p>
                </div>
                <QuizBadge label={badge.label} tone={badge.tone} className="max-sm:hidden" data-cy={`study-state-${quiz.id}`} />
                <div className="flex gap-2 sm:w-64 sm:justify-end">
                  <Link to={`/quizzes/estudio/${quiz.id}`} data-cy={`study-open-${quiz.id}`} className={`${kind === 'IN_PROGRESS' ? primaryAction : outlineAction} max-sm:flex-1`}>
                    <Icon className="size-4" aria-hidden="true" />{label}
                  </Link>
                  <Button variant="outline" className="size-11 shrink-0 p-0" aria-label={`Eliminar ${quiz.title}`} data-cy={`study-delete-${quiz.id}`}
                    onClick={event => { trigger.current = event.currentTarget; setPending(quiz); }}>
                    <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmationDialog
        open={pending !== null}
        title="Eliminar quiz de estudio"
        description="Se eliminarán sus preguntas y tus respuestas. Esta acción no se puede deshacer."
        target={pending ? { name: pending.title, detail: `${pending.questionCount} preguntas` } : null}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onClose={() => setPending(null)}
        restoreFocus={() => trigger.current}
      />
    </section>
  );
}
