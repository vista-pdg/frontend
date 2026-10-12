/// <reference types="cypress" />
import { ask, assertLegacyAnalyticsRetired } from '../support/hu21';

// El agrupamiento por sesión y las ventanas se verifican con SQL en PedagogicalAnalyticsTest.
describe('HU-21 · CA-4 Reintentos sin acceso a sesiones individuales', () => {
  beforeEach(() => {
    cy.clearLocalStorage(); cy.registerStudentByApi('analitica.ca4');
    cy.visit('/'); cy.get('[data-cy=chat-toggle]').click();
  });
  it('permite reformular sin publicar la sesión de un estudiante', () => {
    ask('quiero un árbol rojinegro', 'r1', 400);
    ask('bueno, hazme un rojo-negro entonces', 'r2', 400);
    ask('vale, un trie con las palabras del curso', 'r3', 400);
    assertLegacyAnalyticsRetired('retries');
    assertLegacyAnalyticsRetired('events');
  });
  it('un único intento tampoco habilita la lectura individual', () => {
    ask('crea un grafo no dirigido con 5 nodos', 'unico');
    assertLegacyAnalyticsRetired('retries');
  });
});
