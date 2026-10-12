/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { metricNumber, structureLabel } from '../../src/lib/analytics';
import type { PedagogicalReport } from '../../src/types/analytics';

/** Backend dev,e2e + Postgres/Redis/Mailpit aislados. No intercepta respuestas de API. */
describe('HU-06 · Integración real de telemetría, autorización y tablero', () => {
  it('agrega cinco estudiantes, muestra el reporte autorizado y descarga el CSV real', () => {
    cy.clearLocalStorage();
    cy.request('POST', '/api/auth/login', SEEDED.admin).then(({ body }) => {
      const headers = { Authorization: `Bearer ${body.accessToken}` };
      cy.request({ url: '/api/admin/users', headers }).then(({ body: users }) => {
        const teacher = (users as Array<{ id: number; email: string }>).find(u => u.email === SEEDED.teacher.email)!;
        expect(teacher, 'docente sembrado').to.exist;
        cy.request({ method: 'PUT', url: `/api/admin/courses/CEDI-G1/teachers/${teacher.id}`, headers });
      });
    });
    cy.wrap([0, 1, 2, 3, 4]).each(() => cy.registerStudentByApi('hu06.real', 'CEDI-G1').then(() =>
      cy.storedSession().then(({ accessToken }) => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        for (let attempt = 0; attempt < 3; attempt++) {
          cy.request({ method: 'POST', url: '/api/generate', headers, body: { prompt: 'grafo ciclo de 3 nodos', type: 'graph', subtype: 'simple' } })
            .its('body.error').should('eq', false);
        }
        cy.request({ method: 'POST', url: '/api/algorithm/steps', headers, body: { type: 'stack', subtype: 'simple', operation: 'pop', values: [1, 2, 3] } }).then(response => {
          expect(response.body.error, response.body.message).to.eq(false);
          const executionId = response.headers['x-analytics-execution'];
          expect(executionId).to.be.a('string');
          cy.request({ method: 'POST', url: '/api/assistant/events', headers, body: { event: 'algorithm_progress', executionId, stepCount: response.body.steps.length } }).its('status').should('eq', 202);
        });
      })
    ));
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.intercept('GET', '/api/analytics/report?*').as('realReport');
    cy.visit('/analytics'); cy.wait('@realReport');
    cy.get('[data-cy=analytics-course]').select('CEDI-G1');
    cy.get('[data-cy=analytics-apply]').click();
    cy.wait('@realReport').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      const report = response!.body as PedagogicalReport;
      expect(report.structures.some(row => row.status === 'AVAILABLE' && row.frequency! >= 15)).to.eq(true);
      expect(report.algorithms.some(row => row.status === 'AVAILABLE' && row.executions! >= 5)).to.eq(true);
      for (const row of report.structures.filter(row => row.status === 'AVAILABLE')) {
        cy.get('[data-cy=analytics-structure-row]').filter(`:contains("${structureLabel(row.structure)}")`).should('contain', metricNumber(row.frequency!));
      }
      cy.get('[data-cy=analytics-view-algorithms]').click();
      cy.get('[data-cy=analytics-algorithm-row]').should('exist');
      cy.get('[data-cy=analytics-view-retries]').click();
      cy.get('[data-cy=analytics-ranking]').should('be.visible');
      cy.intercept('GET', '/api/analytics/report.csv?*').as('realCsv');
      cy.get('[data-cy=analytics-export]').click();
      cy.wait('@realCsv').its('response.statusCode').should('eq', 200);
      cy.readFile(`cypress/downloads/vista-analitica-${report.from}-${report.to}.csv`).should('contain', 'CEDI-G1').and('contain', 'Estructuras');
    });
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.storedSession().then(({ accessToken }) => cy.request({ url: '/api/analytics/courses', headers: { Authorization: `Bearer ${accessToken}` }, failOnStatusCode: false }).its('status').should('eq', 403));
    cy.visit('/analytics'); cy.location('pathname').should('eq', '/');
  });
});
