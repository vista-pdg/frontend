/// <reference types="cypress" />
import { loadAvlDemo } from '../support/hu18';

/**
 * HU-18 · CA-4 — Independencia del núcleo respecto del renderizador.
 *
 *   Dado que ejecuto la suite de pruebas unitarias del motor de estructuras y algoritmos
 *   Cuando ningún adaptador de renderizado está registrado
 *   Entonces todas las pruebas del núcleo pasan
 *   Y el motor produce el mismo rastro de pasos que con un adaptador activo
 *
 * La suite del núcleo (Vitest, `src/core/__tests__`) corre en Node sin ningún adaptador y compara
 * el rastro de estados con y sin adaptador; es la evidencia principal de este criterio y forma
 * parte de CI. Aquí se comprueba la mitad que sí es de extremo a extremo: el rastro que sirve el
 * backend no depende del modo con que el cliente lo pide.
 */
describe('HU-18 · CA-4 Independencia del núcleo', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('modo.ca4');
  });

  it('el rastro de pasos es idéntico pedido en 2D y en 3D', () => {
    cy.storedSession().then((s) => {
      const body = { type: 'tree', subtype: 'avl', operation: 'insert', values: [10, 5, 2, 8, 15, 12, 20, 1] };
      const req = (mode: string) =>
        cy.request({
          method: 'POST',
          url: '/api/algorithm/steps',
          headers: { Authorization: `Bearer ${s.accessToken}`, 'X-Visualization-Mode': mode },
          body,
        });
      req('3D').then((a) => {
        req('2D').then((b) => {
          expect(a.body.error).to.eq(false);
          expect(b.body.steps).to.deep.equal(a.body.steps);
          expect(a.body.steps.length).to.be.greaterThan(8);
        });
      });
    });
  });

  it('el rastro cargado en el motor es el mismo con el adaptador 2D y con el 3D activos', () => {
    cy.visit('/');
    loadAvlDemo('10, 5, 2, 8, 15, 12, 20, 1');
    cy.window().then((win) => {
      const w = win as Window & { __vista?: { engine: { frames(): unknown[]; setMode(m: string): boolean } } };
      const in3d = JSON.stringify(w.__vista!.engine.frames());
      w.__vista!.engine.setMode('2D');
      const in2d = JSON.stringify(w.__vista!.engine.frames());
      expect(in2d).to.eq(in3d);
    });
    cy.get('[data-cy=canvas-2d]').should('exist');
  });
});
