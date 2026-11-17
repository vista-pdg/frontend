import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, X } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { fetchMyQuizzes } from '@/services/quizService';
import type { StudentQuizDto } from '@/types/quiz';

/**
 * Aviso de quiz pendiente en el visualizador (HU-34 · CA-3). Solo consulta para estudiantes y no
 * ocupa espacio cuando no hay nada que presentar; si la consulta falla, calla: el visualizador no
 * depende de los quizzes.
 */
export function QuizNotice() {
  const { hasRole } = useAuth();
  const isStudent = hasRole('STUDENT');
  const [pending, setPending] = useState<StudentQuizDto[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isStudent) return;
    const controller = new AbortController();
    fetchMyQuizzes(controller.signal)
      .then(({ quizzes }) => {
        if (!controller.signal.aborted) setPending(quizzes.filter(q => q.state === 'OPEN' || q.state === 'IN_PROGRESS'));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isStudent]);

  if (!isStudent || dismissed || pending.length === 0) return null;
  const [first] = pending;
  const inProgress = pending.some(q => q.state === 'IN_PROGRESS');
  return (
    <div role="status" data-cy="quiz-notice" className="flex shrink-0 items-center gap-3 border-b border-border bg-primary/15 px-4 py-2 text-[13px] text-foreground">
      <ClipboardList className="size-4 shrink-0 text-primary-light" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate">
        {pending.length === 1
          ? <>{inProgress ? 'Tienes un quiz en curso: ' : 'Tienes un quiz disponible: '}<span className="font-semibold">{first.title}</span></>
          : `Tienes ${pending.length} quizzes por presentar`}
      </p>
      <Link to="/quizzes" data-cy="quiz-notice-link" className="inline-flex min-h-11 shrink-0 items-center px-2 text-[13px] font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Ir a mis quizzes
      </Link>
      <button type="button" onClick={() => setDismissed(true)} data-cy="quiz-notice-dismiss" aria-label="Ocultar aviso"
        className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
