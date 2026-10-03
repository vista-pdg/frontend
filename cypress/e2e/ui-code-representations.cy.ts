/// <reference types="cypress" />
import type { StepsResponse } from '../../src/types/graph';
import { runDemo } from '../support/hu19';
import { engineState, snapshotOf } from '../support/hu18';

interface TraceInterception { response: { body: StepsResponse } }

describe('Java y pseudocódigo de solo lectura sincronizados', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then(win => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('ui.code');
    cy.visit('/');
  });

  it('Java resalta el pop actual; copiar, descargar y cambiar a 3D conservan el cuadro', () => {
    runDemo('demo-stack-simple', '3, 42, 8');
    cy.get('[data-cy=step-next]').click();
    cy.window().then(win => {
      const before = engineState(win);
      const snapshot = snapshotOf(win, '2D');
      cy.get('[data-cy=code-view-java]').click().should('have.attr', 'aria-pressed', 'true');
      cy.get('[data-cy=code-panel]').should('have.attr', 'data-language', 'java');
      cy.get('[data-cy=code-lines] [data-active=true]').should('contain', 'pila.peek()');
      cy.window().then(w => {
        expect(engineState(w)).to.deep.equal(before);
        expect(snapshotOf(w, '2D')).to.deep.equal(snapshot);
        cy.wrap(cy.stub(w.navigator.clipboard, 'writeText').resolves()).as('copy');
      });
      cy.get('[data-cy=code-copy]').click();
      cy.get('@copy').should('have.been.calledWithMatch', 'import com.cyedbooks.estructuras.stack.LinkedStack;');
      cy.get('[data-cy=code-download]').click();
      cy.readFile('cypress/downloads/VistaStackPop.java').should('contain', 'public class VistaStackPop');
      cy.get('[data-cy=step-next]').click();
      cy.get('[data-cy=code-lines] [data-active=true]').should('contain', 'pila.pop()');
      cy.get('[data-cy=var-retirados-value]').should('have.text', '[8]');
      cy.get('[data-cy=code-view-pseudocode]').click();
      cy.get('[data-cy=code-line-4]').should('have.attr', 'data-active', 'true');
      cy.get('[data-cy=code-view-java]').click();
      cy.window().then(w => {
        const afterPop = snapshotOf(w, '2D');
        cy.get('[data-cy=mode-3d]').click();
        cy.window().should(next => expect(snapshotOf(next, '3D')).to.deep.equal(afterPop));
      });
      cy.get('[data-cy=code-lines] [data-active=true]').should('contain', 'pila.pop()');
      cy.window().then(w => {
        expect(engineState(w).stepIndex).to.eq(2);
        expect(snapshotOf(w, '3D').nodeIds).to.have.length(2);
      });
    });
  });

  it('AVL distingue la dirección en rotaciones simples y dobles', () => {
    for (const values of ['3, 2, 1', '1, 2, 3', '3, 1, 2', '1, 3, 2']) {
      runDemo('demo-tree-avl', values);
      cy.get<TraceInterception>('@steps').then(({ response: { body } }) => {
        cy.get('[data-cy=code-view-java]').click();
        for (const step of body.steps!) {
          if (step.highlightType !== 'rotated') continue;
          cy.window().then(win => {
            const current = engineState(win).stepIndex;
            for (let i = current; i < step.index; i++) cy.get('[data-cy=step-next]').click();
          });
          const line = body.representations![0].lineMap[step.line!][0];
          cy.get(`[data-cy=code-line-${line}]`).should('have.attr', 'data-active', 'true')
            .and('contain', step.title.includes('Izquierda') ? 'izquierda(Nodo pivote)' : 'derecha(Nodo pivote)');
        }
      });
    }
  });

  it('el resumen inorden no inventa una línea Java ejecutada', () => {
    runDemo('demo-tree-bst', '10, 5, 15');
    cy.get('[data-cy=code-view-java]').click();
    cy.get<TraceInterception>('@steps').then(({ response: { body } }) => {
      for (let i = 1; i < body.steps!.length; i++) cy.get('[data-cy=step-next]').click();
    });
    cy.get('[data-cy=code-no-line]').should('contain', 'resumen');
    cy.get('[data-cy=code-lines] [data-active=true]').should('not.exist');
    cy.get('[data-cy=call-stack]').should('have.attr', 'data-depth', '0');
  });
});
