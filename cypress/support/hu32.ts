/// <reference types="cypress" />

/**
 * Utilidades de la HU-32 (memoria conversacional). El chat se deja abierto entre instrucciones:
 * lo que se comprueba —el indicador de sesión y el refinamiento sucesivo— vive ahí.
 */

/**
 * Abre el chat si está cerrado. Se mira `data-open` del panel y no la visibilidad del campo: el
 * panel cerrado mide 0 de ancho pero jQuery sigue considerando visible al textarea de dentro.
 */
export function openChat() {
  cy.get('[data-cy=chat-panel]').then(($p) => {
    if ($p.attr('data-open') !== 'true') cy.get('[data-cy=chat-toggle]').click();
  });
  cy.get('[data-cy=chat-panel]').should('have.attr', 'data-open', 'true');
}

/** Envía una instrucción y espera la respuesta del asistente. */
export function chat(prompt: string, alias = 'generate') {
  openChat();
  cy.intercept('POST', '/api/generate').as(alias);
  cy.get('[data-cy=chat-input]').clear().type(prompt);
  cy.get('[data-cy=chat-send]').click();
  cy.wait(`@${alias}`).its('response.statusCode').should('eq', 200);
}

/** Etiquetas de los nodos dibujados en el lienzo 2D, en el orden del DOM. */
export function nodeLabels(): Cypress.Chainable<string[]> {
  return cy
    .get('[data-cy=svg-scene] [data-node-id]')
    .then(($n) => $n.toArray().map((el) => el.getAttribute('data-label') ?? ''));
}

/** Estado de la sesión leído de la API con la sesión del navegador. */
export function sessionStatus() {
  return cy.storedSession().then((s) =>
    cy
      .request({
        url: '/api/assistant/session',
        headers: { Authorization: `Bearer ${s.accessToken}` },
      })
      .its('body')
  );
}
