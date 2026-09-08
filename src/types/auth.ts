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
