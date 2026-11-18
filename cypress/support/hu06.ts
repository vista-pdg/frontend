/// <reference types="cypress" />
import type { PedagogicalReport } from '../../src/types/analytics';
import { analyticsFixture, suppressedFixture } from '../../src/test/analyticsFixture';

/** Fixtures explícitas de interacción UI. La política SQL/JWT se verifica en PedagogicalAnalyticsTest. */
export function openAnalyticsFixture(report: PedagogicalReport = analyticsFixture(), role = 'TEACHER') {
  const courses = [report.course, { code: 'CEDI-G2', name: 'Segundo grupo', termCode: '2026-1' }];
  cy.intercept('GET', '/api/analytics/courses', courses).as('courses');
  cy.intercept('GET', '/api/analytics/quizzes?*', [{ id: 4, title: 'Quiz 2 · Árboles AVL' }]).as('quizzes');
  cy.intercept('GET', '/api/analytics/report?*', req => {
    const q = new URL(req.url).searchParams;
    const quizId = q.get('quizId');
    req.reply({
      ...report, course: courses.find(c => c.code === q.get('courseCode')), from: q.get('from'), to: q.get('to'),
      wholeTerm: !q.get('from') && !q.get('to'), quiz: quizId ? { id: Number(quizId), title: 'Quiz 2 · Árboles AVL' } : null,
    });
  }).as('report');
  cy.visit('/analytics', { onBeforeLoad(win) {
    win.localStorage.setItem('vista_user', JSON.stringify({ displayName: 'QA Docente', email: 'qa@example.invalid', roles: [role] }));
    win.localStorage.setItem('vista_theme', 'light');
  } });
  cy.wait(['@courses', '@report']);
}
/** HU-36 · CA-5: el grupo no alcanza el umbral y el reporte llega sin métricas. */
export function protectedFixture() {
  return suppressedFixture();
}
export const by = (id: string) => cy.get(`[data-cy="${id}"]`);
/** Las vistas de HU-06 viven en «Uso de VISTA» desde HU-36. */
export const openUsage = () => by('analytics-tab-usage').click();
