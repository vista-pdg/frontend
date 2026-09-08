/// <reference types="cypress" />
import { chat, nodeLabels } from '../support/hu32';

/**
 * HU-32 · CA-8 y CA-9.
 *
 *   Escenario: Cuota y trazabilidad del refinamiento (consume un mensaje como cualquier otro)
 *   Escenario: Degradación sin Redis (genera sin contexto y avisa, sin bloquear)
 *
 * Que el servidor sobreviva a un Redis caído lo prueba `AssistantSessionDegradationTest`; aquí se
 * comprueba la mitad que ve el estudiante, forzando la cabecera que el servidor enviaría.
 */
describe('HU-32 · CA-8/CA-9 Cuota y degradación', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('memoria.ca8');
    cy.visit('/');
  });

  it('un refinamiento consume cuota como cualquier mensaje', () => {
    chat('arbol con insercion de 1, 2, 3');
    cy.get('[data-cy=quota-counter]').should('have.text', '39 mensajes restantes hoy');

    chat('ahora inserta el 7', 'refine');
    cy.get('[data-cy=quota-counter]').should('have.text', '38 mensajes restantes hoy');
    cy.get('@refine').its('request.headers').should('have.property', 'x-visualization-mode', '2D');
  });

  it('sin memoria el asistente sigue generando y lo explica sin bloquear', () => {
    cy.intercept('POST', '/api/generate', (req) => {
      req.continue((res) => {
        res.headers['x-assistant-memory'] = 'unavailable';
      });
    }).as('degraded');

    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=chat-input]').type('arbol con insercion de 1, 2, 3');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@degraded').its('response.statusCode').should('eq', 200);

    cy.get('[data-cy=memory-unavailable]')
      .should('be.visible')
      .and('have.attr', 'role', 'status')
      .and('contain', 'memoria de la sesión no está disponible');
    // No bloquea: la estructura se dibujó y el compositor sigue operativo.
    nodeLabels().should('deep.equal', ['1', '2', '3']);
    cy.get('[data-cy=chat-input]').should('not.be.disabled');
    cy.get('[data-cy=session-indicator]').should('not.exist');
  });
});
