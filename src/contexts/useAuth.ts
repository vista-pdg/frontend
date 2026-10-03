import { createContext, useContext } from 'react';
import type { AuthUser, Role } from '@/types/auth';

export interface AuthContextValue {
  user: AuthUser | null;
  roles: Role[];
  isAuthenticated: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  hasRole: (role: Role) => boolean;
  /** Ruta a la que corresponde entrar según el rol. */
  homeRoute: string;
  refreshFromStorage: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
