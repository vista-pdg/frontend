/// <reference types="cypress" />
import { generateByChat } from '../support/hu19';

/**
 * HU-19 · CA-3 — Paridad de pasos con el modo tridimensional.
 *
 *   Dado que ejecuto el recorrido "BFS" sobre el mismo grafo en modo "3D"
 *   Y que registro la secuencia de estados resultante
 *   Cuando ejecuto el mismo recorrido en modo "2D"
 *   Entonces la secuencia de estados es idéntica
 *   Y el número de pasos coincide exactamente
 */
describe('HU-19 · CA-3 Paridad de pasos BFS entre 3D y 2D', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('fam.ca3');
    cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist');
    generateByChat('grafo ciclo de 6 nodos', 6);
  });

  function runBfs(alias: string) {
    cy.intercept('POST', '/api/algorithm/steps').as(alias);
    cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
    cy.wait(`@${alias}`).its('response.body.error').should('eq', false);
    cy.get('[data-cy=step-counter]').should('be.visible');
  }

  it('el mismo grafo produce la misma secuencia de estados y el mismo número de pasos', () => {
    cy.get('[data-cy=demo-graph-simple]').click();
    cy.get('[data-cy=algo-start]').should('exist').select('V1');
    runBfs('bfs3d');
    cy.get('[data-cy=mode-3d]').should('have.attr', 'aria-pressed', 'true');
    cy.window().then((win) => {
      const w = win as Window & { __vista?: { engine: { frames(): unknown[] } } };
      cy.wrap(JSON.stringify(w.__vista!.engine.frames())).as('frames3d');
    });
    cy.get('[data-cy=step-counter]').invoke('text').as('counter3d');

    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=algo-start]').select('V1');
    runBfs('bfs2d');

    cy.get<string>('@frames3d').then((frames3d) => {
      cy.window().should((win) => {
        const w = win as Window & { __vista?: { engine: { frames(): unknown[] } } };
        const frames2d = JSON.stringify(w.__vista!.engine.frames());
        expect(frames2d, 'secuencia de estados idéntica').to.eq(frames3d);
      });
    });
    cy.get<string>('@counter3d').then((counter3d) => {
      cy.get('[data-cy=step-counter]').should('have.text', counter3d);
    });
    cy.get('@bfs3d').then((a) => {
      cy.get('@bfs2d').then((b) => {
        const A = (a as unknown as { response: { body: { steps: unknown[] } }; request: { body: unknown } });
        const B = (b as unknown as { response: { body: { steps: unknown[] } }; request: { body: unknown } });
        expect(B.response.body.steps).to.deep.equal(A.response.body.steps);
        expect(B.response.body.steps.length).to.be.greaterThan(6);
      });
    });
  });
});
