/// <reference types="cypress" />
import { generateByChat, runDemo } from '../support/hu19';
import { contrastRatio } from '../../src/core/color';

/**
 * HU-19 · CA-6 — Accesibilidad del lienzo bidimensional.
 *
 *   Cuando audito el lienzo en modo "2D"
 *   Entonces el contraste de nodos, aristas y etiquetas cumple el nivel AA de WCAG 2.1
 *   Y cada elemento dispone de una descripción textual alterna
 */
describe('HU-19 · CA-6 Accesibilidad del lienzo 2D', () => {
  const BG = '#0b0b12';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('fam.ca6');
    cy.visit('/');
  });

  function auditCanvas(expectKindWord: string) {
    cy.get('[data-cy=svg-scene]')
      .should('have.attr', 'role', 'img')
      .and('have.attr', 'aria-label')
      .and('contain', expectKindWord);
    cy.get('[data-cy=svg-scene] > title').should('exist');

    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const nodes = $svg.find('[data-node-id]').toArray();
      expect(nodes.length).to.be.greaterThan(0);
      for (const g of nodes) {
        expect(g.getAttribute('role'), 'nodo con role').to.eq('img');
        expect(g.getAttribute('aria-label') ?? '', 'nodo con descripción').to.match(/^(Nodo|Elemento) /);
        const shape = g.querySelector('circle:not([fill-opacity]), rect') as SVGElement;
        const text = g.querySelector('text') as SVGElement;
        const fill = shape.getAttribute('fill')!;
        const textFill = text.getAttribute('fill')!;
        expect(contrastRatio(fill, textFill), `etiqueta ${text.textContent} sobre ${fill}`).to.be.at.least(4.5);
      }
      for (const e of $svg.find('[data-edge-id]').toArray()) {
        expect(e.querySelector('title')?.textContent ?? '', 'arista con título').to.match(/.+ (→|—) .+/);
        const stroke = e.querySelector('line')!.getAttribute('stroke')!;
        expect(contrastRatio(stroke, BG), `arista ${stroke} sobre el fondo`).to.be.at.least(3);
      }
    });
  }

  it('un grafo: nodos, aristas y etiquetas con AA y texto alterno', () => {
    generateByChat('grafo ciclo de 6 nodos', 6);
    auditCanvas('Grafo con 6');
  });

  it('un recorrido BFS con sus cuatro estados de color sigue cumpliendo AA en cada paso', () => {
    generateByChat('grafo ciclo de 5 nodos', 5);
    cy.get('[data-cy=demo-graph-simple]').click();
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@steps');
    for (let i = 0; i < 4; i++) {
      auditCanvas('Grafo');
      cy.get('[data-cy=step-next]').click();
    }
    cy.get('[data-cy=svg-scene] [aria-label*="en visita"]').should('exist');
  });

  it('una pila anuncia tope y base, y cada elemento se describe', () => {
    runDemo('demo-stack-simple', '3, 42, 8, 17');
    cy.get('[data-cy=svg-scene]').should('have.attr', 'aria-label').and('match', /Pila con 4 elementos.*tope 17/);
    cy.get('[data-cy=svg-scene] [data-node-id="n3"]').should('have.attr', 'aria-label', 'Elemento 17, tope');
    cy.get('[data-cy=svg-scene] [data-node-id="n0"]').should('have.attr', 'aria-label', 'Elemento 3, base');
    auditCanvas('Pila');
  });
});
