import http from '@/lib/http';
import type {
  CreateRoleRequest,
  CreateUserRequest,
  PermissionDto,
  RoleDto,
  UserDto,
} from '@/types/auth';

// Auth
export async function login(email: string, password: string) {
  const res = await http.post('/auth/login', { email, password });
  return res.data;
}

// Users
export async function fetchUsers(): Promise<UserDto[]> {
  const res = await http.get('/admin/users');
  return res.data;
}

export async function createUser(req: CreateUserRequest): Promise<UserDto> {
  const res = await http.post('/admin/users', req);
  return res.data;
}

export async function updateUser(id: number, req: CreateUserRequest): Promise<UserDto> {
  const res = await http.put(`/admin/users/${id}`, req);
  return res.data;
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`/admin/users/${id}`);
}

// Roles
export async function fetchRoles(): Promise<RoleDto[]> {
  const res = await http.get('/admin/roles');
  return res.data;
}

export async function createRole(req: CreateRoleRequest): Promise<RoleDto> {
  const res = await http.post('/admin/roles', req);
  return res.data;
}

export async function updateRole(id: number, req: CreateRoleRequest): Promise<RoleDto> {
  const res = await http.put(`/admin/roles/${id}`, req);
  return res.data;
}

export async function deleteRole(id: number): Promise<void> {
  await http.delete(`/admin/roles/${id}`);
}

// Permissions
export async function fetchPermissions(): Promise<PermissionDto[]> {
  const res = await http.get('/admin/permissions');
  return res.data;
}
