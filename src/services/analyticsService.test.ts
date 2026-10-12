import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/http', () => ({ default: { post: vi.fn() } }));
import http from '@/lib/http';
import { reportAlgorithmProgress } from './analyticsService';

beforeEach(() => vi.clearAllMocks());

it('sends only execution correlation and progress, without identity or cohort', async () => {
  vi.mocked(http.post).mockResolvedValue({ status: 202 });
  await reportAlgorithmProgress('execution-id', 4);
  expect(http.post).toHaveBeenCalledWith('/assistant/events', {
    event: 'algorithm_progress', executionId: 'execution-id', stepCount: 4,
  });
});

it('a failed telemetry request does not interrupt playback', async () => {
  vi.mocked(http.post).mockRejectedValue(new Error('offline'));
  await expect(reportAlgorithmProgress('execution-id', 4)).resolves.toBeUndefined();
});
