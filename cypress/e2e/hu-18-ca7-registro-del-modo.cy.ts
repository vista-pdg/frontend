/// <reference types="cypress" />
import { assertLegacyAnalyticsRetired } from '../support/hu21';
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

  it('cada ejecución viaja con la cabecera del modo activo sin abrir lecturas individuales', () => {
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

    // La persistencia del modo se verifica en VisualizationModeTelemetryTest.
    assertLegacyAnalyticsRetired('summary');
  });
});
