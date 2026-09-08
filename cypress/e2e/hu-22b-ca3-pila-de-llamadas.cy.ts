/// <reference types="cypress" />
import { runDemo } from '../support/hu19';

/**
 * HU-22b · CA-3 — Visualización de la pila de llamadas en algoritmos recursivos.
 *
 *   Dado que ejecuto el recorrido "inorden" en su versión recursiva
 *   Cuando el algoritmo entra en una llamada anidada
 *   Entonces el panel de pila de llamadas agrega un marco con sus parámetros
 *   Y al retornar de la llamada el marco correspondiente se retira de la pila
 */
describe('HU-22b · CA-3 Pila de llamadas', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('stack.ca3');
    cy.visit('/');
    runDemo('demo-tree-bst', '10, 5, 15');
  });

  it('cada llamada anidada apila un marco con su parámetro y cada retorno lo retira', () => {
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '1');
    cy.get('[data-cy=frame-1]').should('contain', 'inorden(nodo=10)').and('have.attr', 'data-top', 'true');

    // Paso 2: ¿10 es nulo? · Paso 3: inorden(5) → se apila el marco de 5.
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '2');
    cy.get('[data-cy=frame-2]').should('contain', 'inorden(nodo=5)').and('have.attr', 'data-top', 'true');
    cy.get('[data-cy=frame-1]').should('contain', 'inorden(nodo=10)').and('have.attr', 'data-top', 'false');

    // Dentro de 5: ¿5 es nulo? · inorden(nulo) → tres marcos, el tope con nulo.
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '3');
    cy.get('[data-cy=frame-3]').should('contain', 'inorden(nodo=nulo)');

    // ¿nulo es nulo? · retornar → el marco se retira: volvemos a dos.
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-panel]').should('have.attr', 'data-active-line', '3');
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '2');
    cy.get('[data-cy=frame-2]').should('contain', 'inorden(nodo=5)');
  });

  it('la pila sigue el mismo rastro en 3D y queda vacía al terminar', () => {
    cy.get('[data-cy=mode-3d]').click();
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '1');
    cy.window().then((win) => {
      const w = win as Window & { __vista?: { engine: { getState(): { trace: { callStack: unknown[] }[] } } } };
      const trace = w.__vista!.engine.getState().trace;
      const max = Math.max(...trace.map((s) => (s.callStack ?? []).length));
      expect(max, 'profundidad máxima con [10, 5, 15]').to.eq(3);
    });
    cy.get('[data-cy=step-counter]')
      .invoke('text')
      .then((t) => {
        const total = Number(t.split('/')[1]);
        for (let i = 1; i < total; i++) cy.get('[data-cy=step-next]').click();
      });
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '0');
  });
});
