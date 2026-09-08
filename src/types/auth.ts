export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

/** Respuesta de /auth/register, /auth/login y /auth/refresh. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Segundos de vida del token de acceso. */
  expiresIn: number;
  email: string;
  displayName: string;
  roles: Role[];
  /** Nulos cuando la cuenta no está vinculada a un curso (docente, administrador). */
  courseCode: string | null;
  termCode: string | null;
}

export interface CourseDto {
  code: string;
  name: string;
  termCode: string;
}

/** Estado de la cuota del asistente (HU-17). `resetsAt` es la próxima medianoche en America/Bogota. */
export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  ratePerMinute: number;
  warning: boolean;
  warningThreshold: number;
}

export interface CourseQuotaDto {
  code: string;
  name: string;
  termCode: string;
  /** Nula = rige la cuota por defecto de la aplicación. */
  dailyQuota: number | null;
  effectiveDailyQuota: number;
}

export interface QuotaChangeDto {
  courseCode: string;
  previousQuota: number | null;
  newQuota: number;
  changedBy: string;
  changedAt: string;
}

export interface AuthUser {
  email: string;
  displayName: string;
  roles: Role[];
}

/** Cuerpo de error de los endpoints de autenticación. */
export interface ApiErrorBody {
  code: string;
  message: string;
  /** Mensaje por campo, para señalar el input culpable en vez de un banner genérico. */
  fieldErrors?: Record<string, string>;
}

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  courseCode: string;
}

export interface UserDto {
  id: number;
  displayName: string;
  email: string;
  enabled: boolean;
  roles: string[];
}

export interface RoleDto {
  id: number;
  name: string;
  permissions: string[];
}

export interface PermissionDto {
  id: number;
  name: string;
  description: string;
}

export interface CreateUserRequest {
  displayName: string;
  email: string;
  password: string;
  roleIds: number[];
}

export interface CreateRoleRequest {
  name: string;
  permissionIds: number[];
}

/**
 * Estado de la sesión de trabajo del asistente (HU-32). `available` distingue «no hay sesión» de
 * «la memoria no está disponible»: sin Redis el asistente sigue generando, pero deja de recordar.
 */
export interface SessionStatus {
  available: boolean;
  active: boolean;
  structureType: string | null;
  secondsRemaining: number;
}
