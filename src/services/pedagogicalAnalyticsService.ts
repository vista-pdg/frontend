import http from '@/lib/http';
import type { CourseDto } from '@/types/auth';
import type { AnalyticsFilter, PedagogicalReport } from '@/types/analytics';

// Selección explícita: ni un objeto ampliado en tiempo de ejecución envía filtros individuales.
function params({ courseCode, from, to }: AnalyticsFilter): AnalyticsFilter {
  return { courseCode, from, to };
}

export async function fetchAnalyticsCourses(signal?: AbortSignal): Promise<CourseDto[]> {
  const { data } = await http.get<CourseDto[]>('/analytics/courses', { signal });
  return data;
}

export async function fetchPedagogicalReport(
  filter: AnalyticsFilter,
  signal?: AbortSignal,
): Promise<PedagogicalReport> {
  const { data } = await http.get<PedagogicalReport>('/analytics/report', {
    params: params(filter), signal,
  });
  return data;
}

/** El CSV lo genera el servidor a partir del mismo reporte anonimizado. */
export async function fetchAnalyticsCsv(filter: AnalyticsFilter, signal?: AbortSignal): Promise<Blob> {
  const { data } = await http.get<Blob>('/analytics/report.csv', {
    params: params(filter), responseType: 'blob', signal,
  });
  return data;
}
