import http from '@/lib/http';
import type {
  AcademicTermDto,
  AssignedTeacherDto,
  CourseQuotaDto,
  CourseDto,
  CreateCourseRequest,
  CreateRoleRequest,
  CreateUserRequest,
  PermissionDto,
  QuotaChangeDto,
  RoleDto,
  StudentEnrollmentDto,
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

export async function fetchAcademicTerms(): Promise<AcademicTermDto[]> {
  const res = await http.get<AcademicTermDto[]>('/admin/terms');
  return res.data;
}

export async function createCourse(req: CreateCourseRequest): Promise<CourseDto> {
  const res = await http.post<CourseDto>('/admin/courses', req);
  return res.data;
}

export async function fetchCourseTeachers(code: string): Promise<AssignedTeacherDto[]> {
  const res = await http.get<AssignedTeacherDto[]>(`/admin/courses/${encodeURIComponent(code)}/teachers`);
  return res.data;
}

export async function assignCourseTeacher(code: string, teacherId: number): Promise<void> {
  await http.put(`/admin/courses/${encodeURIComponent(code)}/teachers/${teacherId}`);
}

export async function revokeCourseTeacher(code: string, teacherId: number): Promise<void> {
  await http.delete(`/admin/courses/${encodeURIComponent(code)}/teachers/${teacherId}`);
}

export async function fetchAdminStudents(): Promise<StudentEnrollmentDto[]> {
  const res = await http.get<StudentEnrollmentDto[]>('/admin/students');
  return res.data;
}

export async function assignStudentCourse(studentId: number, courseCode: string): Promise<StudentEnrollmentDto> {
  const res = await http.put<StudentEnrollmentDto>(`/admin/students/${studentId}/course`, { courseCode });
  return res.data;
}

export async function revokeStudentCourse(studentId: number): Promise<void> {
  await http.delete(`/admin/students/${studentId}/course`);
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
