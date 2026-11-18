import http from '@/lib/http';
import type { CourseDto } from '@/types/auth';
import type { AnalyticsFilter, PedagogicalReport, QuizRef } from '@/types/analytics';

/**
 * Selección explícita: ni un objeto ampliado en tiempo de ejecución envía filtros individuales.
 * HU-36: los filtros vacíos no se envían; sin fechas el servidor usa todo el periodo.
 */
export function analyticsParams({ courseCode, from, to, quizId }: AnalyticsFilter): Record<string, string> {
  const params: Record<string, string> = { courseCode };
  if (from) params.from = from;
  if (to) params.to = to;
  if (quizId) params.quizId = quizId;
  return params;
}

export async function fetchAnalyticsCourses(signal?: AbortSignal): Promise<CourseDto[]> {
  const { data } = await http.get<CourseDto[]>('/analytics/courses', { signal });
  return data;
}

export async function fetchAnalyticsQuizzes(courseCode: string, signal?: AbortSignal): Promise<QuizRef[]> {
  const { data } = await http.get<QuizRef[]>('/analytics/quizzes', { params: { courseCode }, signal });
  return data;
}

export async function fetchPedagogicalReport(
  filter: AnalyticsFilter,
  signal?: AbortSignal,
): Promise<PedagogicalReport> {
  const { data } = await http.get<PedagogicalReport>('/analytics/report', {
    params: analyticsParams(filter), signal,
  });
  return data;
}

/** El CSV lo genera el servidor a partir del mismo reporte anonimizado. */
export async function fetchAnalyticsCsv(filter: AnalyticsFilter, signal?: AbortSignal): Promise<Blob> {
  const { data } = await http.get<Blob>('/analytics/report.csv', {
    params: analyticsParams(filter), responseType: 'blob', signal,
  });
  return data;
}
