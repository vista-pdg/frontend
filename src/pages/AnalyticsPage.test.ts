// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';
import { ApiError } from '@/lib/http';
import { analyticsFixture } from '@/test/analyticsFixture';
import { fetchAnalyticsCourses, fetchAnalyticsCsv, fetchPedagogicalReport } from '@/services/pedagogicalAnalyticsService';
import type { PedagogicalReport } from '@/types/analytics';

vi.mock('@/services/pedagogicalAnalyticsService', () => ({ fetchAnalyticsCourses: vi.fn(), fetchAnalyticsCsv: vi.fn(), fetchPedagogicalReport: vi.fn() }));
vi.mock('@/contexts/useAuth', () => ({ useAuth: () => ({ user: { displayName: 'Docente' }, logout: vi.fn(), isAdmin: true }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
const courses = [analyticsFixture().course, { code: 'CEDI-G2', name: 'Otro curso', termCode: '2026-1' }];
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = container.querySelector<T>(`[data-cy="${id}"]`);
  if (!found) throw new Error(`Missing ${id}: ${container.textContent}`);
  return found;
}
const button = (id: string) => el<HTMLButtonElement>(id);
const click = async (id: string) => { await act(async () => button(id).click()); };
async function mount() { await act(async () => root.render(createElement(MemoryRouter, {}, createElement(AnalyticsPage)))); }
async function change(id: string, value: string) {
  await act(async () => {
    const input = el<HTMLInputElement | HTMLSelectElement>(id);
    const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit() { await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.mocked(fetchAnalyticsCourses).mockResolvedValue(courses);
  vi.mocked(fetchPedagogicalReport).mockImplementation(async filter => ({ ...analyticsFixture(), ...filter, course: courses.find(c => c.code === filter.courseCode)! }));
  vi.mocked(fetchAnalyticsCsv).mockResolvedValue(new Blob(['csv']));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('loads authorized courses, all three views and admin navigation', async () => {
  await mount();
  expect(el<HTMLSelectElement>('analytics-course').options).toHaveLength(2);
  expect(container.querySelector('a[href="/admin"]')).not.toBeNull();
  expect(el('analytics-ranking').textContent).toContain('Árbol AVL');
  await click('analytics-view-algorithms'); expect(el('analytics-ranking').textContent).toContain('6,5');
  await click('analytics-view-retries'); expect(el('analytics-ranking').textContent).toContain('Supera el umbral');
  expect(button('analytics-view-retries').getAttribute('aria-pressed')).toBe('true');
});
it('keeps draft filters separate and exports only applied dates', async () => {
  await mount();
  await change('analytics-course', 'CEDI-G2');
  await change('analytics-from', '2026-04-01'); await change('analytics-to', '2026-04-30');
  expect(el('analytics-applied').textContent).toContain('CEDI-G1');
  expect(button('analytics-export').disabled).toBe(true);
  await submit();
  expect(fetchPedagogicalReport).toHaveBeenLastCalledWith({ courseCode: 'CEDI-G2', from: '2026-04-01', to: '2026-04-30' }, expect.any(AbortSignal));
  expect(el('analytics-applied').textContent).toContain('CEDI-G2');
  expect(button('analytics-export').disabled).toBe(false);
});
it('validates dates, focuses the invalid field and avoids an API request', async () => {
  await mount(); const count = vi.mocked(fetchPedagogicalReport).mock.calls.length;
  await change('analytics-from', '2026-05-01'); await change('analytics-to', '2026-04-01'); await submit();
  expect(document.activeElement).toBe(el('analytics-to'));
  expect(el('analytics-to').getAttribute('aria-invalid')).toBe('true');
  expect(fetchPedagogicalReport).toHaveBeenCalledTimes(count);
});
it('clears old metrics during loading and ignores an out-of-order response', async () => {
  const first = deferred<PedagogicalReport>();
  vi.mocked(fetchPedagogicalReport).mockReturnValueOnce(first.promise);
  await mount(); expect(button('analytics-export').disabled).toBe(true);
  await change('analytics-course', 'CEDI-G2'); await submit();
  const stale = analyticsFixture(); stale.structures[0].structure = 'STALE';
  await act(async () => first.resolve(stale));
  expect(el('analytics-ranking').textContent).not.toContain('STALE');
  expect(el('analytics-applied').textContent).toContain('CEDI-G2');
  const next = deferred<PedagogicalReport>(); vi.mocked(fetchPedagogicalReport).mockReturnValueOnce(next.promise);
  await submit(); expect(container.querySelector('[data-cy="analytics-ranking"]')).toBeNull();
  expect(el('analytics-loading')).toBeTruthy();
  await act(async () => next.resolve(analyticsFixture()));
});
it('handles course failure, retry and no assigned courses', async () => {
  vi.mocked(fetchAnalyticsCourses).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  await mount(); expect(el('analytics-courses-error')).toBeTruthy();
  await click('analytics-courses-retry'); expect(el('analytics-no-courses')).toBeTruthy();
  expect(fetchPedagogicalReport).not.toHaveBeenCalled();
});
it('shows report failure and retries the same applied filters', async () => {
  vi.mocked(fetchPedagogicalReport).mockRejectedValueOnce(new Error('offline'));
  await mount(); expect(el('analytics-report-error').textContent).toContain('No se pudo cargar');
  expect(button('analytics-export').disabled).toBe(true);
  await click('analytics-report-retry'); expect(el('analytics-ranking')).toBeTruthy();
});
it('removes metrics when access is revoked', async () => {
  await mount(); vi.mocked(fetchPedagogicalReport).mockRejectedValueOnce(new ApiError('Forbidden', 'ANALYTICS_FORBIDDEN', {}, 403));
  await submit(); expect(el('analytics-report-error').textContent).toContain('No tienes acceso');
  expect(container.querySelector('[data-cy="analytics-ranking"]')).toBeNull();
});
it('downloads the server blob and reports success', async () => {
  const create = vi.fn(() => 'blob:fixture'); const revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  await mount(); await click('analytics-export');
  expect(create).toHaveBeenCalledWith(expect.any(Blob)); expect(download).toHaveBeenCalledOnce();
  expect(el('analytics-export-status').textContent).toContain('descargado');
  expect(button('analytics-export').disabled).toBe(false);
});
it('handles export failure and revocation without leaving metrics visible', async () => {
  await mount(); vi.mocked(fetchAnalyticsCsv).mockRejectedValueOnce(new Error('offline'));
  await click('analytics-export'); expect(el('analytics-export-error')).toBeTruthy();
  expect(button('analytics-export').disabled).toBe(false);
  vi.mocked(fetchAnalyticsCsv).mockRejectedValueOnce(new ApiError('Forbidden', 'ANALYTICS_FORBIDDEN', {}, 403));
  await click('analytics-export'); expect(el('analytics-report-error')).toBeTruthy();
  expect(container.querySelector('[data-cy="analytics-ranking"]')).toBeNull();
});
it('cancels pending CSV when filters change and on unmount', async () => {
  const pending = deferred<Blob>(); vi.mocked(fetchAnalyticsCsv).mockReturnValue(pending.promise);
  await mount(); await click('analytics-export'); expect(button('analytics-export').disabled).toBe(true);
  const signal = vi.mocked(fetchAnalyticsCsv).mock.calls[0][1]!;
  await change('analytics-course', 'CEDI-G2'); expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve(new Blob(['stale'])));
  expect(el('analytics-export-status').textContent).toBe('');
});
