/// <reference types="cypress" />
import { nodeBoxes, runDemo } from '../support/hu19';

/**
 * HU-19 · CA-5 — Animación paso a paso en el lienzo plano.
 *
 *   Dado que tengo una pila con 4 elementos
 *   Cuando ejecuto la operación "pop" paso a paso
 *   Entonces el elemento del tope se resalta antes de retirarse
 *   Y la animación permite distinguir el estado anterior del posterior
 */
describe('HU-19 · CA-5 Animación de pop en 2D', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('fam.ca5');
    cy.visit('/');
    runDemo('demo-stack-simple', '3, 42, 8, 17');
  });

  it('el tope se resalta, luego se retira dejando un rastro, y el nuevo tope queda marcado', () => {
    cy.get('[data-cy=step-counter]').should('have.text', '1 / 9');
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 4);
    cy.get('[data-cy=svg-scene] [data-highlighted="true"]').should('have.length', 0);

    // Paso 2: tope resaltado, todavía presente.
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('have.text', '2 / 9');
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 4);
    cy.get('[data-cy=svg-scene] [data-highlighted="true"]')
      .should('have.length', 1)
      .and('have.attr', 'data-label', '17')
      .and('have.attr', 'data-role', 'top');
    cy.get('[data-cy=svg-scene]').then(($svg) => {
      const top = nodeBoxes($svg).find((b) => b.highlighted)!;
      cy.wrap(top.y).as('topY');
    });

    // Paso 3: retirado. El fantasma del 17 se desvanece y el 8 pasa a ser el tope.
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=svg-scene] [data-ghost-id="n3"]').should('exist');
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 3);
    cy.get('[data-cy=svg-scene] [data-role="top"]').should('have.attr', 'data-label', '8');
    cy.get('[data-cy=svg-scene] [data-ghost-id]').should('not.exist');
    cy.get<number>('@topY').then((topY) => {
      cy.get('[data-cy=svg-scene]').should(($svg) => {
        const newTop = nodeBoxes($svg).find((b) => b.role === 'top')!;
        expect(newTop.y, 'el nuevo tope está más abajo que el retirado').to.be.greaterThan(topY);
      });
    });

    // Atrás vuelve al estado anterior con el 17 resaltado: los dos estados son distinguibles.
    cy.get('[data-cy=step-prev]').click();
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 4);
    cy.get('[data-cy=svg-scene] [data-highlighted="true"]').should('have.attr', 'data-label', '17');
  });

  it('el panel etiqueta los pasos POP y el rastro termina con la pila vacía', () => {
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-card]').should('contain', 'POP').and('contain', 'tope 17');
    for (let i = 0; i < 7; i++) cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('have.text', '9 / 9');
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 0);
    cy.get('[data-cy=step-card]').should('contain', 'vacía');
  });
});
