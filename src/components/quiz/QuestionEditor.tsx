import { useState, type FormEvent } from 'react';
import { Check, Lock, TriangleAlert } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { QuizField } from '@/components/quiz/QuizField';
import { quizControlClass } from '@/components/quiz/QuizPageShell';
import { ApiError } from '@/lib/http';
import { fieldDescribedBy, longCorrectWarning, validateQuestionDraft, type QuestionDraft, type QuestionDraftErrors } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { updateBankQuestion } from '@/services/quizService';
import type { BankQuestionDto } from '@/types/quiz';

/**
 * HU-36 · CA-3: edición manual de una pregunta del banco. El escenario se muestra bloqueado: VISTA lo
 * validó y sus hechos sostienen la pregunta.
 */
export function QuestionEditor({ quizId, question, initial, source, number, onSaved, onCancel }: {
  quizId: number;
  question: BankQuestionDto;
  initial: QuestionDraft;
  /** {@code AI} cuando se aplica una propuesta de la IA sin cambios. */
  source: 'MANUAL' | 'AI';
  number: number;
  onSaved: (question: BankQuestionDto) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(initial);
  const [errors, setErrors] = useState<QuestionDraftErrors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);
  const id = `question-${question.id}`;

  function change(next: Partial<QuestionDraft>) {
    setDraft(current => ({ ...current, ...next }));
    setEdited(true);
    setErrors({});
    setServerError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateQuestionDraft(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`${id}-${first.replace('.', '-')}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      onSaved(await updateBankQuestion(quizId, question.id, {
        ...draft,
        source: source === 'AI' && !edited ? 'AI' : 'MANUAL',
      }));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors as QuestionDraftErrors);
        setServerError('Corrige los campos marcados para guardar.');
      } else {
        setServerError(error instanceof ApiError && error.status === 409 ? error.message : 'No se pudo guardar la pregunta. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  }

  const warning = longCorrectWarning(draft);
  return (
    <form onSubmit={submit} noValidate data-cy="question-editor" aria-label={`Editar la pregunta ${number}`} className="space-y-4">
      <p className="flex items-start gap-2 bg-card px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="break-words">Escenario: {question.scenario} Lo validó VISTA y no se edita.</span>
      </p>
      <QuizField id={`${id}-statement`} label="Enunciado" error={errors.statement} hint={`${draft.statement.trim().length} / 1200`}>
        <textarea id={`${id}-statement`} data-cy="question-statement" rows={3} className={`${quizControlClass} py-2.5 leading-relaxed`}
          value={draft.statement} onChange={e => change({ statement: e.target.value })}
          aria-invalid={!!errors.statement} aria-describedby={fieldDescribedBy(`${id}-statement`, errors.statement, 'x')} />
      </QuizField>
      <fieldset className="space-y-2">
        <legend className="mb-1 flex w-full flex-wrap justify-between gap-2 text-xs font-medium">
          <span>Opciones · marca la correcta</span>
          <span className="font-normal text-muted-foreground">Se barajan para cada estudiante</span>
        </legend>
        {draft.options.map((option, index) => {
          const error = errors[`options.${index}`];
          const optionId = `${id}-options-${index}`;
          return (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <input type="radio" name={`${id}-correct`} data-cy={`question-correct-${index}`} className="size-4 shrink-0 accent-secondary"
                  checked={draft.correctIndex === index} onChange={() => change({ correctIndex: index })}
                  aria-label={`Marcar la opción ${index + 1} como correcta`} />
                <label htmlFor={optionId} className="sr-only">Opción {index + 1}</label>
                <input id={optionId} data-cy={`question-option-${index}`} type="text" autoComplete="off" className={quizControlClass}
                  value={option} onChange={e => change({ options: draft.options.map((o, i) => i === index ? e.target.value : o) })}
                  aria-invalid={!!error} aria-describedby={error ? `${optionId}-error` : undefined} />
                {draft.correctIndex === index && <span className="shrink-0 text-[11px] font-semibold"><Check className="mr-1 inline size-3.5 text-annotation-green" aria-hidden="true" />Correcta</span>}
              </div>
              {error && <p id={`${optionId}-error`} role="alert" data-cy={`question-option-${index}-error`} className="pl-7 text-xs text-foreground">{error}</p>}
            </div>
          );
        })}
      </fieldset>
      <QuizField id={`${id}-explanation`} label="Justificación" error={errors.explanation} hint="Explica la correcta y el error de cada distractor, sin citar letras: las opciones se barajan.">
        <textarea id={`${id}-explanation`} data-cy="question-explanation" rows={3} className={`${quizControlClass} py-2.5 leading-relaxed`}
          value={draft.explanation} onChange={e => change({ explanation: e.target.value })}
          aria-invalid={!!errors.explanation} aria-describedby={fieldDescribedBy(`${id}-explanation`, errors.explanation, 'x')} />
      </QuizField>
      <QuizField id={`${id}-hint`} label="Pista" error={errors.hint} hint={`${draft.hint.trim().length} / 200 · Se muestra en la revisión y en los quizzes de estudio.`}>
        <input id={`${id}-hint`} data-cy="question-hint" type="text" autoComplete="off" className={quizControlClass}
          value={draft.hint} onChange={e => change({ hint: e.target.value })}
          aria-invalid={!!errors.hint} aria-describedby={fieldDescribedBy(`${id}-hint`, errors.hint, 'x')} />
      </QuizField>
      {warning && (
        <p className="flex items-start gap-2 border-l-2 border-annotation-orange bg-orange-main/10 p-3 text-[13px]" data-cy="question-long-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-annotation-orange" aria-hidden="true" />
          La opción correcta es mucho más larga que las demás y puede delatar la respuesta. Puedes guardar igual.
        </p>
      )}
      {serverError && <Alert><span data-cy="question-editor-error">{serverError}</span></Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-11 px-4" data-cy="question-save" disabled={saving}>
          <Check aria-hidden="true" />{saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" className={cn('min-h-11 px-4')} data-cy="question-cancel" disabled={saving} onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
