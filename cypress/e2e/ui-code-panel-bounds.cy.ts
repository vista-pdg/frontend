import { dragPanel, expectPanelContained, openCodePanel } from '../support/codePanel';

describe('Panel de código · CA-4 límites responsive', () => {
  beforeEach(openCodePanel);

  it('se mantiene accesible tras salir del lienzo, abrir paneles y reducir el viewport', () => {
    dragPanel('code-move', 5000, -5000);
    expectPanelContained();
    dragPanel('code-resize', 5000, 5000);
    expectPanelContained();
    cy.get('[data-cy=algorithm-toggle]').click();
    expectPanelContained();
    cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
    cy.viewport(390, 844);
    expectPanelContained();
    cy.viewport(390, 600);
    expectPanelContained();
    cy.get('[data-cy=code-layout-reset]').click();
    cy.get('[data-cy=code-move]').should('be.visible');
    cy.get('[data-cy=tutorial-open]').click();
    cy.get('[data-cy=tutorial]').should('be.visible');
    expectPanelContained();
  });
});
