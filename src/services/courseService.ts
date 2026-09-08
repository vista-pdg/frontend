import http from '@/lib/http';
import type { CourseDto } from '@/types/auth';

/** Cursos del periodo activo. Público: el formulario de registro lo consulta antes de que exista sesión. */
export async function fetchCourses(): Promise<CourseDto[]> {
  const { data } = await http.get<CourseDto[]>('/courses');
  return data;
}
