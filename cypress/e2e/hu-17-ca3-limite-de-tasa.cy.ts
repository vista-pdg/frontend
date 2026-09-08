/// <reference types="cypress" />

/**
 * HU-17 · CA-3 — Superacion del limite de tasa por rafaga.
 *
 *   Dado que he enviado 5 mensajes en los ultimos 30 segundos
 *   Cuando envio un sexto mensaje dentro del mismo minuto
 *   Entonces el sistema rechaza la peticion con codigo 429
 *   Y la respuesta incluye la cabecera "Retry-After" con los segundos restantes
 *   Y la interfaz deshabilita el boton de envio mostrando una cuenta regresiva
 */
describe('HU-17 · CA-3 Limite de tasa por rafaga', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('cuota.ca3');
  });

  it('el 6.º mensaje en un minuto responde 429 con Retry-After y el boton pasa a cuenta regresiva', () => {
    // Los cinco primeros por API, en pocos segundos: el limite es del servidor y por usuario.
    cy.storedSession().then((s) => {
      const auth = { Authorization: `Bearer ${s.accessToken}` };
      for (let i = 1; i <= 5; i++) {
        cy.request({ method: 'POST', url: '/api/generate', headers: auth, body: { prompt: `K3 ${i}` } })
          .its('status')
          .should('eq', 200);
      }
    });

    cy.intercept('POST', '/api/generate').as('generate');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-counter]').should('have.text', '35 mensajes restantes hoy');

    cy.get('[data-cy=chat-input]').type('sexto mensaje');
    cy.get('[data-cy=chat-send]').click();

    cy.wait('@generate').then(({ response }) => {
      expect(response?.statusCode).to.eq(429);
      expect(response?.body.code).to.eq('RATE_LIMITED');
      const retryAfter = Number(response?.headers['retry-after']);
      expect(retryAfter, 'Retry-After en segundos').to.be.within(1, 60);
    });

    cy.get('[data-cy=rate-limited]').should('be.visible').and('contain', 'Demasiados mensajes seguidos');
    cy.get('[data-cy=chat-send]').should('be.disabled');
    cy.get('[data-cy=chat-input]').should('be.disabled');

    // Cuenta regresiva: muestra segundos (1..60) y decrece. Aserciones reintentables: el valor
    // exacto depende del reloj, lo que se fija es el rango y la direccion.
    cy.get('[data-cy=chat-send-countdown]').should(($s) => {
      expect(parseInt($s.text(), 10)).to.be.within(1, 60);
    });
    cy.get('[data-cy=chat-send-countdown]')
      .invoke('text')
      .then((t1) => {
        const first = parseInt(t1, 10);
        cy.wait(2100);
        cy.get('[data-cy=chat-send-countdown]').should(($s) => {
          expect(parseInt($s.text(), 10)).to.be.lessThan(first);
        });
      });

    // El contador diario no se toco: la rafaga no consume cuota.
    cy.get('[data-cy=quota-counter]').should('have.text', '35 mensajes restantes hoy');
  });

  it('el limite es por usuario: otro estudiante no hereda la rafaga', () => {
    cy.storedSession().then((s) => {
      const auth = { Authorization: `Bearer ${s.accessToken}` };
      for (let i = 1; i <= 5; i++) {
        cy.request({ method: 'POST', url: '/api/generate', headers: auth, body: { prompt: `K3 ${i}` } });
      }
      cy.request({
        method: 'POST',
        url: '/api/generate',
        headers: auth,
        body: { prompt: 'sexto' },
        failOnStatusCode: false,
      })
        .its('status')
        .should('eq', 429);
    });

    cy.clearLocalStorage();
    cy.registerStudentByApi('cuota.ca3.otro');
    cy.storedSession().then((s) => {
      cy.request({
        method: 'POST',
        url: '/api/generate',
        headers: { Authorization: `Bearer ${s.accessToken}` },
        body: { prompt: 'primero de otro' },
      })
        .its('status')
        .should('eq', 200);
    });
  });
});
