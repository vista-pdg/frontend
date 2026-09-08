/// <reference types="cypress" />
import { expectNoOverlaps, goToLastStep, nodeBoxes, runDemo } from '../support/hu19';

/**
 * HU-19 · CA-2 — Disposición jerárquica de árboles.
 *
 *   Dado que solicito un árbol binario de búsqueda con 15 nodos
 *   Cuando la estructura se renderiza en modo "2D"
 *   Entonces los nodos se distribuyen por niveles sin solaparse
 *   Y la relación padre-hijo es visualmente inequívoca
 */
describe('HU-19 · CA-2 Disposición jerárquica de árboles', () => {
  const FIFTEEN = '50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('fam.ca2');
    cy.visit('/');
    runDemo('demo-tree-avl', FIFTEEN);
    goToLastStep();
  });

  it('15 nodos en 4 niveles, sin solapes, y cada arista baja del padre al hijo', () => {
    cy.get('[data-cy=canvas-2d]').should('have.attr', 'data-kind', 'tree');
    cy.get('[data-cy=svg-scene]').should(($svg) => {
      const boxes = nodeBoxes($svg);
      expect(boxes).to.have.length(15);
      expectNoOverlaps(boxes);

      const levels = [...new Set(boxes.map((b) => b.y))].sort((a, b) => a - b);
      expect(levels, 'un BST equilibrado de 15 tiene 4 niveles').to.have.length(4);
      const gaps = levels.slice(1).map((y, i) => y - levels[i]);
      expect(new Set(gaps).size, 'niveles equiespaciados').to.eq(1);

      const byId = new Map(boxes.map((b) => [b.id, b]));
      const edges = $svg.find('[data-edge-id]').toArray();
      expect(edges).to.have.length(14);
      for (const e of edges) {
        const [, from, to] = /^edge-(.+?)-(node-.+)$/.exec(e.getAttribute('data-edge-id')!)!;
        const p = byId.get(from)!;
        const c = byId.get(to)!;
        expect(c.y - p.y, `${p.label} → ${c.label} baja exactamente un nivel`).to.eq(gaps[0]);
        const childValue = Number(c.label);
        const parentValue = Number(p.label);
        if (childValue < parentValue) expect(c.x, `${c.label} a la izquierda de ${p.label}`).to.be.lessThan(p.x);
        else expect(c.x, `${c.label} a la derecha de ${p.label}`).to.be.greaterThan(p.x);
      }
      // La raíz (50) queda centrada sobre sus dos hijos.
      const root = byId.get('node-50')!;
      const l = byId.get('node-25')!;
      const r = byId.get('node-75')!;
      expect(root.x).to.be.closeTo((l.x + r.x) / 2, 0.01);
    });
  });
});
