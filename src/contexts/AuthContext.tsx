import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthUser, LoginResponse } from '@/types/auth';

const TOKEN_KEY = 'vista_token';
const USER_KEY = 'vista_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAdmin: boolean;
  login: (res: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadFromStorage(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return { user: null, token: null };
    return { user: JSON.parse(raw), token };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadFromStorage);

  const login = useCallback((res: LoginResponse) => {
    const user: AuthUser = {
      email: res.email,
      displayName: res.displayName,
      roles: res.roles,
    };
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ user, token: res.token });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null });
  }, []);

  const isAdmin = state.user?.roles.includes('ADMIN') ?? false;

  return (
    <AuthContext.Provider value={{ user: state.user, token: state.token, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
