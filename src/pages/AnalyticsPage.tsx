import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Construction, LogOut, Network } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Panel analítico del docente — shell.
 *
 * <p>CA-3 de la HU-08 pide la <em>redirección</em> a este panel para el rol docente, no su
 * contenido. Lo que esta pantalla demuestra es el control de acceso: sólo TEACHER llega aquí. Las
 * métricas reales son una HU posterior, y hasta entonces la pantalla lo dice explícitamente en vez
 * de fingir datos.
 */
export function AnalyticsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black-main" data-cy="analytics-page">
      <div className="h-[2px] shrink-0 bg-primary" />

      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary flex items-center justify-center shrink-0">
            <Network className="size-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold uppercase leading-none tracking-[0.25em] text-white">
              VISTA
            </span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Panel del docente
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] font-semibold text-white">{user.displayName}</span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Docente
              </span>
            </div>
          )}
          <Link
            to="/"
            data-cy="link-to-canvas"
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Ir al visualizador
          </Link>
          <button
            onClick={logout}
            data-cy="logout"
            aria-label="Cerrar sesión"
            className="p-1.5 text-muted-foreground transition-colors duration-150 hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto scrollbar-custom p-8">
        <div className="flex max-w-[520px] flex-col items-center gap-6 text-center">
          <div className="flex size-14 items-center justify-center border border-border bg-card">
            <BarChart3 className="size-6 text-primary" />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] font-bold leading-tight text-white">Panel analítico</h1>
            <p className="text-[14px] leading-[1.65] text-muted-foreground">
              Llegaste aquí porque tu cuenta tiene rol <span className="text-white">Docente</span>.
              Esta sección queda reservada para el seguimiento del curso.
            </p>
          </div>

          <div className="flex items-start gap-2.5 border border-yellow-main/30 bg-yellow-main/[0.08] p-3.5 text-left">
            <Construction className="mt-px size-4 shrink-0 text-yellow-main" />
            <p className="text-[12px] leading-[1.55] text-muted-foreground">
              El contenido analítico —estructuras generadas por grupo, temas más consultados,
              progreso por estudiante— se construye en una historia posterior. La HU-08 entrega el
              acceso restringido por rol.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
