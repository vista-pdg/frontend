/// <reference types="cypress" />
import { ask, assertLegacyAnalyticsRetired } from '../support/hu21';

// La fila cruda se inspecciona en GenerationTelemetryTest; no se añade un bypass de QA a la API.
describe('HU-21 · CA-5 Privacidad de las lecturas públicas', () => {
  it('los endpoints antiguos no publican identidades, sesiones ni conteos individuales', () => {
    cy.clearLocalStorage(); cy.registerStudentByApi('analitica.ca5');
    cy.visit('/'); cy.get('[data-cy=chat-toggle]').click();
    ask('crea un grafo no dirigido con 4 nodos', 'gen');
    assertLegacyAnalyticsRetired('events');
    assertLegacyAnalyticsRetired('summary');
    assertLegacyAnalyticsRetired('retries');
  });
});
