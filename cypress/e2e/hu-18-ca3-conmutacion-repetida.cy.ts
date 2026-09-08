/// <reference types="cypress" />
import { snapshotOf } from '../support/hu18';

/**
 * HU-18 · CA-3 — Conmutación repetida sin degradación de estado.
 *
 *   Dado que tengo un grafo con 12 nodos renderizado
 *   Cuando alterno entre los modos "2D" y "3D" cinco veces consecutivas
 *   Entonces la estructura permanece idéntica en cada conmutación
 *   Y no se acumulan nodos duplicados ni elementos huérfanos en el lienzo
 */
describe('HU-18 · CA-3 Conmutación repetida sin degradación', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca3');
    cy.intercept('POST', '/api/generate').as('generate');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=chat-input]').type('grafo ciclo de 12 nodos');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@generate').its('response.body.nodes').should('have.length', 12);
    cy.get('[data-cy=chat-toggle]').click();
  });

  it('cinco alternancias dejan exactamente 12 nodos y 12 aristas dibujados, sin huérfanos', () => {
    // La escena de three se puebla en el siguiente render: aserción reintentable.
    cy.window().should((win) => {
      expect(snapshotOf(win, '3D').nodeIds).to.have.length(12);
    });
    cy.window().then((win) => {
      const base = snapshotOf(win, '3D');
      cy.wrap([...base.nodeIds].sort()).as('nodes');
      cy.wrap([...base.edgeIds].sort()).as('edges');
    });

    for (let i = 0; i < 5; i++) {
      const target = i % 2 === 0 ? '2D' : '3D';
      const idle = target === '2D' ? '3D' : '2D';
      cy.get(`[data-cy=mode-${target.toLowerCase()}]`).click();
      cy.get(`[data-cy=canvas-${target.toLowerCase()}]`).should('exist');
      if (target === '2D') {
        cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 12);
        cy.get('[data-cy=svg-scene] [data-edge-id]').should('have.length', 12);
        cy.get('[data-cy=svg-scene]').should('have.length', 1);
      } else {
        cy.get('[data-cy=canvas-3d] canvas').should('have.length', 1);
      }
      cy.get<string[]>('@nodes').then((nodes) => {
        cy.get<string[]>('@edges').then((edges) => {
          cy.window().should((win) => {
            const active = snapshotOf(win, target);
            expect([...active.nodeIds].sort(), `nodos tras la conmutación ${i + 1}`).to.deep.equal(nodes);
            expect([...active.edgeIds].sort(), `aristas tras la conmutación ${i + 1}`).to.deep.equal(edges);
            expect(new Set(active.nodeIds).size, 'sin duplicados').to.eq(12);
            expect(snapshotOf(win, idle).nodeIds, 'el adaptador inactivo no retiene nada').to.be.empty;
          });
        });
      });
    }
  });
});
