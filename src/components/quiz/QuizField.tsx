import type { ReactNode } from 'react';

/** Campo de formulario de quizzes: etiqueta, control, ayuda y error junto al control. */
export function QuizField({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-xs font-medium">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" data-cy={`${id}-error`} className="mt-2 text-xs text-foreground">{error}</p>}
    </div>
  );
}
