/// <reference types="cypress" />

/**
 * HU-17 · CA-4 — Aviso preventivo de umbral.
 *
 *   Dado que hoy he enviado 32 mensajes al asistente
 *   Cuando envio un nuevo mensaje
 *   Entonces el sistema procesa la peticion
 *   Y muestra una advertencia no bloqueante "Te quedan 7 mensajes hoy"
 *
 * 32 mensajes no caben bajo el limite de 5 por minuto, asi que el caso exacto (32 → 7 con cuota 40)
 * lo fija AssistantQuotaTest. Aqui se reproduce la misma regla con una cuota de 5 bajada por el
 * administrador: con 4 enviados, el siguiente deja 1 restante, dentro del umbral del 20 %, y el
 * aviso aparece sin bloquear el envio.
 */
describe('HU-17 · CA-4 Aviso preventivo de umbral', () => {
  before(() => cy.adminSetQuota('CEDI-G1', 5));
  after(() => cy.adminSetQuota('CEDI-G1', 40));

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('cuota.ca4');
  });

  it('bajo el umbral aparece "Te quedan N mensajes hoy" y el envio sigue habilitado', () => {
    cy.storedSession().then((s) => {
      const auth = { Authorization: `Bearer ${s.accessToken}` };
      for (let i = 1; i <= 3; i++) {
        cy.request({ method: 'POST', url: '/api/generate', headers: auth, body: { prompt: `K3 ${i}` } })
          .its('status')
          .should('eq', 200);
      }
    });

    cy.intercept('POST', '/api/generate').as('generate');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-counter]').should('have.text', '2 mensajes restantes hoy');
    cy.get('[data-cy=quota-warning]').should('not.exist');

    // El 4.º se procesa y deja 1: entra en el umbral (ceil(5 · 0,2) = 1).
    cy.get('[data-cy=chat-input]').type('cuarto mensaje');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate').its('response.statusCode').should('eq', 200);

    cy.get('[data-cy=quota-warning]')
      .should('be.visible')
      .and('have.attr', 'role', 'status')
      .and('contain', 'Te quedan 1 mensajes hoy');
    cy.get('[data-cy=quota-counter]').should('have.text', '1 mensajes restantes hoy');

    // No bloqueante: el compositor sigue operativo.
    cy.get('[data-cy=chat-input]').should('not.be.disabled');
    cy.get('[data-cy=chat-input]').type('todavia puedo enviar');
    cy.get('[data-cy=chat-send]').should('not.be.disabled');
  });

  it('el aviso se pinta en el color de advertencia, no en el de error', () => {
    cy.storedSession().then((s) => {
      const auth = { Authorization: `Bearer ${s.accessToken}` };
      for (let i = 1; i <= 4; i++) {
        cy.request({ method: 'POST', url: '/api/generate', headers: auth, body: { prompt: `K3 ${i}` } });
      }
    });
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-warning]').should('be.visible');
    cy.get('[data-cy=quota-exhausted]').should('not.exist');
    cy.get('[data-cy=quota-counter]').should('have.class', 'text-yellow-main');
  });
});
