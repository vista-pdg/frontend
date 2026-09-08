/// <reference types="cypress" />
/**
 * Regresión: el campo del chat conserva lo que se escribe mientras el panel se repinta.
 *
 * <p>No cubre un criterio de aceptación, guarda un arreglo. Al llegar una respuesta el panel hace
 * mucho a la vez —añade el mensaje, renueva la sesión, repinta la cuenta atrás— y quien empieza a
 * escribir la siguiente instrucción en ese instante perdía teclas: el campo estaba gobernado por el
 * estado de React y cada repintado lo devolvía al último valor confirmado. Se descubrió porque las
 * pruebas de la HU-21 acababan enviando una instrucción distinta de la que decían.
 *
 * <p>Aquí se escribe deliberadamente rápido y sin reintentos, que es lo que la hacía fallar.
 */
describe('Regresión · el campo del chat no pierde teclas', () => {
  const LARGO = 'bueno, hazme entonces un grafo no dirigido con seis nodos y sus aristas';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('fix.chat');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=quota-counter]').should('be.visible');
  });

  it('conserva cada instrucción al encadenar tres peticiones rechazadas', () => {
    // Éste es el caso exacto que lo destapó: tras un rechazo, el panel repinta y la siguiente
    // instrucción se escribía a medias. Se comprueba lo escrito antes de enviarlo, porque enviar
    // otra cosa es precisamente el fallo.
    const rechazos = [
      'quiero un árbol rojinegro',
      'bueno, hazme un rojo-negro entonces',
      'vale, un trie con las palabras del curso',
    ];
    rechazos.forEach((prompt, i) => {
      cy.intercept('POST', '/api/generate').as(`rechazo${i}`);
      cy.get('[data-cy=chat-input]').should('not.be.disabled').clear().type(prompt);
      cy.get('[data-cy=chat-input]').should('have.value', prompt);
      cy.get('[data-cy=chat-send]').should('not.be.disabled').click();
      cy.wait(`@rechazo${i}`).its('response.statusCode').should('eq', 400);
    });
    cy.get('[data-cy=chat-message-error]').should('have.length.at.least', 3);
  });

  it('conserva el texto escrito nada más recibir una respuesta', () => {
    cy.intercept('POST', '/api/generate').as('primera');
    cy.get('[data-cy=chat-input]').type('crea una pila con 3, 42, 8');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@primera');

    // Sin esperar a que se asiente nada: es justo el instante en el que se perdían teclas.
    cy.get('[data-cy=chat-input]').should('not.be.disabled').type(LARGO);
    cy.get('[data-cy=chat-input]').should('have.value', LARGO);
  });

  it('conserva el texto mientras la conversación crece por debajo', () => {
    cy.intercept('POST', '/api/generate').as('gen');
    for (const prompt of ['crea una cola con 5, 9, 1', 'crea una pila con 2, 4']) {
      cy.get('[data-cy=chat-input]').should('not.be.disabled').clear().type(prompt);
      cy.get('[data-cy=chat-send]').click();
      cy.wait('@gen');
    }

    cy.get('[data-cy=chat-input]').should('not.be.disabled').type(LARGO);
    cy.get('[data-cy=chat-input]').should('have.value', LARGO);
  });

  it('una sugerencia rellena el campo y se puede seguir escribiendo detrás', () => {
    cy.get('[data-cy=chat-suggestion]').first().click();
    cy.get('[data-cy=chat-input]')
      .invoke('val')
      .should((v) => expect(String(v).length).to.be.greaterThan(0));
    cy.get('[data-cy=chat-input]').type(' y sus aristas');
    cy.get('[data-cy=chat-input]')
      .invoke('val')
      .should((v) => expect(String(v)).to.contain(' y sus aristas'));
    cy.get('[data-cy=chat-send]').should('not.be.disabled');
  });

  it('el botón de enviar sigue el contenido real del campo', () => {
    cy.get('[data-cy=chat-send]').should('be.disabled');
    cy.get('[data-cy=chat-input]').type('grafo');
    cy.get('[data-cy=chat-send]').should('not.be.disabled');
    cy.get('[data-cy=chat-input]').clear();
    cy.get('[data-cy=chat-send]').should('be.disabled');
    cy.get('[data-cy=chat-input]').type('   ');
    cy.get('[data-cy=chat-send]').should('be.disabled');
  });
});
