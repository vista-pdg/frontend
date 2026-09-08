/// <reference types="cypress" />

/**
 * HU-16 · CA-3 — Bloqueo de acceso anonimo al asistente.
 *
 *   Dado que no he iniciado sesion
 *   Cuando intento enviar una instruccion en lenguaje natural al asistente
 *   Entonces el sistema deniega la peticion con codigo 401
 *   Y me redirige a la pantalla de inicio de sesion
 */
describe('HU-16 · CA-3 Bloqueo de acceso anonimo al asistente', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('un visitante sin sesion ni siquiera llega al lienzo', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  it('la API rechaza la instruccion anonima con 401', () => {
    cy.request({
      method: 'POST',
      url: '/api/generate',
      body: { prompt: 'grafo completo de 3 vertices' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.code).to.eq('UNAUTHENTICATED');
    });
  });

  /**
   * El caso que el criterio describe de verdad: alguien "no autenticado" que sin embargo tiene el
   * lienzo abierto. Ocurre cuando la sesion local esta caducada o manipulada y todavia engana al
   * guard. Al enviar la instruccion, el servidor responde 401 y la aplicacion debe devolverlo al
   * inicio de sesion, no dejarle una pantalla muerta.
   */
  it('con una sesion local invalida, enviar una instruccion devuelve 401 y me lleva al login', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('vista_access_token', 'token.falso.sinfirma');
      win.localStorage.setItem(
        'vista_user',
        JSON.stringify({
          email: 'fantasma@u.icesi.edu.co',
          displayName: 'Fantasma',
          roles: ['STUDENT'],
        })
      );
    });
    cy.intercept('POST', '/api/generate').as('generate');

    cy.visit('/');
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=chat-input]').type('grafo completo de 3 vertices');
    cy.get('[data-cy=chat-send]').click();

    cy.wait('@generate').its('response.statusCode').should('eq', 401);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
    cy.get('[data-cy=welcome-screen]').should('be.visible');
    cy.storedSession().then((s) => {
      expect(s.accessToken).to.be.null;
      expect(s.user).to.be.null;
    });
  });
});
