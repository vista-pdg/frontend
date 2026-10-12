import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/http', () => ({ default: { get: vi.fn() } }));
import http from '@/lib/http';
import { fetchAnalyticsCourses, fetchAnalyticsCsv, fetchPedagogicalReport } from './pedagogicalAnalyticsService';

const filter = { courseCode: 'CEDI-G1', from: '2026-04-01', to: '2026-04-30' };
beforeEach(() => vi.clearAllMocks());

it('preserves suppressed nulls and sends only the three allowed filters', async () => {
  const data = { totalRequests: null, structures: [{ status: 'SUPPRESSED', frequency: null }] };
  vi.mocked(http.get).mockResolvedValue({ data });
  const controller = new AbortController();
  const expanded = { ...filter, studentId: 'must-not-be-sent' };
  expect(await fetchPedagogicalReport(expanded, controller.signal)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/analytics/report', { params: filter, signal: controller.signal });
});

it('exports server CSV with exactly the same scope and supports cancellation', async () => {
  const data = new Blob(['Datos insuficientes para garantizar el anonimato'], { type: 'text/csv' });
  vi.mocked(http.get).mockResolvedValue({ data });
  const controller = new AbortController();
  expect(await fetchAnalyticsCsv(filter, controller.signal)).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/analytics/report.csv', {
    params: filter, signal: controller.signal, responseType: 'blob',
  });
});

it('loads authorized courses without sending a teacher identity', async () => {
  const data = [{ code: 'CEDI-G1', name: 'Estructuras', termCode: '2026-1' }];
  vi.mocked(http.get).mockResolvedValue({ data });
  expect(await fetchAnalyticsCourses()).toBe(data);
  expect(http.get).toHaveBeenCalledWith('/analytics/courses', { signal: undefined });
});

it('propagates revoked permissions instead of falling back to cached metrics', async () => {
  const error = new Error('Forbidden');
  vi.mocked(http.get).mockRejectedValue(error);
  await expect(fetchPedagogicalReport(filter)).rejects.toBe(error);
  await expect(fetchAnalyticsCsv(filter)).rejects.toBe(error);
});
