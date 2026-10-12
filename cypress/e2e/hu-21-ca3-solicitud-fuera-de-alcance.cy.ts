/// <reference types="cypress" />
import { ask, assertLegacyAnalyticsRetired } from '../support/hu21';

// El texto de fallos queda en telemetría interna, comprobado por AnalyticsInteractionTest.
describe('HU-21 · CA-3 Rechazo y privacidad del prompt', () => {
  beforeEach(() => {
    cy.clearLocalStorage(); cy.registerStudentByApi('analitica.ca3');
    cy.visit('/'); cy.get('[data-cy=chat-toggle]').click();
  });
  it('informa el rechazo y no publica el prompt ni la sesión al docente', () => {
    ask('dibuja un árbol rojinegro con rotaciones', 'rechazo', 400);
    cy.get('[data-cy=chat-message-error]').should('be.visible');
    assertLegacyAnalyticsRetired('events');
  });
  it('el estudiante tampoco lee los eventos', () => {
    cy.storedSession().then((s) => {
      cy.request({ url: '/api/analytics/events', failOnStatusCode: false,
        headers: { Authorization: `Bearer ${s.accessToken}` } }).then((res) => {
        expect(res.status).to.eq(403);
        expect(JSON.stringify(res.body)).not.to.contain('promptText');
      });
    });
  });
});
