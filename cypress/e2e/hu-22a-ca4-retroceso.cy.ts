/// <reference types="cypress" />
import { runDemo } from '../support/hu19';

/**
 * HU-22a · CA-4 — Retroceso de la ejecución.
 *
 *   Dado que he avanzado hasta el paso 7
 *   Cuando presiono el control "Paso anterior"
 *   Entonces el lienzo y el resaltado de línea regresan al estado del paso 6
 *   Y ningún estado intermedio queda inconsistente
 */
describe('HU-22a · CA-4 Retroceso de la ejecución', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('code.ca4');
    cy.visit('/');
    runDemo('demo-tree-bst', '10, 5, 15, 3, 7, 12, 20');
  });

  function snapshotUi() {
    return cy.get('[data-cy=svg-scene]').then(($svg) => {
      const nodes = $svg
        .find('[data-node-id]')
        .toArray()
        .map((el) => `${el.getAttribute('data-node-id')}:${el.getAttribute('data-highlighted')}:${el.getAttribute('aria-label')}`)
        .join('|');
      const line = Cypress.$('[data-cy=code-panel]').attr('data-active-line');
      const counter = Cypress.$('[data-cy=step-counter]').text();
      return { nodes, line, counter };
    });
  }

  it('desde el paso 7, "Anterior" reproduce exactamente el paso 6', () => {
    for (let i = 0; i < 5; i++) cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('contain', '6 /');
    snapshotUi().as('step6');

    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('contain', '7 /');
    snapshotUi().then((s7) => {
      cy.get<{ nodes: string; line: string; counter: string }>('@step6').then((s6) => {
        expect(`${s7.nodes}${s7.line}`).to.not.eq(`${s6.nodes}${s6.line}`);
      });
    });

    cy.get('[data-cy=step-prev]').click();
    cy.get('[data-cy=step-counter]').should('contain', '6 /');
    snapshotUi().then((back) => {
      cy.get<{ nodes: string; line: string; counter: string }>('@step6').then((s6) => {
        expect(back).to.deep.equal(s6);
      });
    });
    cy.get('[data-cy=code-lines] [data-active="true"]').should('have.length', 1);
  });

  it('retroceder hasta el inicio y volver a avanzar produce la misma secuencia', () => {
    const lines: string[] = [];
    for (let i = 0; i < 4; i++) {
      cy.get('[data-cy=step-next]').click();
      cy.get('[data-cy=code-panel]').invoke('attr', 'data-active-line').then((l) => lines.push(l!));
    }
    for (let i = 0; i < 4; i++) cy.get('[data-cy=step-prev]').click();
    cy.get('[data-cy=step-counter]').should('contain', '1 /');
    cy.get('[data-cy=code-line-1]').should('have.attr', 'data-active', 'true');
    for (let i = 0; i < 4; i++) {
      cy.get('[data-cy=step-next]').click();
      cy.get('[data-cy=code-panel]').invoke('attr', 'data-active-line').then((l) => expect(l).to.eq(lines[i]));
    }
  });
});
