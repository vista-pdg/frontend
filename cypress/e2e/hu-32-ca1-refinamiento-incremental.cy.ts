/// <reference types="cypress" />
import { chat, nodeLabels, sessionStatus } from '../support/hu32';

/**
 * HU-32 · CA-1 — Refinamiento incremental de una estructura.
 *
 *   Dado que generé un árbol BST con inserción de 1, 2, 3, 5, 6
 *   Cuando envío "ahora inserta el 7"
 *   Entonces el lienzo muestra un BST con los nodos 1, 2, 3, 5, 6 y 7
 *   Y el 7 queda como hijo derecho del 6
 *   Y no tuve que volver a enumerar los valores anteriores
 */
describe('HU-32 · CA-1 Refinamiento incremental', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('memoria.ca1');
    cy.visit('/');
  });

  it('«ahora inserta el 7» añade el nodo sin repetir la descripción', () => {
    chat('arbol con insercion de 1, 2, 3, 5, 6');
    nodeLabels().should('deep.equal', ['1', '2', '3', '5', '6']);
    cy.get('[data-cy=session-indicator]')
      .should('be.visible')
      .and('contain', 'Sesión activa')
      .and('have.attr', 'data-structure', 'tree');

    chat('ahora inserta el 7', 'refine');
    nodeLabels().should('deep.equal', ['1', '2', '3', '5', '6', '7']);

    // El 7 cuelga del 6, que es lo que un BST hace con la escalera 1-2-3-5-6: un nivel más abajo
    // y a la derecha. Se lee de la disposición, que es lo que el estudiante ve.
    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const at = (label: string) => {
        const el = $svg.find(`[data-node-id][data-label="${label}"]`)[0];
        return { x: Number(el.getAttribute('data-x')), y: Number(el.getAttribute('data-y')) };
      };
      const six = at('6');
      const seven = at('7');
      expect(seven.y, 'un nivel por debajo del 6').to.be.greaterThan(six.y);
      expect(seven.x, 'a la derecha del 6').to.be.greaterThan(six.x);
    });
    // Y el mensaje que se envió fue sólo el refinamiento: el contexto lo puso el servidor.
    cy.get('@refine').its('request.body.prompt').should('eq', 'ahora inserta el 7');
  });

  it('los refinamientos se encadenan y la sesión guarda el último estado', () => {
    chat('arbol con insercion de 10, 5, 15');
    chat('ahora inserta el 3', 'r1');
    chat('agrega el 20', 'r2');
    nodeLabels().should('deep.equal', ['10', '5', '3', '15', '20']);
    sessionStatus().should((s: { active: boolean; structureType: string }) => {
      expect(s.active).to.eq(true);
      expect(s.structureType).to.eq('tree');
    });
  });

  it('sin estructura vigente, un refinamiento se interpreta como estructura nueva', () => {
    chat('inserta el 9');
    // No hay nada previo que refinar: el asistente responde con una estructura desde cero.
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length.at.least', 1);
    nodeLabels().should('not.include', '9');
    cy.get('[data-cy=chat-message-error]').should('not.exist');
  });
});
