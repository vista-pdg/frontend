import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AnalyticsRanking } from './AnalyticsRanking';
import { INSUFFICIENT_DATA, UNMEASURED_STEPS, type AnalyticsView } from '@/lib/analytics';
import { analyticsFixture } from '@/test/analyticsFixture';
const render = (view: AnalyticsView, report = analyticsFixture()) => renderToStaticMarkup(createElement(AnalyticsRanking, { view, report }));
it('renders descending frequencies and percentages in server order', () => {
  const html = render('structures');
  expect(html.indexOf('Árbol AVL')).toBeLessThan(html.indexOf('Pila'));
  for (const value of ['120', '80', '60 %', '40 %', '200 solicitudes']) expect(html).toContain(value);
});
it('renders average completed steps and distinguishes unmeasured history from zero', () => {
  const data = analyticsFixture();
  expect(render('algorithms', data)).toContain('6,5');
  data.algorithms[0].stepsStatus = 'UNAVAILABLE';
  data.algorithms[0].averageCompletedSteps = null;
  expect(render('algorithms', data)).toContain(UNMEASURED_STEPS);
});
it('hides numeric values and highlighting in every suppressed segment', () => {
  const data = analyticsFixture();
  data.totalRequests = null;
  data.structures = [{ structure: 'pila', status: 'SUPPRESSED', frequency: 98765, percentage: 99 }];
  data.algorithms = [{ algorithm: 'BFS', status: 'SUPPRESSED', executions: 98765, stepsStatus: 'SUPPRESSED', averageCompletedSteps: 98765 }];
  data.retries = [{ structure: 'pila', status: 'SUPPRESSED', sessions: 98765, sessionsWithRetries: 98765, retryRate: .99, highlighted: true }];
  for (const view of ['structures', 'algorithms', 'retries'] as const) {
    const html = render(view, data);
    expect(html).toContain(INSUFFICIENT_DATA);
    expect(html).not.toContain('98.765');
    expect(html).not.toContain('99 %');
    expect(html).not.toContain('Supera el umbral');
  }
});
it('protects complementary totals and percentages without hiding eligible frequencies', () => {
  const data = analyticsFixture(); data.totalRequests = null; data.structures[0].percentage = null;
  expect(render('structures', data)).toContain('120');
  expect(render('structures', data)).toContain(INSUFFICIENT_DATA);
  expect(render('structures', data)).not.toContain('200 solicitudes');
});
it('highlights difficulty with text and respects server threshold and zero rates', () => {
  const data = analyticsFixture();
  expect(render('retries', data)).toContain('Supera el umbral');
  expect(render('retries', data)).toContain('50 %');
  data.retries[0].highlighted = false; data.retries[0].retryRate = 0;
  expect(render('retries', data)).not.toContain('Supera el umbral');
  expect(render('retries', data)).toContain('0 %');
});
it('renders empty views and never introduces student controls', () => {
  const data = analyticsFixture(); data.structures = []; data.algorithms = []; data.retries = [];
  for (const view of ['structures', 'algorithms', 'retries'] as const) {
    const html = render(view, data);
    expect(html).toContain('No hay eventos');
    expect(html).not.toMatch(/<(input|select|button)/);
  }
});
