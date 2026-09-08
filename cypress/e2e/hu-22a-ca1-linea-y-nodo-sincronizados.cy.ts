/// <reference types="cypress" />
import { runDemo } from '../support/hu19';

/**
 * HU-22a · CA-1 — Resaltado de la línea en ejecución.
 *
 *   Dado que tengo un BST renderizado y el panel muestra el pseudocódigo del recorrido inorden
 *   Cuando presiono "Paso siguiente"
 *   Entonces la línea de código del paso actual queda resaltada
 *   Y el nodo afectado en el lienzo se resalta simultáneamente
 *   Y ambos resaltados corresponden al mismo paso lógico
 */
describe('HU-22a · CA-1 Línea activa y nodo resaltado del mismo paso', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('code.ca1');
    cy.visit('/');
    runDemo('demo-tree-bst', '10, 5, 15, 3, 7');
  });

  it('cada paso siguiente mueve la línea activa y el nodo resaltado a la vez', () => {
    cy.get('[data-cy=code-panel]').should('be.visible');
    cy.get('[data-cy=code-lines] li').should('have.length', 7);
    cy.get('[data-cy=code-line-1]').should('have.attr', 'data-active', 'true').and('contain', 'inorden(nodo)');
    cy.get('[data-cy=code-lines] [data-active="true"]').should('have.length', 1);

    for (let i = 0; i < 6; i++) {
      cy.get('[data-cy=step-next]').click();
      cy.window().then((win) => {
        const w = win as Window & { __vista?: { engine: { getState(): { stepIndex: number; trace: { line: number; highlightedNodeIds: string[] }[] } } } };
        const st = w.__vista!.engine.getState();
        const step = st.trace[st.stepIndex];
        cy.get('[data-cy=code-panel]').should('have.attr', 'data-active-line', String(step.line));
        cy.get(`[data-cy=code-line-${step.line}]`).should('have.attr', 'data-active', 'true');
        cy.get('[data-cy=code-lines] [data-active="true"]').should('have.length', 1);
        if (step.highlightedNodeIds.length > 0) {
          cy.get(`[data-cy=svg-scene] [data-node-id="${step.highlightedNodeIds[0]}"]`).should('have.attr', 'data-highlighted', 'true');
        }
        cy.get('[data-cy=svg-scene] [data-highlighted="true"]').should('have.length', step.highlightedNodeIds.length);
      });
    }
    // La primera visita del inorden de [10,5,15,3,7] es 3: línea 5 (visitar) y nodo 3 a la vez.
    cy.get('[data-cy=step-counter]').invoke('text').then((t) => expect(Number(t.split('/')[0])).to.be.greaterThan(1));
  });

  it('el panel también vive en 3D y sobrevive al cambio de modo', () => {
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-panel]').invoke('attr', 'data-active-line').as('line');
    cy.get('[data-cy=mode-3d]').click();
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.get<string>('@line').then((line) => {
      cy.get('[data-cy=code-panel]').should('have.attr', 'data-active-line', line);
    });
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-lines] [data-active="true"]').should('have.length', 1);
  });
});
