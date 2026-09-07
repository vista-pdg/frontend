import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types/auth';

/**
 * Guards de navegación.
 *
 * <p>Deciden a qué pantalla corresponde llevar al usuario, no si tiene permiso: eso lo resuelve el
 * backend en cada petición a partir del token, sin fiarse de lo que haga el cliente. Un usuario que
 * manipule el almacenamiento local puede pintar el panel del docente, y no obtendrá ni un dato.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    // Se recuerda el destino para devolverlo ahí tras autenticarse, en vez de a la raíz.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

/** Restringe una ruta a un rol, redirigiendo a la que sí le corresponde en lugar de a un 403. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { hasRole, homeRoute } = useAuth();
  if (!hasRole(role)) return <Navigate to={homeRoute} replace />;
  return <>{children}</>;
}

/** Estar en el login ya autenticado no tiene sentido: cada quien a su destino. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, homeRoute } = useAuth();
  if (isAuthenticated) return <Navigate to={homeRoute} replace />;
  return <>{children}</>;
}
