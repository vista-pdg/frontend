import { dragPanel, openCodePanel, panelRect } from '../support/codePanel';

describe('Panel de código · CA-3 alternativas accesibles', () => {
  beforeEach(openCodePanel);

  it('ajusta con botones y teclado sin activar los atajos del reproductor', () => {
    panelRect().then(before => {
      // Firefox cannot capture Cypress's synthetic pointer id. Native mouse/click is covered by
      // rendered QA; dispatch the click directly for this non-gesture alternative.
      cy.get('[data-cy=code-move]').should('be.visible').trigger('click');
      cy.get('[data-cy=code-layout-controls]').should('be.visible');
      cy.get('[data-cy=code-move-right]').click();
      cy.get('[data-cy=code-move]').focus().trigger('keydown', { key: 'ArrowRight', shiftKey: true });
      panelRect().its('x').should('eq', before.x + 64);
      cy.get('[data-cy=code-resize-right]').click();
      cy.get('[data-cy=code-resize]').focus().trigger('keydown', { key: 'ArrowRight' });
      panelRect().its('width').should('eq', before.width + 40);
      cy.get('[data-cy=code-step-counter]').should('contain', '1 /');
      cy.get('[data-cy=code-resize]').trigger('keydown', { key: 'Home' });
      panelRect().should('deep.equal', before);
      cy.get('[data-cy=code-layout-reset]').click();
      cy.get('[data-cy=code-layout-controls]').should('not.be.visible');
    });
  });

  it('la activación de teclado funciona justo después de arrastrar con tacto', () => {
    dragPanel('code-move', 80, -48, 'touch');
    cy.get('[data-cy=code-move]').focus().trigger('click', { eventConstructor: 'MouseEvent', detail: 0 });
    cy.get('[data-cy=code-layout-controls]').should('be.visible');
    cy.get('[data-cy=code-step-counter]').should('contain', '1 /');
  });
});
