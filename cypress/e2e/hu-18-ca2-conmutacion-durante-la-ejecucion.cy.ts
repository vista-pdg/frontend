/// <reference types="cypress" />
import { engineState, loadAvlDemo } from '../support/hu18';

/**
 * HU-18 · CA-2 — Conmutación durante una ejecución en curso.
 *
 *   Dado que estoy en el paso 5 de la ejecución de un recorrido
 *   Cuando cambio de modo de visualización
 *   Entonces la nueva vista se posiciona en el mismo paso 5
 *   Y los controles de paso adelante y atrás siguen operativos
 *   Y la ejecución puede continuar sin reiniciarse
 */
describe('HU-18 · CA-2 Conmutación durante una ejecución', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca2');
    cy.visit('/');
    loadAvlDemo('10, 5, 15, 3, 7, 12, 20');
    for (let i = 0; i < 4; i++) cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('have.text', '5 / 8');
  });

  it('en el paso 5 el cambio a 2D deja la vista en el paso 5 y los controles siguen vivos', () => {
    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=step-counter]').should('have.text', '5 / 8');
    cy.window().should((win) => {
      expect(engineState(win).stepIndex).to.eq(4);
      expect(engineState(win).trace).to.have.length(8);
    });
    // El resaltado del paso 5 se ve en el lienzo 2D.
    cy.get('[data-cy=svg-scene] [data-highlighted="true"]').should('have.length.at.least', 1);

    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('have.text', '6 / 8');
    cy.get('[data-cy=step-prev]').click();
    cy.get('[data-cy=step-counter]').should('have.text', '5 / 8');

    // Y de vuelta al 3D la ejecución sigue donde estaba, y termina.
    cy.get('[data-cy=mode-3d]').click();
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.get('[data-cy=step-counter]').should('have.text', '5 / 8');
    for (let i = 0; i < 3; i++) cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('have.text', '8 / 8');
    cy.get('[data-cy=step-next]').should('be.disabled');
  });

  it('el teclado sigue navegando pasos tras el cambio de modo', () => {
    cy.get('[data-cy=mode-2d]').click();
    cy.get('body').type('{rightArrow}');
    cy.get('[data-cy=step-counter]').should('have.text', '6 / 8');
    cy.get('body').type('{leftArrow}');
    cy.get('[data-cy=step-counter]').should('have.text', '5 / 8');
  });
});
