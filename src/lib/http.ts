import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { session } from '@/lib/session';
import type { ApiErrorBody, AuthResponse } from '@/types/auth';

/** Error de API que conserva el código y los errores por campo que envía el backend. */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly fieldErrors: Record<string, string>;
  /** Segundos de `Retry-After` en un 429 de límite de tasa; la UI los usa para la cuenta regresiva. */
  readonly retryAfterSeconds?: number;
  /** Instante ISO de `X-Quota-Reset` cuando el servidor lo envía (cuota agotada). */
  readonly quotaResetsAt?: string;

  constructor(
    message: string,
    code: string,
    fieldErrors: Record<string, string>,
    status?: number,
    extras: { retryAfterSeconds?: number; quotaResetsAt?: string } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = extras.retryAfterSeconds;
    this.quotaResetsAt = extras.quotaResetsAt;
  }
}

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // Generoso a propósito: /generate encadena hasta tres intentos contra Gemini con espera entre
  // ellos, y con 30 s el cliente cortaba mientras el backend seguía trabajando.
  timeout: 60_000,
});

/** Cliente sin interceptores: refrescar con `http` provocaría recursión al fallar. */
const bare = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Modo de visualización activo (HU-18 · CA-7). Lo fija la composición de la aplicación; el cliente
 * HTTP no importa el motor para no crear un ciclo. Sin fuente registrada no se envía cabecera.
 */
let visualizationModeSource: () => string | null = () => null;

export function setVisualizationModeSource(source: () => string | null): void {
  visualizationModeSource = source;
}

export const VISUALIZATION_MODE_HEADER = 'X-Visualization-Mode';

http.interceptors.request.use((config) => {
  const token = session.accessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const mode = visualizationModeSource();
  if (mode) config.headers[VISUALIZATION_MODE_HEADER] = mode;
  return config;
});

/**
 * Refresco de un solo vuelo.
 *
 * <p>El backend rota el token de refresco y revoca la familia entera si detecta que uno ya usado
 * vuelve a presentarse. Si dos peticiones caducadas dispararan dos refrescos en paralelo, la segunda
 * llegaría con un token que la primera acaba de consumir: el backend lo leería como un reuso y
 * cerraría la sesión del usuario legítimo. Por eso todas las peticiones comparten la misma promesa.
 */
let inFlightRefresh: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      const refreshToken = session.refreshToken();
      if (!refreshToken) throw new Error('No hay token de refresco');
      const { data } = await bare.post<AuthResponse>('/auth/refresh', { refreshToken });
      session.saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    })().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

function isAuthEndpoint(url?: string): boolean {
  return !!url && url.includes('/auth/');
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Un 401 en una petición normal casi siempre es el token de acceso expirado: se refresca una
    // vez y se reintenta, para que el usuario no vea nada. Los endpoints de /auth quedan fuera
    // porque su 401 es la respuesta legítima (credenciales malas, refresco inválido).
    const canRetry =
      status === 401 &&
      original &&
      !original._retried &&
      !isAuthEndpoint(original.url) &&
      session.refreshToken();

    if (canRetry) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return await http(original);
      } catch {
        // El refresco falló: token expirado, revocado, o reuso detectado. En los tres casos la
        // sesión ya no existe, así que se limpia y el guard de ruta devuelve al login.
        session.clear();
      }
    }

    // Un 401 sin token de refresco con el que reintentar significa que la sesión local es
    // inconsistente o fue manipulada: se limpia para que el guard devuelva al inicio de sesión
    // (HU-16 CA-3) en lugar de dejar una pantalla que ya no puede pedir nada.
    if (status === 401 && original && !isAuthEndpoint(original.url) && !session.refreshToken()) {
      session.clear();
    }

    return Promise.reject(toApiError(error));
  }
);

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const body = error.response?.data;
  const message =
    body?.message ?? error.response?.statusText ?? error.message ?? 'Error de red';
  const headers = error.response?.headers ?? {};
  const retryAfter = Number(headers['retry-after']);
  const quotaResetsAt = headers['x-quota-reset'];
  return new ApiError(
    message,
    body?.code ?? 'NETWORK_ERROR',
    body?.fieldErrors ?? {},
    error.response?.status,
    {
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      quotaResetsAt: typeof quotaResetsAt === 'string' ? quotaResetsAt : undefined,
    }
  );
}

export default http;
