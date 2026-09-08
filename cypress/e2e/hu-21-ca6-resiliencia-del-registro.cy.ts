/// <reference types="cypress" />
import { generateByChat, goToLastStep } from '../support/hu19';

/**
 * HU-21 · CA-6 — Resiliencia del registro analítico.
 *
 *   Dado que el servicio de persistencia analítica no está disponible
 *   Cuando un estudiante genera una estructura
 *   Entonces la visualización se renderiza normalmente
 *   Y el fallo de registro queda en los logs sin afectar la experiencia
 *
 * Aquí se simula el fallo desde el borde del cliente: la escritura del evento devuelve 500. Que el
 * fallo del repositorio dentro del servidor tampoco tumbe la petición lo demuestra la prueba de
 * integración, que sí puede tumbar el repositorio de verdad.
 */
describe('HU-21 · CA-6 Resiliencia del registro analítico', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('analitica.ca6');
  });

  it('si la escritura del evento falla, el recorrido sigue visible y utilizable', () => {
    cy.intercept('POST', '/api/assistant/events', { statusCode: 500, body: {} }).as('caido');
    cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist');
    generateByChat('grafo ciclo de 6 nodos', 6);

    cy.get('[data-cy=demo-graph-simple]').click();
    cy.get('[data-cy=algo-start]').should('exist').select('V1');
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
    cy.wait('@steps').its('response.body.error').should('eq', false);

    goToLastStep();
    cy.wait('@caido');

    cy.get('[data-cy=step-counter]')
      .invoke('text')
      .should((t) => {
        const [cur, total] = t.split('/').map((x) => Number(x.trim()));
        expect(cur, 'el estudiante sigue en el último paso').to.eq(total);
      });
    cy.get('[data-cy=chat-message-error]').should('not.exist');
    cy.get('[data-cy=step-prev]').click();
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('be.visible');
  });
});
