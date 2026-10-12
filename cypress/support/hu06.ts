/// <reference types="cypress" />
import type { PedagogicalReport } from '../../src/types/analytics';
import { analyticsFixture } from '../../src/test/analyticsFixture';

/** Fixtures explícitas de interacción UI. La política SQL/JWT se verifica en PedagogicalAnalyticsTest. */
export function openAnalyticsFixture(report: PedagogicalReport = analyticsFixture(), role = 'TEACHER') {
  const courses = [report.course, { code: 'CEDI-G2', name: 'Segundo grupo', termCode: '2026-1' }];
  cy.intercept('GET', '/api/analytics/courses', courses).as('courses');
  cy.intercept('GET', '/api/analytics/report?*', req => {
    const q = new URL(req.url).searchParams;
    req.reply({ ...report, course: courses.find(c => c.code === q.get('courseCode')), from: q.get('from'), to: q.get('to') });
  }).as('report');
  cy.visit('/analytics', { onBeforeLoad(win) {
    win.localStorage.setItem('vista_user', JSON.stringify({ displayName: 'QA Docente', email: 'qa@example.invalid', roles: [role] }));
    win.localStorage.setItem('vista_theme', 'light');
  } });
  cy.wait(['@courses', '@report']);
}
export function protectedFixture() {
  const report = analyticsFixture(); report.totalRequests = null;
  report.structures = [{ structure: 'pila', status: 'SUPPRESSED', frequency: null, percentage: null }];
  report.algorithms = [{ algorithm: 'BFS', status: 'SUPPRESSED', executions: null, stepsStatus: 'SUPPRESSED', averageCompletedSteps: null }];
  report.retries = [{ structure: 'pila', status: 'SUPPRESSED', sessions: null, sessionsWithRetries: null, retryRate: null, highlighted: null }];
  return report;
}
export const by = (id: string) => cy.get(`[data-cy="${id}"]`);
