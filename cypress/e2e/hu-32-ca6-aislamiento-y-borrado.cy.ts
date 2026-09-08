/// <reference types="cypress" />
import { chat, nodeLabels, sessionStatus } from '../support/hu32';

/**
 * HU-32 · CA-6 y CA-7.
 *
 *   Escenario: Aislamiento entre estudiantes
 *   Escenario: Reinicio explícito ("Limpiar" borra la sesión del servidor)
 */
describe('HU-32 · CA-6/CA-7 Aislamiento y borrado', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
  });

  it('la estructura de otro estudiante no aparece en mi sesión', () => {
    cy.registerStudentByApi('memoria.otro');
    cy.visit('/');
    chat('arbol con insercion de 10, 5, 15');
    nodeLabels().should('deep.equal', ['10', '5', '15']);

    // Otra cuenta, mismo navegador: sesión nueva y vacía.
    cy.clearLocalStorage();
    cy.registerStudentByApi('memoria.mia');
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.visit('/');
    sessionStatus().should((s: { active: boolean }) => expect(s.active).to.eq(false));

    chat('inserta el 9');
    nodeLabels().should('not.include', '10');
    nodeLabels().should('not.include', '15');
  });

  it('«Limpiar» borra la sesión del servidor y lo siguiente empieza de cero', () => {
    cy.registerStudentByApi('memoria.limpia');
    cy.visit('/');
    chat('arbol con insercion de 10, 5, 15');
    sessionStatus().should((s: { active: boolean }) => expect(s.active).to.eq(true));

    cy.intercept('DELETE', '/api/assistant/session').as('forget');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=clear-canvas]').click();
    cy.wait('@forget').its('response.statusCode').should('eq', 204);

    sessionStatus().should((s: { active: boolean }) => expect(s.active).to.eq(false));
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 0);

    chat('inserta el 9', 'afterClear');
    nodeLabels().should('not.include', '10');
    cy.get('[data-cy=session-indicator]').should('exist');
  });
});
