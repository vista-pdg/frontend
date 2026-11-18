import { useState } from 'react';
import { Check, Lock, Minus, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AiQuestionEditor } from '@/components/quiz/AiQuestionEditor';
import { QuestionEditor } from '@/components/quiz/QuestionEditor';
import { QuizBadge } from '@/components/quiz/QuizBadge';
import { MicroLabel } from '@/components/quiz/QuizPageShell';
import { ApiError } from '@/lib/http';
import { editKindLabel, questionDraft, type QuestionDraft } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { updateBankQuestion } from '@/services/quizService';
import type { BankQuestionDto } from '@/types/quiz';

type Mode = { kind: 'view' } | { kind: 'edit'; initial: QuestionDraft; source: 'MANUAL' | 'AI' } | { kind: 'ai' };

/** HU-34 y HU-36: una pregunta del banco, con edición manual o con IA cuando todavía es editable. */
export function BankQuestionCard({ quizId, question, number, canDelete, busy, onDelete, onSaved }: {
  quizId: number;
  question: BankQuestionDto;
  number: number;
  /** Solo en borrador: un quiz publicado necesita su banco completo. */
  canDelete: boolean;
  busy: boolean;
  onDelete: (trigger: HTMLElement) => void;
  onSaved: (question: BankQuestionDto) => void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  function saved(updated: BankQuestionDto) {
    setMode({ kind: 'view' });
    onSaved(updated);
  }
  async function apply(draft: QuestionDraft) {
    setApplying(true);
    setApplyError('');
    try {
      saved(await updateBankQuestion(quizId, question.id, { ...draft, source: 'AI' }));
    } catch (error) {
      // Una propuesta que el servidor rechaza se abre en el editor para corregirla a mano.
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setMode({ kind: 'edit', initial: draft, source: 'AI' });
      } else {
        setApplyError(error instanceof ApiError && error.status === 409 ? error.message : 'No se pudo aplicar la propuesta. Intenta de nuevo.');
      }
    } finally {
      setApplying(false);
    }
  }

  const label = `#${number} · ${question.topicLabel}${question.timesAssigned > 0 ? ` · asignada ${question.timesAssigned} ${question.timesAssigned === 1 ? 'vez' : 'veces'}` : ''}${mode.kind === 'edit' ? ' · editando' : ''}`;
  const locked = !question.editable;
  return (
    <li data-cy="bank-question" data-question-id={question.id} data-mode={mode.kind}
      className={cn('space-y-2.5 border p-4', mode.kind === 'edit' ? 'border-primary' : 'border-border')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MicroLabel>{label}</MicroLabel>
        <div className="flex flex-wrap items-center gap-2">
          {question.editKind && <QuizBadge label={editKindLabel[question.editKind]} tone="primary" data-cy="bank-question-edited" />}
          {mode.kind === 'view' ? (
            <>
              <Button variant="outline" className="min-h-11 px-3 text-xs" data-cy="bank-question-edit" disabled={busy || locked}
                aria-describedby={locked ? `locked-${question.id}` : undefined}
                onClick={() => setMode({ kind: 'edit', initial: questionDraft(question), source: 'MANUAL' })}>
                <Pencil aria-hidden="true" />Editar<span className="sr-only"> la pregunta {number}</span>
              </Button>
              <Button variant="outline" className="min-h-11 px-3 text-xs" data-cy="bank-question-ai" disabled={busy || locked}
                aria-describedby={locked ? `locked-${question.id}` : undefined} onClick={() => setMode({ kind: 'ai' })}>
                <Sparkles aria-hidden="true" />Editar con IA<span className="sr-only"> la pregunta {number}</span>
              </Button>
              {canDelete && (
                <Button variant="destructive" className="min-h-11 border-destructive px-3 text-xs text-foreground" data-cy="bank-question-delete" disabled={busy}
                  aria-label={`Eliminar la pregunta ${number}`} onClick={event => onDelete(event.currentTarget)}>
                  <Trash2 aria-hidden="true" />Eliminar
                </Button>
              )}
            </>
          ) : mode.kind === 'ai' && (
            <Button variant="ghost" className="min-h-11 px-3 text-xs" data-cy="ai-close" onClick={() => setMode({ kind: 'view' })}>
              <X aria-hidden="true" />Cerrar
            </Button>
          )}
        </div>
      </div>
      {locked && (
        <p id={`locked-${question.id}`} className="flex items-start gap-2 text-xs text-muted-foreground" data-cy="bank-question-locked">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Ya se asignó a intentos: editarla cambiaría lo que esos estudiantes respondieron y su nota.
        </p>
      )}
      {mode.kind === 'edit' ? (
        <QuestionEditor quizId={quizId} question={question} initial={mode.initial} source={mode.source} number={number}
          onSaved={saved} onCancel={() => setMode({ kind: 'view' })} />
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground break-words">Escenario: {question.scenario}</p>
          <p className="text-sm font-medium leading-relaxed break-words" data-cy="bank-question-statement">{question.statement}</p>
          <ul className="space-y-1">
            {question.options.map((option, optionIndex) => {
              const correct = optionIndex === question.correctIndex;
              return (
                <li key={optionIndex} data-correct={correct}
                  className={cn('flex gap-2 border-l-2 px-2.5 py-1.5 text-[13px] leading-relaxed', correct ? 'border-annotation-green' : 'border-transparent')}>
                  {correct ? <Check className="mt-0.5 size-3.5 shrink-0 text-annotation-green" aria-hidden="true" /> : <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <span className="min-w-0 break-words">{option}{correct && <span className="sr-only"> (respuesta correcta)</span>}</span>
                </li>
              );
            })}
          </ul>
          {question.explanation && <p className="text-xs leading-relaxed text-muted-foreground break-words">Justificación: {question.explanation}</p>}
          {question.hint && <p className="text-xs leading-relaxed text-muted-foreground break-words" data-cy="bank-question-hint">Pista: {question.hint}</p>}
          {mode.kind === 'ai' && (
            <AiQuestionEditor quizId={quizId} question={question} onApply={draft => void apply(draft)}
              onAdjust={draft => setMode({ kind: 'edit', initial: draft, source: 'AI' })} />
          )}
          {applying && <p role="status" className="text-sm text-muted-foreground">Guardando la propuesta…</p>}
          {applyError && <Alert><span data-cy="ai-apply-error">{applyError}</span></Alert>}
        </>
      )}
    </li>
  );
}
