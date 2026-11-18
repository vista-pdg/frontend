// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';
import { ApiError } from '@/lib/http';
import { analyticsFixture, suppressedFixture } from '@/test/analyticsFixture';
import { fetchAnalyticsCourses, fetchAnalyticsCsv, fetchAnalyticsQuizzes, fetchPedagogicalReport } from '@/services/pedagogicalAnalyticsService';
import type { PedagogicalReport } from '@/types/analytics';

vi.mock('@/services/pedagogicalAnalyticsService', () => ({ fetchAnalyticsCourses: vi.fn(), fetchAnalyticsCsv: vi.fn(), fetchAnalyticsQuizzes: vi.fn(), fetchPedagogicalReport: vi.fn() }));
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
  vi.mocked(fetchPedagogicalReport).mockImplementation(async filter => ({
    ...analyticsFixture(), from: filter.from || null, to: filter.to || null, wholeTerm: !filter.from && !filter.to,
    course: courses.find(c => c.code === filter.courseCode)!,
  }));
  vi.mocked(fetchAnalyticsCsv).mockResolvedValue(new Blob(['csv']));
  vi.mocked(fetchAnalyticsQuizzes).mockResolvedValue([{ id: 4, title: 'Quiz 2 · Árboles AVL' }]);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const whole = { courseCode: 'CEDI-G1', from: '', to: '', quizId: '' };

it('loads the whole term of the first course without dates (HU-36 · CA-5)', async () => {
  await mount();
  expect(fetchPedagogicalReport).toHaveBeenCalledWith(whole, expect.any(AbortSignal));
  expect(el<HTMLInputElement>('analytics-from').value).toBe('');
  expect(el('analytics-applied').textContent).toContain('Todo el periodo');
  expect(el('analytics-applied').textContent).toContain('Todos los quizzes');
  expect(container.querySelector('[data-cy="analytics-clear"]')).toBeNull();
  expect(el<HTMLSelectElement>('analytics-quiz').options).toHaveLength(2);
  expect(el('analytics-kpi-active').textContent).toBe('27');
  expect(el('analytics-kpi-accuracy').textContent).toBe('64 %');
});
it('loads authorized courses, every tab and the three usage views', async () => {
  await mount();
  expect(el<HTMLSelectElement>('analytics-course').options).toHaveLength(2);
  expect(container.querySelector('a[href="/admin"]')).not.toBeNull();
  expect(el('analytics-hardest-topics').textContent).toContain('Árbol AVL — AVL · Inserción');
  expect(el('analytics-common-mistake').textContent).toContain('41 %');
  expect(el('analytics-best-topics').textContent).toContain('Pila');
  expect(el('analytics-practice').textContent).toContain('71 %');
  await click('analytics-tab-topics');
  expect(container.querySelectorAll('[data-cy="analytics-topic-row"]')).toHaveLength(4);
  expect(el('analytics-topics').textContent).toContain('Muestra pequeña');
  await click('analytics-tab-questions');
  expect(el('analytics-wrong-option').textContent).toContain('45 %');
  expect(el('analytics-easy-question').textContent).toContain('19 s');
  await click('analytics-tab-quizzes');
  expect(container.querySelectorAll('[data-cy="analytics-quiz-row"]')).toHaveLength(2);
  await click('analytics-tab-usage');
  expect(el('analytics-ranking').textContent).toContain('Árbol AVL');
  await click('analytics-view-algorithms'); expect(el('analytics-ranking').textContent).toContain('6,5');
  await click('analytics-view-retries'); expect(el('analytics-ranking').textContent).toContain('Supera el umbral');
  expect(button('analytics-view-retries').getAttribute('aria-pressed')).toBe('true');
});
it('keeps draft filters separate, sends optional ones and clears them', async () => {
  await mount();
  await change('analytics-course', 'CEDI-G2');
  await change('analytics-from', '2026-04-01'); await change('analytics-to', '2026-04-30');
  expect(el('analytics-applied').textContent).toContain('CEDI-G1');
  expect(el('analytics-dirty')).toBeTruthy();
  expect(button('analytics-export').disabled).toBe(true);
  await submit();
  expect(fetchPedagogicalReport).toHaveBeenLastCalledWith({ courseCode: 'CEDI-G2', from: '2026-04-01', to: '2026-04-30', quizId: '' }, expect.any(AbortSignal));
  expect(el('analytics-applied').textContent).toContain('01/04/2026 – 30/04/2026');
  expect(button('analytics-export').disabled).toBe(false);
  await click('analytics-clear');
  expect(fetchPedagogicalReport).toHaveBeenLastCalledWith({ ...whole, courseCode: 'CEDI-G2' }, expect.any(AbortSignal));
  expect(el<HTMLInputElement>('analytics-from').value).toBe('');
});
it('filters by one quiz and resets it when the course changes', async () => {
  await mount();
  await change('analytics-quiz', '4'); await submit();
  expect(fetchPedagogicalReport).toHaveBeenLastCalledWith({ ...whole, quizId: '4' }, expect.any(AbortSignal));
  await change('analytics-course', 'CEDI-G2');
  expect(el<HTMLSelectElement>('analytics-quiz').value).toBe('');
});
it('shows a single group notice below the threshold and offers to drop the dates', async () => {
  vi.mocked(fetchPedagogicalReport).mockImplementation(async filter => ({ ...suppressedFixture(), wholeTerm: !filter.from && !filter.to, from: filter.from || null, to: filter.to || null }));
  await mount();
  expect(el('analytics-suppressed').textContent).toContain('Datos insuficientes para garantizar el anonimato');
  expect(el('analytics-suppressed').textContent).toContain('todo el periodo');
  expect(container.querySelector('[data-cy="analytics-tab-summary"]')).toBeNull();
  expect(container.querySelector('[data-cy="analytics-clear-dates"]')).toBeNull();
  await change('analytics-from', '2026-04-01'); await submit();
  await click('analytics-clear-dates');
  expect(fetchPedagogicalReport).toHaveBeenLastCalledWith(whole, expect.any(AbortSignal));
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
  const stale = analyticsFixture(); stale.topics[0].topicLabel = 'STALE';
  await act(async () => first.resolve(stale));
  expect(el('analytics-summary').textContent).not.toContain('STALE');
  expect(el('analytics-applied').textContent).toContain('CEDI-G2');
  const next = deferred<PedagogicalReport>(); vi.mocked(fetchPedagogicalReport).mockReturnValueOnce(next.promise);
  await submit(); expect(container.querySelector('[data-cy="analytics-summary"]')).toBeNull();
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
  await click('analytics-report-retry'); expect(el('analytics-summary')).toBeTruthy();
});
it('removes metrics when access is revoked', async () => {
  await mount(); vi.mocked(fetchPedagogicalReport).mockRejectedValueOnce(new ApiError('Forbidden', 'ANALYTICS_FORBIDDEN', {}, 403));
  await submit(); expect(el('analytics-report-error').textContent).toContain('No tienes acceso');
  expect(container.querySelector('[data-cy="analytics-summary"]')).toBeNull();
});
it('downloads the server blob with the server file name and reports success', async () => {
  const create = vi.fn(() => 'blob:fixture'); const revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  let name = '';
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });
  await mount(); await click('analytics-export');
  expect(create).toHaveBeenCalledWith(expect.any(Blob)); expect(download).toHaveBeenCalledOnce();
  expect(name).toBe('vista-analitica-CEDI-G1-2026-1.csv');
  expect(el('analytics-export-status').textContent).toContain('descargado');
  expect(button('analytics-export').disabled).toBe(false);
});
it('handles export failure and revocation without leaving metrics visible', async () => {
  await mount(); vi.mocked(fetchAnalyticsCsv).mockRejectedValueOnce(new Error('offline'));
  await click('analytics-export'); expect(el('analytics-export-error')).toBeTruthy();
  expect(button('analytics-export').disabled).toBe(false);
  vi.mocked(fetchAnalyticsCsv).mockRejectedValueOnce(new ApiError('Forbidden', 'ANALYTICS_FORBIDDEN', {}, 403));
  await click('analytics-export'); expect(el('analytics-report-error')).toBeTruthy();
  expect(container.querySelector('[data-cy="analytics-summary"]')).toBeNull();
});
it('cancels pending CSV when filters change and on unmount', async () => {
  const pending = deferred<Blob>(); vi.mocked(fetchAnalyticsCsv).mockReturnValue(pending.promise);
  await mount(); await click('analytics-export'); expect(button('analytics-export').disabled).toBe(true);
  const signal = vi.mocked(fetchAnalyticsCsv).mock.calls[0][1]!;
  await change('analytics-course', 'CEDI-G2'); expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve(new Blob(['stale'])));
  expect(el('analytics-export-status').textContent).toBe('');
});
