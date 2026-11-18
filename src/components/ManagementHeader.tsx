import { Link } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { IcesiBrand } from './IcesiBrand';
import { useAuth } from '@/contexts/useAuth';

const linkClass = 'inline-flex min-h-11 items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Shared management shell follows the existing administration spacing and typography. */
export function ManagementHeader({ section }: { section: 'Admin' | 'Panel analítico' }) {
  const { user, logout, isAdmin } = useAuth();
  const admin = section === 'Admin';
  return <header className="sticky top-[2px] z-20 border-b border-border bg-shell/90 backdrop-blur-md">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex min-w-64 items-center gap-3" translate="no">
        <IcesiBrand collapsed />
        <div><span className="text-[13px] font-bold uppercase tracking-[0.25em]">VISTA</span>
          <span className="mx-2 text-[13px] text-muted-foreground">/</span><span className="text-[13px] text-primary-light">{section}</span></div>
      </div>
      <nav aria-label={admin ? 'Navegación de administración' : 'Navegación de analítica'} className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {admin ? <Link to="/analytics" data-cy="admin-analytics" className={`${linkClass} w-24`}>Analítica</Link>
          : isAdmin && <Link to="/admin" className={`${linkClass} w-24`}>Administración</Link>}
        <Link to="/" data-cy="link-to-canvas" className={linkClass}><ChevronLeft className="size-3.5" aria-hidden="true" />Volver al visualizador</Link>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center border border-primary/40 bg-primary/20 text-[10px] font-bold text-primary-light" aria-hidden="true">{user?.displayName?.[0]?.toUpperCase() ?? 'A'}</span>
          <span className="hidden max-w-40 truncate text-[12px] text-muted-foreground sm:block" title={user?.displayName}>{user?.displayName}</span>
        </div>
        <button type="button" data-cy="logout" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"
          className="flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring">
          <LogOut className="size-3.5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  </header>;
}
