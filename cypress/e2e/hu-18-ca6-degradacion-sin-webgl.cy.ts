/// <reference types="cypress" />
import { withoutWebGL } from '../support/hu18';

/**
 * HU-18 · CA-6 — Degradación controlada en equipos sin soporte gráfico.
 *
 *   Dado que mi navegador no dispone de aceleración WebGL
 *   Cuando ingreso al lienzo de visualización
 *   Entonces el sistema selecciona automáticamente el modo "2D"
 *   Y muestra un aviso explicativo sin bloquear el uso de la herramienta
 */
describe('HU-18 · CA-6 Degradación sin WebGL', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca6');
  });

  it('sin WebGL el lienzo abre en 2D, avisa y deshabilita el 3D; la herramienta sigue usable', () => {
    cy.visit('/', { onBeforeLoad: withoutWebGL });
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=canvas-3d]').should('not.exist');
    cy.get('[data-cy=mode-2d]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=mode-3d]').should('be.disabled');

    cy.get('[data-cy=webgl-fallback]')
      .should('be.visible')
      .and('have.attr', 'role', 'status')
      .and('contain', 'Modo 2D activado automáticamente');

    // No bloquea: el chat funciona y el lienzo 2D pinta lo generado.
    cy.intercept('POST', '/api/generate').as('generate');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=chat-input]').should('not.be.disabled').type('grafo K3');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate').its('response.statusCode').should('eq', 200);
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 3);

    // El aviso se puede cerrar y no vuelve mientras dure la carga.
    cy.get('[data-cy=webgl-fallback-dismiss]').click();
    cy.get('[data-cy=webgl-fallback]').should('not.exist');
  });

  it('la falta de WebGL no pisa la preferencia guardada del estudiante', () => {
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '3D'));
    cy.visit('/', { onBeforeLoad: withoutWebGL });
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.window().its('localStorage').invoke('getItem', 'vista_visualization_mode').should('eq', '3D');
  });

  it('con WebGL disponible no hay aviso y el 3D está habilitado', () => {
    cy.visit('/');
    cy.get('[data-cy=webgl-fallback]').should('not.exist');
    cy.get('[data-cy=mode-3d]').should('not.be.disabled');
  });
});
