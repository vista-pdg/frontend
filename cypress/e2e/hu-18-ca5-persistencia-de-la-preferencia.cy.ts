/// <reference types="cypress" />

/**
 * HU-18 · CA-5 — Persistencia de la preferencia del estudiante.
 *
 *   Dado que seleccioné el modo "2D" en mi sesión anterior
 *   Cuando inicio una nueva sesión
 *   Entonces el lienzo se abre en modo "2D"
 *   Y puedo cambiar de modo en cualquier momento
 */
describe('HU-18 · CA-5 Persistencia de la preferencia', () => {
  const KEY = 'vista_visualization_mode';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca5');
  });

  it('elegir 2D queda guardado y una nueva sesión abre en 2D', () => {
    cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.window().its('localStorage').invoke('getItem', KEY).should('eq', '2D');

    // "Nueva sesión": otra carga completa de la aplicación.
    cy.visit('/');
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=mode-2d]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=canvas-3d]').should('not.exist');

    // Y se puede cambiar en cualquier momento.
    cy.get('[data-cy=mode-3d]').click();
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.window().its('localStorage').invoke('getItem', KEY).should('eq', '3D');
  });

  it('una preferencia guardada de 2D se respeta incluso tras cerrar y volver a iniciar sesión', () => {
    cy.window().then((win) => win.localStorage.setItem(KEY, '2D'));
    cy.visit('/');
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=chat-toggle]').should('be.visible');
  });

  it('un valor corrupto en la preferencia cae al modo por defecto sin romper el lienzo', () => {
    cy.window().then((win) => win.localStorage.setItem(KEY, '4D'));
    cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist');
  });
});
