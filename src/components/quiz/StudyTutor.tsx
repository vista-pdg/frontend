import { useRef, useState, type KeyboardEvent } from 'react';
import { Bot, SendHorizonal } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/utils';
import { askStudyTutor } from '@/services/studyQuizService';
import type { TutorTurn } from '@/types/quiz';

/** Turnos que viajan como contexto; el servidor admite hasta 12. */
const HISTORY = 12;
const MAX_MESSAGE = 800;

/**
 * Tutor IA de la pregunta en curso (HU-35 · CA-7). La conversación vive en la página, por pregunta;
 * cada mensaje gasta uno de la cuota diaria del asistente y, si falla, lo escrito vuelve al campo.
 */
export function StudyTutor({ quizId, position, turns, onTurns, remaining, onRemaining }: {
  quizId: number;
  position: number;
  turns: TutorTurn[];
  onTurns: (turns: TutorTurn[]) => void;
  remaining: number | null;
  onRemaining: (remaining: number) => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);

  async function send() {
    const text = message.trim();
    if (!text || sending || blocked) return;
    if (text.length > MAX_MESSAGE) return setError(`La pregunta admite hasta ${MAX_MESSAGE} caracteres.`);
    const history = turns.slice(-HISTORY);
    setSending(true);
    setError('');
    setMessage('');
    onTurns([...turns, { role: 'student', text }]);
    try {
      const reply = await askStudyTutor(quizId, position, text, history);
      onTurns([...turns, { role: 'student', text }, { role: 'tutor', text: reply.reply }]);
      onRemaining(reply.remaining);
    } catch (failure) {
      onTurns(turns);
      setMessage(text);
      if (failure instanceof ApiError && failure.code === 'DAILY_QUOTA_EXCEEDED') {
        setBlocked(true);
        onRemaining(0);
        setError('Alcanzaste tu límite diario. Se restablece a medianoche; la pista y la solución siguen disponibles.');
      } else if (failure instanceof ApiError && failure.code === 'RATE_LIMITED') {
        setError(`Demasiados mensajes seguidos. Intenta de nuevo en ${failure.retryAfterSeconds ?? 60} s.`);
      } else if (failure instanceof ApiError && (failure.status === 400 || failure.status === 422)) {
        setError(failure.fieldErrors.message ?? failure.message);
      } else {
        setError('El tutor no respondió. Tu mensaje sigue en el campo: intenta de nuevo.');
      }
    } finally {
      setSending(false);
      field.current?.focus();
    }
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <section aria-label={`Tutor IA de la pregunta ${position}`} data-cy="study-tutor" className="space-y-2.5 border border-border bg-shell p-3">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <Bot className="size-3.5 text-primary-light" aria-hidden="true" />Tutor IA · pregunta {position}
      </p>
      {turns.length === 0 && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">Pregunta lo que no entiendas de esta pregunta. El tutor orienta sin darte la respuesta mientras no la resuelvas.</p>
      )}
      <ol className="space-y-2" aria-live="polite" data-cy="study-tutor-log">
        {turns.map((turn, index) => (
          <li key={index} data-cy={`study-tutor-${turn.role}`}
            className={cn('p-2.5 text-[12px] leading-relaxed break-words whitespace-pre-line', turn.role === 'student' ? 'bg-primary/15' : 'bg-muted')}>
            <span className="sr-only">{turn.role === 'student' ? 'Tú: ' : 'Tutor: '}</span>{turn.text}
          </li>
        ))}
        {sending && (
          <li className="flex w-fit items-center gap-1 bg-muted p-2.5" data-cy="study-tutor-typing" aria-label="El tutor está escribiendo">
            {[0, 1, 2].map(i => <span key={i} className="size-1.5 rounded-full bg-primary motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </li>
        )}
      </ol>
      {error && <Alert><span data-cy="study-tutor-error">{error}</span></Alert>}
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label htmlFor={`tutor-${position}`} className="sr-only">Pregunta al tutor</label>
        <textarea id={`tutor-${position}`} ref={field} rows={2} value={message} maxLength={MAX_MESSAGE + 1}
          onChange={event => setMessage(event.target.value)} onKeyDown={onKey}
          disabled={sending || blocked} data-cy="study-tutor-input"
          placeholder={sending ? 'Esperando al tutor…' : 'Pregunta al tutor sobre esta pregunta…'}
          className="min-h-11 min-w-0 flex-1 resize-none border border-border bg-card/60 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50" />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={sending || blocked || !message.trim()} aria-label="Enviar al tutor" data-cy="study-tutor-send">
          <SendHorizonal className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground" data-cy="study-tutor-quota">
        Cada mensaje usa 1 de tu cuota diaria{remaining !== null ? ` · quedan ${remaining}` : ''}
      </p>
    </section>
  );
}
