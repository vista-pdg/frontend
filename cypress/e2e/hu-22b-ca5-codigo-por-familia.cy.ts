/// <reference types="cypress" />
import { generateByChat, runDemo } from '../support/hu19';

/**
 * HU-22b · CA-5 — Cobertura mínima de algoritmos por familia.
 *
 *   Dado que el syllabus contempla grafos, árboles, pilas y colas
 *   Cuando consulto el catálogo de algoritmos disponibles
 *   Entonces existe al menos un algoritmo ejecutable paso a paso por cada familia
 *   Y cada uno dispone de su código genérico visible
 */
describe('HU-22b · CA-5 Código genérico visible en las cuatro familias', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('code.ca5');
    cy.visit('/');
  });

  it('el catálogo tiene las cuatro familias y cada demo abre su panel de código con variables', () => {
    cy.get('[data-cy=algorithm-toggle]').click();
    for (const fam of ['graph', 'tree', 'stack', 'queue']) cy.get(`[data-cy=algo-family-${fam}]`).should('exist');
    cy.get('[data-cy=algorithm-toggle]').click();

    // Pila
    runDemo('demo-stack-simple', '3, 42, 8, 17');
    cy.get('[data-cy=code-panel]').should('be.visible');
    cy.get('[data-cy=code-lines] li').should('have.length', 6);
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-line-3]').should('have.attr', 'data-active', 'true');
    cy.get('[data-cy=var-tope-value]').should('have.text', '17');
    cy.get('[data-cy=call-stack]').should('not.exist');

    // Cola
    runDemo('demo-queue-simple', '5, 9, 1');
    cy.get('[data-cy=code-lines] li').should('have.length', 6);
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=var-frente-value]').should('have.text', '5');

    // Árbol (inorden) con pila de llamadas
    runDemo('demo-tree-bst', '10, 5, 15');
    cy.get('[data-cy=code-lines] li').should('have.length', 7);
    cy.get('[data-cy=call-stack]').should('exist');

    // Grafo (BFS sobre el grafo del lienzo)
    cy.get('[data-cy=algorithm-toggle]').click();
    generateByChat('grafo ciclo de 5 nodos', 5);
    cy.get('[data-cy=demo-graph-simple]').click();
    cy.intercept('POST', '/api/algorithm/steps').as('bfs');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@bfs').its('response.body.code').should('have.length', 8);
    cy.get('[data-cy=code-lines] li').should('have.length', 8);
    cy.get('[data-cy=code-line-2]').should('have.attr', 'data-active', 'true');
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-line-5]').should('have.attr', 'data-active', 'true');
    cy.get('[data-cy=var-u-value]').should('have.text', 'V1');
    cy.get('[data-cy=var-orden-value]').should('have.text', '[V1]');
  });

  it('el AVL, no instrumentado, sigue ejecutándose sin panel de código', () => {
    runDemo('demo-tree-avl', '10, 5, 3');
    cy.get('[data-cy=step-counter]').should('be.visible');
    cy.get('[data-cy=code-panel]').should('not.exist');
  });
});
