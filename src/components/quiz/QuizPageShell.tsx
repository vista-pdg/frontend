import type { ReactNode } from 'react';
import { ManagementHeader, type ManagementSection } from '@/components/ManagementHeader';

/** Contenedor de las pantallas de quizzes: la misma cabecera y escala que Administración y Analítica. */
export function QuizPageShell({ section, children, 'data-cy': dataCy }: { section: ManagementSection; children: ReactNode; 'data-cy'?: string }) {
  return (
    <div className="h-full w-full overflow-y-auto bg-shell text-foreground scrollbar-custom [scrollbar-gutter:stable]" data-cy={dataCy}>
      <a href="#quiz-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-shell focus:p-3 focus:text-foreground focus:outline-2 focus:outline-ring">Saltar al contenido</a>
      <div className="fixed top-0 left-0 right-0 z-30 h-[2px] bg-primary" />
      <ManagementHeader section={section} />
      <main id="quiz-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-none sm:px-6">{children}</main>
    </div>
  );
}

/** Micro-label en mayúsculas: el recurso de jerarquía de VISTA. */
export function MicroLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground ${className}`}>{children}</p>;
}

export const quizControlClass = 'min-h-11 w-full min-w-0 border border-muted-foreground/60 bg-shell px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 aria-invalid:border-destructive';
