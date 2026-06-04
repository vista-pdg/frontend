export interface LoginResponse {
  token: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface AuthUser {
  email: string;
  displayName: string;
  roles: string[];
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
