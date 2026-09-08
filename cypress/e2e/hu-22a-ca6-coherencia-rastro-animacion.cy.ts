/// <reference types="cypress" />
import { goToLastStep, runDemo } from '../support/hu19';

/**
 * HU-22a · CA-6 — Coherencia entre el rastro de ejecución y la animación.
 *
 *   Dado que ejecuto un algoritmo completo hasta su terminación
 *   Cuando comparo el número de pasos del panel de código con los estados renderizados
 *   Entonces ambos coinciden exactamente
 *   Y el estado final de la estructura corresponde al resultado esperado del algoritmo
 */
describe('HU-22a · CA-6 Coherencia entre rastro y animación', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('code.ca6');
    cy.visit('/');
  });

  it('el contador del panel de código, el del overlay y los cuadros del motor coinciden; la salida final está ordenada', () => {
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    runDemo('demo-tree-bst', '8, 3, 10, 1, 6, 14, 4, 7');
    cy.get('@steps').its('response.body').then((body: { steps: { line: number }[]; code: string[] }) => {
      expect(body.code).to.have.length(7);
      expect(body.steps.every((s) => s.line === null || (s.line >= 1 && s.line <= 7))).to.eq(true);
      cy.get('[data-cy=code-step-counter]').should('have.text', `1 / ${body.steps.length}`);
      cy.get('[data-cy=step-counter]').should('have.text', `1 / ${body.steps.length}`);
      cy.window().should((win) => {
        const w = win as Window & { __vista?: { engine: { frames(): unknown[] } } };
        expect(w.__vista!.engine.frames()).to.have.length(body.steps.length);
      });
      goToLastStep();
      cy.get('[data-cy=code-step-counter]').should('have.text', `${body.steps.length} / ${body.steps.length}`);
    });
    // Estado final: todos los nodos visitados y la secuencia inorden ordenada.
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 8);
    cy.get('[data-cy=svg-scene] [aria-label*="visitado"]').should('have.length', 8);
    cy.get('[data-cy=step-card]').should('contain', 'Secuencia inorden: [1, 3, 4, 6, 7, 8, 10, 14]');
  });

  it('el inorden sobre el árbol que dejó el AVL usa ese árbol (no construye otro)', () => {
    runDemo('demo-tree-avl', '10, 5, 15, 3, 7');
    goToLastStep();
    cy.get('[data-cy=algo-item-tree-bst-inorder]').click();
    cy.intercept('POST', '/api/algorithm/steps').as('inorder');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@inorder').then(({ request, response }) => {
      expect(request.body.nodes).to.have.length(5);
      expect(response?.body.steps.at(-1).description).to.contain('[3, 5, 7, 10, 15]');
    });
  });
});
