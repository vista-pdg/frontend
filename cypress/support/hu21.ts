/// <reference types="cypress" />
import { SEEDED } from './commands';

/** HU-06 retira las lecturas individuales. La persistencia se verifica con Postgres en backend. */
export function assertLegacyAnalyticsRetired(path: 'events' | 'retries' | 'summary') {
  return cy.request('POST', '/api/auth/login', SEEDED.teacher).then(({ body }) =>
    cy.request({ url: `/api/analytics/${path}`, failOnStatusCode: false,
      headers: { Authorization: `Bearer ${body.accessToken}` } }).then((response) => {
      expect(response.status).to.eq(410);
      expect(response.body.code).to.eq('ANALYTICS_ENDPOINT_RETIRED');
      const raw = JSON.stringify(response.body);
      for (const field of ['pseudonym', 'sessionId', 'promptText', 'distinctUsers', '@u.icesi.edu.co'])
        expect(raw).not.to.contain(field);
    })
  );
}

/** Envía una instrucción al asistente esperando que el backend la acepte o la rechace. */
export function ask(prompt: string, alias: string, expectedStatus = 200) {
  cy.intercept('POST', '/api/generate').as(alias);
  cy.get('[data-cy=quota-counter]').should('be.visible');
  cy.get('[data-cy=chat-input]').should('not.be.disabled').clear().type(prompt);
  // Se confirma lo escrito antes de enviarlo: una prueba que envía otra instrucción de la que dice
  // no prueba lo que cree. Ver `fix-chat-conserva-lo-escrito`.
  cy.get('[data-cy=chat-input]').should('have.value', prompt);
  cy.get('[data-cy=chat-send]').should('not.be.disabled').click();
  cy.wait(`@${alias}`).its('response.statusCode').should('eq', expectedStatus);
}
