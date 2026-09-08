/// <reference types="cypress" />
import { runDemo } from '../support/hu19';

/**
 * HU-22b · CA-2 — Inspección del estado de las variables.
 *
 *   Dado que estoy en el paso 4 de la ejecución
 *   Cuando observo el panel de estado
 *   Entonces se muestran los valores vigentes de las variables del algoritmo
 *   Y se muestra el nodo actualmente apuntado
 */
describe('HU-22b · CA-2 Inspector de variables', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('vars.ca2');
    cy.visit('/');
    runDemo('demo-tree-bst', '10, 5, 15, 3, 7');
  });

  it('en el paso 4 el panel muestra las variables vigentes y el nodo apuntado', () => {
    for (let i = 0; i < 3; i++) cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-counter]').should('contain', '4 /');
    cy.get('[data-cy=code-variables]').should('be.visible');
    cy.get('[data-cy=var-nodo]').should('exist');
    cy.get('[data-cy=var-salida]').should('exist');
    cy.window().then((win) => {
      const w = win as Window & { __vista?: { engine: { getState(): { stepIndex: number; trace: { variables: Record<string, string>; highlightedNodeIds: string[] }[] } } } };
      const st = w.__vista!.engine.getState();
      const step = st.trace[st.stepIndex];
      for (const [k, v] of Object.entries(step.variables)) {
        cy.get(`[data-cy=var-${k}-value]`).should('have.text', v);
      }
      if (step.highlightedNodeIds.length > 0) {
        cy.get('[data-cy=code-pointed-node]').should('contain', step.highlightedNodeIds[0].replace(/^node-/, ''));
        cy.get(`[data-cy=svg-scene] [data-node-id="${step.highlightedNodeIds[0]}"]`).should('have.attr', 'data-highlighted', 'true');
      }
    });
  });

  it('la salida crece con cada visita y al final lista la secuencia ordenada', () => {
    cy.get('[data-cy=var-salida-value]').should('have.text', '[]');
    cy.get('[data-cy=step-counter]')
      .invoke('text')
      .then((t) => {
        const total = Number(t.split('/')[1]);
        for (let i = 1; i < total; i++) cy.get('[data-cy=step-next]').click();
      });
    cy.get('[data-cy=var-salida-value]').should('have.text', '[3, 5, 7, 10, 15]');
  });
});
