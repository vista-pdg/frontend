import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { session } from '@/lib/session';
import { logout as logoutRequest } from '@/services/authService';
import type { AuthUser, Role } from '@/types/auth';

import { AuthContext, type AuthContextValue } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => session.user());

  // El interceptor puede limpiar la sesión sin pasar por React —token de refresco revocado, reuso
  // detectado—. Sin esta suscripción la UI seguiría pintando al usuario hasta la siguiente
  // navegación, dejándolo ante una pantalla que ya no puede usar.
  useEffect(() => session.subscribe(() => setUser(session.user())), []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const refreshFromStorage = useCallback(() => setUser(session.user()), []);

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? [];
    const hasRole = (role: Role) => roles.includes(role);
    return {
      user,
      roles,
      isAuthenticated: user !== null,
      isTeacher: hasRole('TEACHER'),
      isAdmin: hasRole('ADMIN'),
      hasRole,
      // CA-3: el docente entra directo al panel analítico; el resto, al lienzo.
      homeRoute: hasRole('TEACHER') ? '/analytics' : '/',
      refreshFromStorage,
      logout,
    };
  }, [user, logout, refreshFromStorage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
