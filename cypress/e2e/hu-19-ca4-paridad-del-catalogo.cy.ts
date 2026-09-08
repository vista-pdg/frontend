/// <reference types="cypress" />
import { runDemo } from '../support/hu19';

/**
 * HU-19 · CA-4 — Paridad del catálogo de algoritmos.
 *
 *   Cuando consulto los algoritmos disponibles en modo "2D"
 *   Entonces la lista coincide con la disponible en modo "3D"
 *   Y todo algoritmo ejecutable en un modo lo es también en el otro
 */
describe('HU-19 · CA-4 Paridad del catálogo', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('fam.ca4');
  });

  function catalogKeys() {
    return cy
      .get('[data-cy=algo-catalog] [data-cy^=algo-item-]')
      .should('have.length.at.least', 4)
      .then(($items) => $items.toArray().map((el) => el.getAttribute('data-cy')!));
  }

  it('la lista es la misma en 3D y en 2D y cubre las cuatro familias', () => {
    cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.get('[data-cy=algorithm-toggle]').click();
    catalogKeys().as('in3d');
    for (const fam of ['graph', 'tree', 'stack', 'queue']) cy.get(`[data-cy=algo-family-${fam}]`).should('exist');

    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    catalogKeys().then((in2d) => {
      cy.get<string[]>('@in3d').then((in3d) => expect(in2d).to.deep.equal(in3d));
    });

    // La API devuelve lo mismo se pida desde el modo que se pida.
    cy.storedSession().then((s) => {
      const get = (mode: string) =>
        cy.request({
          url: '/api/algorithm/catalog',
          headers: { Authorization: `Bearer ${s.accessToken}`, 'X-Visualization-Mode': mode },
        });
      get('3D').then((a) => get('2D').then((b) => expect(b.body).to.deep.equal(a.body)));
    });
  });

  it('todo algoritmo ejecutable en 3D lo es en 2D (pop y dequeue en ambos)', () => {
    cy.visit('/');
    runDemo('demo-stack-simple');
    cy.get('[data-cy=step-counter]').should('have.text', '1 / 9');
    cy.get('[data-cy=mode-2d]').click();
    cy.get('[data-cy=canvas-2d]').should('exist');
    runDemo('demo-queue-simple');
    cy.get('[data-cy=step-counter]').should('have.text', '1 / 9');
    cy.get('[data-cy=mode-3d]').click();
    cy.get('[data-cy=canvas-3d]').should('exist');
    cy.get('[data-cy=step-counter]').should('have.text', '1 / 9');
  });
});
