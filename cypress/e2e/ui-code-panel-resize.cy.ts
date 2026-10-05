import { dragPanel, openCodePanel, panelRect } from '../support/codePanel';

describe('Panel de código · CA-2 tamaño', () => {
  beforeEach(openCodePanel);

  it('amplía ancho, alto y espacio de lectura; mantiene las dimensiones mínimas', () => {
    cy.get('[data-cy=code-lines]').then($lines => {
      const readingHeight = $lines[0].clientHeight;
      panelRect().then(before => {
        dragPanel('code-resize', 160, 100);
        panelRect().should(after => {
          expect(after.width).to.eq(before.width + 160);
          expect(after.height).to.eq(before.height + 100);
        });
        cy.get('[data-cy=code-lines]').should($next => expect($next[0].clientHeight).to.be.greaterThan(readingHeight));
        dragPanel('code-resize', -5000, -5000);
        panelRect().should(after => {
          expect(after.width).to.eq(260);
          expect(after.height).to.eq(220);
        });
      });
    });
  });
});
