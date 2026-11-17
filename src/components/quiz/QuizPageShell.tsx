import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Network } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { Button } from '@/components/ui/button';

const linkClass = 'inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Cabecera y contenedor de las pantallas de quizzes, con el mismo lenguaje que Analítica. */
export function QuizPageShell({ section, children, 'data-cy': dataCy }: { section: string; children: ReactNode; 'data-cy'?: string }) {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  return (
    <div className="h-full w-full overflow-y-auto bg-shell text-foreground scrollbar-custom" data-cy={dataCy}>
      <a href="#quiz-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-shell focus:p-3 focus:text-foreground focus:outline-2 focus:outline-ring">Saltar al contenido</a>
      <div className="h-[2px] bg-primary" />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground"><Network className="size-4" aria-hidden="true" /></div>
            <div><span className="text-[13px] font-bold uppercase tracking-[0.25em]">VISTA</span><span className="ml-3 text-xs text-muted-foreground">{section}</span></div>
          </div>
          <nav aria-label="Navegación de quizzes" className="flex flex-wrap items-center gap-x-4">
            {(isTeacher || isAdmin) && <Link to="/analytics" className={linkClass}>Analítica</Link>}
            {isAdmin && <Link to="/admin" className={linkClass}>Administración</Link>}
            <Link to="/" data-cy="link-to-canvas" className={linkClass}><ArrowLeft className="size-4" aria-hidden="true" />Ir al visualizador</Link>
            <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:inline" title={user?.displayName}>{user?.displayName}</span>
            <Button variant="ghost" onClick={logout} data-cy="logout" aria-label="Cerrar sesión" className="size-11"><LogOut aria-hidden="true" /></Button>
          </nav>
        </div>
      </header>
      <main id="quiz-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-none sm:px-6">{children}</main>
    </div>
  );
}

/** Micro-label en mayúsculas: el recurso de jerarquía de VISTA. */
export function MicroLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground ${className}`}>{children}</p>;
}

export const quizControlClass = 'min-h-11 w-full min-w-0 border border-muted-foreground/60 bg-shell px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 aria-invalid:border-destructive';
