import type { AuthResponse, AuthUser } from '@/types/auth';

const ACCESS_KEY = 'vista_access_token';
const REFRESH_KEY = 'vista_refresh_token';
const USER_KEY = 'vista_user';

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Único punto que conoce dónde vive la sesión.
 *
 * <p>El interceptor de axios necesita leer y rotar los tokens fuera de React, y el AuthContext
 * necesita enterarse cuando eso ocurre. Si cada uno hablara con localStorage por su cuenta, un
 * refresco silencioso o un cierre forzado por reuso dejaría a la UI mostrando una sesión que ya no
 * existe. Por eso el almacenamiento es este módulo y los cambios se notifican.
 */
export const session = {
  accessToken: (): string | null => read(ACCESS_KEY),
  refreshToken: (): string | null => read(REFRESH_KEY),

  user(): AuthUser | null {
    const raw = read(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  /** Guarda la sesión completa tras registro o login. */
  save(res: AuthResponse) {
    write(ACCESS_KEY, res.accessToken);
    write(REFRESH_KEY, res.refreshToken);
    write(
      USER_KEY,
      JSON.stringify({
        email: res.email,
        displayName: res.displayName,
        roles: res.roles,
      } satisfies AuthUser)
    );
    emit();
  },

  /** Actualiza sólo los tokens tras una rotación, sin tocar los datos del usuario. */
  saveTokens(accessToken: string, refreshToken: string) {
    write(ACCESS_KEY, accessToken);
    write(REFRESH_KEY, refreshToken);
    emit();
  },

  clear() {
    remove(ACCESS_KEY);
    remove(REFRESH_KEY);
    remove(USER_KEY);
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function emit() {
  listeners.forEach((l) => l());
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* modo privado o almacenamiento bloqueado: la sesión dura lo que la pestaña */
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* idem */
  }
}
