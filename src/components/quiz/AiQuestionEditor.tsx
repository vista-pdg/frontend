import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Minus, Pencil, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { QuizField } from '@/components/quiz/QuizField';
import { MicroLabel, quizControlClass } from '@/components/quiz/QuizPageShell';
import { ApiError } from '@/lib/http';
import { MAX_AI_INSTRUCTION, fieldDescribedBy, type QuestionDraft } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { proposeQuestionEdit } from '@/services/quizService';
import type { AiProposalDto, BankQuestionDto } from '@/types/quiz';

function failure(error: unknown): string {
  if (error instanceof ApiError && (error.status === 422 || error.status === 409 || error.status === 503)) return error.message;
  return 'No se pudo pedir la propuesta. Revisa tu conexión e intenta de nuevo.';
}

/**
 * HU-36 · CA-4: el docente dice qué cambiar y la IA propone otra versión sobre el mismo escenario.
 * Nada se guarda hasta aplicar la propuesta; «Ajustar a mano» la lleva al editor manual.
 */
export function AiQuestionEditor({ quizId, question, onApply, onAdjust }: {
  quizId: number;
  question: BankQuestionDto;
  onApply: (draft: QuestionDraft) => void;
  onAdjust: (draft: QuestionDraft) => void;
}) {
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<AiProposalDto | null>(null);
  const request = useRef<AbortController | null>(null);
  const proposalRef = useRef<HTMLDivElement>(null);
  const id = `ai-${question.id}`;
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (proposal) proposalRef.current?.focus(); }, [proposal]);

  async function propose() {
    const text = instruction.trim();
    if (!text) return setError('Escribe qué quieres cambiar.');
    if (text.length > MAX_AI_INSTRUCTION) return setError(`Las instrucciones admiten hasta ${MAX_AI_INSTRUCTION} caracteres.`);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    setRequestError('');
    setProposal(null);
    try {
      const result = await proposeQuestionEdit(quizId, question.id, text, controller.signal);
      if (!controller.signal.aborted) setProposal(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.fieldErrors.instruction) setError(err.fieldErrors.instruction);
      else setRequestError(failure(err));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const draft: QuestionDraft | null = proposal && {
    statement: proposal.statement,
    options: proposal.options,
    correctIndex: proposal.correctIndex,
    explanation: proposal.explanation ?? '',
    hint: proposal.hint ?? '',
  };
  return (
    <div className="space-y-3" data-cy="ai-editor">
      <div className="space-y-3 border border-border bg-card p-3">
        <QuizField id={`${id}-instruction`} label="¿Qué quieres cambiar?" error={error}
          hint={`${instruction.trim().length} / ${MAX_AI_INSTRUCTION} · La IA conserva el escenario y sus hechos. Nada se guarda hasta que apliques la propuesta.`}>
          <textarea id={`${id}-instruction`} data-cy="ai-instruction" rows={2} className={`${quizControlClass} py-2.5 leading-relaxed`} value={instruction}
            placeholder="Ejemplo: haz los distractores más sutiles y pregunta por el costo de la operación."
            onChange={e => { setInstruction(e.target.value); setError(''); setRequestError(''); }} disabled={busy}
            aria-invalid={!!error} aria-describedby={fieldDescribedBy(`${id}-instruction`, error, 'x')} />
        </QuizField>
        <Button className="min-h-11 px-4" data-cy="ai-propose" disabled={busy} onClick={() => void propose()}>
          {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {busy ? 'Proponiendo…' : proposal ? 'Proponer otra versión' : 'Proponer cambios'}
        </Button>
        <p role="status" className="sr-only">{busy ? 'La IA está preparando una propuesta.' : proposal ? 'Propuesta lista para revisar.' : ''}</p>
      </div>
      {requestError && <Alert><span data-cy="ai-error">{requestError}</span></Alert>}
      {draft && (
        <div ref={proposalRef} tabIndex={-1} data-cy="ai-proposal" aria-label="Propuesta de la IA sin guardar"
          className="space-y-2.5 border-l-2 border-primary-light bg-primary/8 p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <p className="flex items-center gap-2"><Sparkles className="size-3.5 text-primary-light" aria-hidden="true" /><MicroLabel className="text-foreground">Propuesta de la IA · sin guardar</MicroLabel></p>
          <p className="text-sm font-medium leading-relaxed break-words" data-cy="ai-proposal-statement">{draft.statement}</p>
          <ul className="space-y-1">
            {draft.options.map((option, index) => {
              const correct = index === draft.correctIndex;
              return (
                <li key={index} className={cn('flex gap-2 border-l-2 px-2.5 py-1.5 text-[13px] leading-relaxed', correct ? 'border-annotation-green' : 'border-transparent')}>
                  {correct ? <Check className="mt-0.5 size-3.5 shrink-0 text-annotation-green" aria-hidden="true" /> : <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <span className="min-w-0 break-words">{option}{correct && <span className="sr-only"> (respuesta correcta)</span>}</span>
                </li>
              );
            })}
          </ul>
          {draft.explanation && <p className="text-xs leading-relaxed text-muted-foreground break-words">Justificación: {draft.explanation}</p>}
          {draft.hint && <p className="text-xs leading-relaxed text-muted-foreground break-words">Pista: {draft.hint}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button className="min-h-11 px-4" data-cy="ai-apply" onClick={() => onApply(draft)}><Check aria-hidden="true" />Aplicar propuesta</Button>
            <Button variant="outline" className="min-h-11 px-4" data-cy="ai-adjust" onClick={() => onAdjust(draft)}><Pencil aria-hidden="true" />Ajustar a mano</Button>
            <Button variant="ghost" className="min-h-11 px-4" data-cy="ai-discard" onClick={() => setProposal(null)}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
