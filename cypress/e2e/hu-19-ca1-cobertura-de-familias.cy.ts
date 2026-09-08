/// <reference types="cypress" />
import { expectNoOverlaps, generateByChat, goToLastStep, nodeBoxes, runDemo } from '../support/hu19';

/**
 * HU-19 · CA-1 — Cobertura de las familias del syllabus.
 *
 *   Cuando solicito sucesivamente un grafo, un árbol, una pila y una cola
 *   Entonces cada estructura se renderiza correctamente en el lienzo 2D
 *   Y sus nodos, aristas y valores son legibles sin superposiciones
 */
describe('HU-19 · CA-1 Cobertura de las familias en 2D', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('fam.ca1');
    cy.visit('/');
    cy.get('[data-cy=canvas-2d]').should('exist');
  });

  it('grafo, árbol, pila y cola se dibujan en el plano sin solapes y con sus valores', () => {
    // Grafo (ciclo de 8) por el asistente: disposición de fuerzas.
    generateByChat('grafo ciclo de 8 nodos', 8);
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'force');
    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const boxes = nodeBoxes($svg);
      expect(boxes).to.have.length(8);
      expectNoOverlaps(boxes);
      expect(boxes.map((b) => b.label)).to.include.members(['V1', 'V8']);
    });
    cy.get('[data-cy=svg-scene] [data-edge-id]').should('have.length', 8);

    // Árbol: la demo AVL (el asistente falso sólo produce grafos).
    runDemo('demo-tree-avl', '10, 5, 15, 3, 7, 12, 20');
    goToLastStep();
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'tree');
    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const boxes = nodeBoxes($svg);
      expect(boxes).to.have.length(7);
      expectNoOverlaps(boxes);
    });

    // Pila por el asistente.
    cy.get('[data-cy=algorithm-toggle]').click();
    generateByChat('pila con 3, 42, 8, 17', 4);
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'stack');
    cy.get('[data-cy=svg-scene] [data-role="top"]').should('have.attr', 'data-label', '17');
    cy.get('[data-cy=svg-scene] [data-role="bottom"]').should('have.attr', 'data-label', '3');
    cy.get('[data-cy=svg-scene] [data-role-label="top"]').should('contain.text', 'tope');
    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const boxes = nodeBoxes($svg);
      expect(boxes).to.have.length(4);
      expectNoOverlaps(boxes);
      const top = boxes.find((b) => b.role === 'top')!;
      const bottom = boxes.find((b) => b.role === 'bottom')!;
      expect(top.y, 'el tope arriba').to.be.lessThan(bottom.y);
      expect(new Set(boxes.map((b) => b.x)).size, 'una sola columna').to.eq(1);
    });

    // Cola por el asistente.
    generateByChat('cola con 5, 9, 1, 14', 4);
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'queue');
    cy.get('[data-cy=svg-scene] [data-role="front"]').should('have.attr', 'data-label', '5');
    cy.get('[data-cy=svg-scene] [data-role="rear"]').should('have.attr', 'data-label', '14');
    cy.get('[data-cy=svg-scene] [data-edge-id]').should('have.length', 3);
    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const boxes = nodeBoxes($svg);
      expectNoOverlaps(boxes);
      const front = boxes.find((b) => b.role === 'front')!;
      const rear = boxes.find((b) => b.role === 'rear')!;
      expect(front.x, 'el frente a la izquierda').to.be.lessThan(rear.x);
      expect(new Set(boxes.map((b) => b.y)).size, 'una sola fila').to.eq(1);
    });
  });
});
