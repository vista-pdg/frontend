import http from '@/lib/http';
import type {
  CourseQuotaDto,
  CreateRoleRequest,
  CreateUserRequest,
  PermissionDto,
  QuotaChangeDto,
  RoleDto,
  UserDto,
} from '@/types/auth';

// El login vive en authService: es el único que sabe guardar la sesión tras autenticarse.

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

// Courses and assistant quota (HU-17)
export async function fetchAdminCourses(): Promise<CourseQuotaDto[]> {
  const res = await http.get<CourseQuotaDto[]>('/admin/courses');
  return res.data;
}

export async function updateCourseQuota(code: string, dailyQuota: number): Promise<CourseQuotaDto> {
  const res = await http.put<CourseQuotaDto>(`/admin/courses/${encodeURIComponent(code)}/quota`, {
    dailyQuota,
  });
  return res.data;
}

export async function fetchQuotaHistory(code: string): Promise<QuotaChangeDto[]> {
  const res = await http.get<QuotaChangeDto[]>(
    `/admin/courses/${encodeURIComponent(code)}/quota-history`
  );
  return res.data;
}

// Permissions
export async function fetchPermissions(): Promise<PermissionDto[]> {
  const res = await http.get('/admin/permissions');
  return res.data;
}
