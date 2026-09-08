/// <reference types="cypress" />

/**
 * HU-17 · CA-5 — Reinicio de la ventana diaria.
 *
 *   Dado que ayer agote mi cuota de 40 mensajes
 *   Cuando ingreso al sistema el dia siguiente despues de las 00:00
 *   Entonces mi contador de mensajes disponibles es 40
 *   Y puedo enviar mensajes con normalidad
 *
 * El salto de medianoche no se puede provocar desde el navegador y no se abre ningun atajo de
 * tiempo en la API: lo automatiza AssistantQuotaTest con un reloj desplazable. Aqui se verifica lo
 * observable de cara al usuario: que al ingresar el contador esta completo, que el instante de
 * reinicio que anuncia el servidor es la proxima medianoche en America/Bogota, y que se puede
 * enviar con normalidad.
 */
describe('HU-17 · CA-5 Reinicio de la ventana diaria', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('cuota.ca5');
  });

  it('al ingresar, el contador es 40 y puedo enviar con normalidad', () => {
    cy.intercept('POST', '/api/generate').as('generate');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-counter]').should('have.text', '40 mensajes restantes hoy');
    cy.get('[data-cy=quota-exhausted]').should('not.exist');
    cy.get('[data-cy=chat-input]').should('not.be.disabled');

    cy.get('[data-cy=chat-input]').type('grafo K3');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate').its('response.statusCode').should('eq', 200);
    cy.get('[data-cy=quota-counter]').should('have.text', '39 mensajes restantes hoy');
  });

  it('el reinicio anunciado es la proxima medianoche en America/Bogota', () => {
    cy.storedSession().then((s) => {
      cy.request({
        url: '/api/assistant/quota',
        headers: { Authorization: `Bearer ${s.accessToken}` },
      }).then(({ body }) => {
        expect(body.limit).to.eq(40);
        expect(body.remaining).to.eq(40);

        const resetsAt = new Date(body.resetsAt);
        expect(resetsAt.getTime(), 'en el futuro').to.be.greaterThan(Date.now());
        expect(resetsAt.getTime() - Date.now(), 'a menos de 24 h').to.be.lessThan(24 * 3600 * 1000);

        // Medianoche en Bogota (UTC-5, sin horario de verano) son las 05:00Z.
        expect(resetsAt.getUTCHours()).to.eq(5);
        expect(resetsAt.getUTCMinutes()).to.eq(0);
        expect(resetsAt.getUTCSeconds()).to.eq(0);
      });
    });
  });
});
