/// <reference types="cypress" />
import { chat, nodeLabels } from '../support/hu32';

/**
 * HU-32 · CA-2 y CA-3.
 *
 *   Escenario: Cambio de una propiedad conservando el resto
 *     Dado que generé un grafo no dirigido con vértices en ciclo
 *     Cuando envío "hazlo dirigido"
 *     Entonces el lienzo muestra el mismo ciclo con las mismas etiquetas y aristas
 *     Y las aristas ahora son dirigidas
 *
 *   Escenario: Cambio de tipo de estructura empieza de cero
 *     Cuando envío "ahora una pila con 3, 42, 8"
 *     Entonces el lienzo muestra una pila con esos tres valores
 */
describe('HU-32 · CA-2/CA-3 Cambio de propiedad y de tipo', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('memoria.ca2');
    cy.visit('/');
  });

  it('«hazlo dirigido» conserva etiquetas y aristas y sólo cambia el sentido', () => {
    chat('grafo ciclo de 4 nodos');
    nodeLabels().should('deep.equal', ['V1', 'V2', 'V3', 'V4']);
    cy.get('[data-cy=svg-scene] [data-edge-id]').should('have.length', 4);
    // Sin dirigir: las aristas se pintan en el color de arista no dirigida y sin punta de flecha.
    cy.get('[data-cy=svg-scene] [data-edge-id] line').first().should('not.have.attr', 'marker-end');

    chat('hazlo dirigido', 'directed');
    nodeLabels().should('deep.equal', ['V1', 'V2', 'V3', 'V4']);
    cy.get('[data-cy=svg-scene] [data-edge-id]').should('have.length', 4);
    cy.get('[data-cy=svg-scene] [data-edge-id] line').each(($line) => {
      expect($line.attr('marker-end'), 'arista dirigida').to.contain('vista-arrow');
    });
  });

  it('nombrar otra familia empieza de cero y la sesión pasa a la nueva estructura', () => {
    chat('arbol con insercion de 10, 5, 15');
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'tree');

    chat('ahora una pila con 3, 42, 8', 'stack');
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'stack');
    nodeLabels().should('deep.equal', ['3', '42', '8']);
    cy.get('[data-cy=session-indicator]').should('have.attr', 'data-structure', 'stack');

    // Y sobre la pila el refinamiento sigue funcionando.
    chat('agrega 17', 'push');
    nodeLabels().should('deep.equal', ['3', '42', '8', '17']);
  });
});
