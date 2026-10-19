import { openCodePanel, panelRect } from '../support/codePanel';
import { engineState } from '../support/hu18';

describe('CA-1 · Ocultar completamente el código', () => {
  beforeEach(openCodePanel);
  it('restaura idioma, minimización, geometría y paso sin reiniciar el panel', () => {
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-view-java]').click();
    panelRect().then(rect => {
      cy.window().then(win => {
        const before = engineState(win);
        cy.get('[data-cy=code-visibility-toggle]').click().should('have.attr', 'aria-pressed', 'false');
        cy.get('[data-cy=code-panel]').should('not.be.visible');
        cy.get('[data-cy=step-next]').click();
        cy.get('[data-cy=code-visibility-toggle]').click();
        cy.get('[data-cy=code-panel]').should('be.visible').and('have.attr', 'data-language', 'java');
        panelRect().should('deep.equal', rect);
        cy.window().then(after => {
          expect(engineState(after).stepIndex).to.eq(before.stepIndex + 1);
          expect(engineState(after).trace).to.deep.equal(before.trace);
        });
      });
    });
    cy.get('[data-cy=code-toggle]').click().should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-cy=code-visibility-toggle]').click();
    cy.get('[data-cy=code-visibility-toggle]').click();
    cy.get('[data-cy=code-toggle]').should('have.attr', 'aria-expanded', 'false');
  });
});
