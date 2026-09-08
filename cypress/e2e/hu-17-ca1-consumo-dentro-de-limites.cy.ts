/// <reference types="cypress" />

/**
 * HU-17 · CA-1 — Consumo dentro de los limites.
 *
 *   Dado que hoy he enviado 10 mensajes al asistente
 *   Cuando envio un nuevo mensaje
 *   Entonces el sistema procesa la peticion normalmente
 *   Y el contador visible indica "29 mensajes restantes hoy"
 *
 * Los "10 mensajes previos" no se pueden producir desde el navegador sin chocar con el limite de 5
 * por minuto (CA-3), asi que el salto exacto 10 → 29 lo fija AssistantQuotaTest sembrando la fila
 * de uso. Aqui se verifica lo que si es de cara al usuario: que el contador arranca completo, que
 * cada mensaje procesado lo decrementa a partir de las cabeceras de la respuesta, y el formato
 * literal "N mensajes restantes hoy".
 */
describe('HU-17 · CA-1 Consumo dentro de los limites', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('cuota.ca1');
    cy.intercept('POST', '/api/generate').as('generate');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
  });

  it('el contador arranca en 40 y baja a 39 tras procesar un mensaje', () => {
    cy.get('[data-cy=quota-counter]').should('have.text', '40 mensajes restantes hoy');

    cy.get('[data-cy=chat-input]').type('grafo completo de 3 vertices');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.headers['x-quota-remaining']).to.eq('39');
      expect(response?.headers['x-quota-limit']).to.eq('40');
    });

    cy.get('[data-cy=chat-message-assistant]').last().should('contain', 'generado');
    cy.get('[data-cy=quota-counter]').should('have.text', '39 mensajes restantes hoy');
    cy.get('[data-cy=quota-warning]').should('not.exist');
    cy.get('[data-cy=quota-exhausted]').should('not.exist');
    cy.get('[data-cy=chat-input]').should('not.be.disabled');
  });

  it('el contador coincide con lo que reporta GET /api/assistant/quota', () => {
    cy.get('[data-cy=chat-input]').type('arbol AVL con 3 nodos');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate');

    cy.storedSession().then((s) => {
      cy.request({
        url: '/api/assistant/quota',
        headers: { Authorization: `Bearer ${s.accessToken}` },
      }).then(({ body }) => {
        expect(body.used).to.eq(1);
        expect(body.remaining).to.eq(39);
        cy.get('[data-cy=quota-counter]').should(
          'have.text',
          `${body.remaining} mensajes restantes hoy`
        );
      });
    });
  });
});
