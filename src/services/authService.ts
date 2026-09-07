import http from '@/lib/http';
import { session } from '@/lib/session';
import type { AuthResponse, RegisterPayload } from '@/types/auth';

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/register', payload);
  session.save(data);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/login', { email, password });
  session.save(data);
  return data;
}

/**
 * Cierra la sesión en el servidor y localmente.
 *
 * <p>La sesión local se limpia pase lo que pase: si la llamada falla por red, el usuario igual
 * espera haber salido, y el token de refresco caduca solo. Dejarlo en el navegador porque el
 * servidor no respondió sería lo contrario de lo que pidió.
 */
export async function logout(): Promise<void> {
  const refreshToken = session.refreshToken();
  try {
    if (refreshToken) await http.post('/auth/logout', { refreshToken });
  } catch {
    /* sin reintento: el objetivo es local */
  } finally {
    session.clear();
  }
}
