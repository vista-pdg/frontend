/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { loadAvlDemo } from '../support/hu18';

/**
 * HU-18 · CA-7 — Registro del modo utilizado.
 *
 *   Cuando ejecuto un algoritmo en cualquiera de los dos modos
 *   Entonces el evento de telemetría registra el modo de visualización empleado
 *   Y ese campo queda disponible para el análisis de impacto de PdG II
 */
describe('HU-18 · CA-7 Registro del modo utilizado', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca7');
  });

  it('cada ejecución viaja con la cabecera del modo activo y la analítica la desglosa', () => {
    cy.intercept('POST', '/api/algorithm/steps').as('stepsReq');
    cy.visit('/');
    loadAvlDemo('10, 5, 3');
    cy.wait('@stepsReq').its('request.headers').should('have.property', 'x-visualization-mode', '3D');

    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@stepsReq').its('request.headers').should('have.property', 'x-visualization-mode', '2D');

    // La generación por chat también lleva el modo.
    cy.intercept('POST', '/api/generate').as('generate');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=chat-input]').type('grafo K3');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate').its('request.headers').should('have.property', 'x-visualization-mode', '2D');

    // Disponible para el análisis: el docente ve el desglose por modo.
    cy.request('POST', '/api/auth/login', SEEDED.teacher).then(({ body }) => {
      cy.request({
        url: '/api/analytics/summary',
        headers: { Authorization: `Bearer ${body.accessToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.eventsByVisualizationMode['3D']).to.be.at.least(1);
        expect(res.body.eventsByVisualizationMode['2D']).to.be.at.least(2);
        expect(res.body.totalAlgorithmRuns).to.be.at.least(2);
      });
    });
  });
});
