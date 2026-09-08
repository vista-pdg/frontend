/// <reference types="cypress" />
import { engineState, loadAvlDemo, snapshotOf } from '../support/hu18';

/**
 * HU-18 · CA-1 — Conmutación conservando íntegramente la estructura.
 *
 *   Dado que estoy en el modo "3D" con un árbol binario renderizado
 *   Cuando selecciono el modo de visualización "2D"
 *   Entonces la misma estructura se renderiza en el nuevo modo
 *   Y conserva los mismos nodos, aristas y valores
 *   Y no se pierde ningún elemento de la estructura
 */
describe('HU-18 · CA-1 Conmutación conservando la estructura', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca1');
    cy.visit('/');
    loadAvlDemo('10, 5, 15, 3, 7, 12, 20');
    // Último paso: los siete nodos en pantalla.
    cy.get('[data-cy=step-counter]')
      .invoke('text')
      .then((t) => {
        const total = Number(t.split('/')[1]);
        for (let i = 1; i < total; i++) cy.get('[data-cy=step-next]').click();
      });
  });

  it('de 3D a 2D: mismos nodos, aristas y etiquetas; el 3D queda vacío', () => {
    cy.get('[data-cy=mode-3d]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=canvas-3d]').should('exist');

    cy.window().then((win) => {
      const before = snapshotOf(win, '3D');
      expect(before.nodeIds).to.have.length(7);
      expect(before.edgeIds).to.have.length(6);
      cy.wrap(before).as('before');
    });

    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=mode-2d]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=canvas-3d]').should('not.exist');
    cy.get('[data-cy=svg-scene] [data-node-id]').should('have.length', 7);
    cy.get('[data-cy=svg-scene] [data-edge-id]').should('have.length', 6);

    cy.get<ReturnType<typeof snapshotOf>>('@before').then((before) => {
      cy.window().then((win) => {
        const after = snapshotOf(win, '2D');
        expect([...after.nodeIds].sort()).to.deep.equal([...before.nodeIds].sort());
        expect([...after.edgeIds].sort()).to.deep.equal([...before.edgeIds].sort());
        expect(after.labels).to.deep.equal(before.labels);
        expect(snapshotOf(win, '3D').nodeIds, 'el adaptador saliente se limpió').to.be.empty;
        expect(engineState(win).structure.nodes).to.have.length(7);
      });
    });

    // Los valores se leen en el lienzo 2D, no sólo en el modelo.
    for (const v of ['10', '5', '15', '3', '7', '12', '20']) {
      cy.get(`[data-cy=svg-scene] [data-node-id="node-${v}"]`).should('contain.text', v);
    }
  });

  it('y de vuelta a 3D sin perder nada', () => {
    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    cy.get('[data-cy=mode-3d]').click();
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.window().should((win) => {
      const s = snapshotOf(win, '3D');
      expect(s.nodeIds).to.have.length(7);
      expect(s.edgeIds).to.have.length(6);
      expect(snapshotOf(win, '2D').nodeIds).to.be.empty;
    });
  });
});
