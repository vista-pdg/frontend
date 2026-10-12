/// <reference types="cypress" />
import { ask, assertLegacyAnalyticsRetired } from '../support/hu21';

// Los campos persistidos se verifican en AnalyticsInteractionTest/InteractionEventTest.
describe('HU-21 · CA-1 Generación y privacidad del registro', () => {
  beforeEach(() => {
    cy.clearLocalStorage(); cy.registerStudentByApi('analitica.ca1');
    cy.visit('/'); cy.get('[data-cy=chat-toggle]').click();
  });
  for (const prompt of ['crea un grafo no dirigido con 6 nodos', 'crea una pila con 3, 42, 8, 17']) {
    it(`genera ${prompt} sin publicar un evento individual al docente`, () => {
      ask(prompt, 'gen');
      cy.get('[data-cy=svg-scene], [data-cy=canvas-3d]').should('exist');
      cy.get('[data-cy=chat-message-error]').should('not.exist');
      assertLegacyAnalyticsRetired('events');
    });
  }
});
