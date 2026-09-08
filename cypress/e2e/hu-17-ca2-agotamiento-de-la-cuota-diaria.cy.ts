/// <reference types="cypress" />

/**
 * HU-17 · CA-2 — Agotamiento de la cuota diaria.
 *
 *   Dado que hoy he enviado 40 mensajes al asistente
 *   Cuando intento enviar el mensaje numero 41
 *   Entonces el sistema rechaza la peticion con codigo 429
 *   Y muestra "Alcanzaste tu limite diario. Se restablece a medianoche."
 *   Y no se genera ninguna llamada facturable a la API del modelo
 *   Y el lienzo de visualizacion permanece utilizable sin el asistente
 *
 * Para agotar la cuota sin 40 mensajes, el spec baja la cuota de CEDI-G1 a 2 por el endpoint de
 * administracion (que es CA-6) y la restaura al terminar. Que el 429 no invoque al modelo lo
 * demuestra AssistantQuotaTest con un contador sobre el adaptador falso.
 */
describe('HU-17 · CA-2 Agotamiento de la cuota diaria', () => {
  const LITERAL = 'Alcanzaste tu límite diario. Se restablece a medianoche.';

  before(() => cy.adminSetQuota('CEDI-G1', 2));
  after(() => cy.adminSetQuota('CEDI-G1', 40));

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('cuota.ca2');
    cy.intercept('POST', '/api/generate').as('generate');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-counter]').should('have.text', '2 mensajes restantes hoy');
  });

  function send(text: string) {
    cy.get('[data-cy=chat-input]').type(text);
    cy.get('[data-cy=chat-send]').click();
    return cy.wait('@generate');
  }

  it('el mensaje que supera la cuota responde 429 con el literal y bloquea el compositor', () => {
    send('grafo K3 uno').its('response.statusCode').should('eq', 200);
    send('grafo K3 dos').its('response.statusCode').should('eq', 200);
    cy.get('[data-cy=quota-counter]').should('have.text', '0 mensajes restantes hoy');

    // Al agotarse con el ultimo mensaje procesado, el compositor ya queda bloqueado: el siguiente
    // intento se frena en el cliente. Se comprueba tambien contra el servidor por API abajo.
    cy.get('[data-cy=quota-exhausted]').should('be.visible').and('contain', LITERAL);
    cy.get('[data-cy=chat-input]').should('be.disabled');
    cy.get('[data-cy=chat-send]').should('be.disabled');

    cy.storedSession().then((s) => {
      cy.request({
        method: 'POST',
        url: '/api/generate',
        headers: { Authorization: `Bearer ${s.accessToken}` },
        body: { prompt: 'mensaje numero 3' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(429);
        expect(res.body.code).to.eq('DAILY_QUOTA_EXCEEDED');
        expect(res.body.message).to.eq(LITERAL);
        expect(res.headers['x-quota-remaining']).to.eq('0');
        expect(res.headers['x-quota-reset']).to.be.a('string');
      });
    });
  });

  it('con la cuota agotada al entrar, el panel ya muestra el literal y el lienzo sigue utilizable', () => {
    send('grafo K3 uno');
    send('grafo K3 dos');

    // Nueva visita con la cuota ya agotada: el estado se reconstruye desde GET /api/assistant/quota.
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-exhausted]').should('be.visible').and('contain', LITERAL);
    cy.get('[data-cy=quota-counter]').should('have.text', '0 mensajes restantes hoy');

    // El lienzo no se bloquea: el canvas 3D sigue montado y el panel de algoritmos funciona sin
    // el asistente (no llama al modelo).
    cy.get('canvas').should('exist');
    cy.get('[data-cy=chat-toggle]').click(); // cierra el chat
    cy.storedSession().then((s) => {
      cy.request({
        method: 'POST',
        url: '/api/algorithm/steps',
        headers: { Authorization: `Bearer ${s.accessToken}` },
        body: { type: 'tree', subtype: 'avl', operation: 'insert', values: [3, 2, 1] },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.error).to.eq(false);
      });
    });
  });
});
