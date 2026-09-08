/// <reference types="cypress" />
import { generateByChat, goToLastStep } from '../support/hu19';
import { teacherEvents } from '../support/hu21';

/**
 * HU-21 · CA-2 — Ejecución de un algoritmo.
 *
 *   Dado que un estudiante ejecuta el recorrido "BFS" sobre un grafo no dirigido
 *   Cuando el recorrido se completa paso a paso
 *   Entonces se registra un evento con algoritmo "BFS"
 *   Y tipo_estructura "grafo_no_dirigido"
 *   Y el número de pasos ejecutados
 *
 * El registro tiene dos mitades: el servidor anota los pasos que entregó al lanzar el recorrido, y
 * el cliente anota los que el estudiante recorrió de verdad al llegar al final. Se comprueban las
 * dos, porque «se completa paso a paso» es un hecho que sólo el navegador conoce.
 */
describe('HU-21 · CA-2 Ejecución de un algoritmo', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('analitica.ca2');
    cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist');
    generateByChat('grafo ciclo de 6 nodos', 6);
  });

  it('lanzar BFS registra el algoritmo, el tipo de estructura y los pasos', () => {
    cy.get('[data-cy=demo-graph-simple]').click();
    cy.get('[data-cy=algo-start]').should('exist').select('V1');
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
    cy.wait('@steps').its('response.body.error').should('eq', false);

    teacherEvents().then((events) => {
      const ultimo = events[0];
      expect(ultimo.algorithm, 'en mayúsculas, como pide el criterio').to.eq('BFS');
      expect(ultimo.structureType).to.eq('grafo_no_dirigido');
      expect(ultimo.source).to.eq('catalogo_algoritmos');
      expect(ultimo.stepCount).to.be.a('number').and.be.greaterThan(0);
    });
  });

  it('llegar al último paso deja un evento con los pasos que el estudiante recorrió', () => {
    cy.get('[data-cy=demo-graph-simple]').click();
    cy.get('[data-cy=algo-start]').should('exist').select('V1');
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    cy.intercept('POST', '/api/assistant/events').as('completed');
    cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
    cy.wait('@steps').its('response.body.error').should('eq', false);

    goToLastStep();
    cy.wait('@completed').its('response.statusCode').should('eq', 202);

    cy.get('[data-cy=step-counter]')
      .invoke('text')
      .then((t) => {
        const total = Number(t.split('/')[1].trim());
        teacherEvents().then((events) => {
          const ultimo = events[0];
          expect(ultimo.algorithm).to.eq('BFS');
          expect(ultimo.structureType).to.eq('grafo_no_dirigido');
          expect(ultimo.stepCount, 'los pasos realmente recorridos').to.eq(total);
        });
      });
  });

  it('ir y volver del último paso no cuenta el recorrido dos veces', () => {
    cy.get('[data-cy=demo-graph-simple]').click();
    cy.get('[data-cy=algo-start]').should('exist').select('V1');
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
    cy.wait('@steps').its('response.body.error').should('eq', false);

    let enviados = 0;
    cy.intercept('POST', '/api/assistant/events', (req) => {
      enviados += 1;
      req.continue();
    }).as('completed');

    goToLastStep();
    cy.wait('@completed');
    cy.get('[data-cy=step-prev]').click();
    cy.get('[data-cy=step-next]').click();

    cy.get('[data-cy=step-counter]')
      .should('be.visible')
      .then(() => {
        expect(enviados, 'un solo evento por rastro').to.eq(1);
      });
  });
});
