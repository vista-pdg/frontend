import { dragPanel, openCodePanel, panelRect } from '../support/codePanel';

describe('Panel de código · CA-1 arrastre', () => {
  beforeEach(openCodePanel);

  it('mueve desde la cabecera sin cambiar el paso ni abrir ajustes', () => {
    panelRect().then(before => {
      dragPanel('code-move', 160, -80);
      cy.get('[data-cy=code-panel]').should($panel => {
        const rect = $panel[0].getBoundingClientRect();
        expect(rect.x).to.eq(before.x + 160);
        expect(rect.y).to.eq(before.y - 80);
      });
      cy.get('[data-cy=code-layout-controls]').should('not.be.visible');
      cy.get('[data-cy=code-step-counter]').should('contain', '1 /');
    });
  });

  it('admite tacto y restaura la geometría cuando el dispositivo cancela el gesto', () => {
    panelRect().then(before => {
      dragPanel('code-move', 80, -48, 'touch', true);
      panelRect().should('deep.equal', before);
      dragPanel('code-move', 80, -48, 'touch');
      panelRect().its('x').should('eq', before.x + 80);
      cy.get('[data-cy=code-panel]').should('have.attr', 'data-panel-action', 'idle');
    });
  });

  it('Escape cancela un arrastre sin avanzar el algoritmo', () => {
    panelRect().then(before => {
      dragPanel('code-move', 120, -64, 'mouse', 'escape');
      panelRect().should('deep.equal', before);
      cy.get('[data-cy=code-step-counter]').should('contain', '1 /');
    });
  });
});
