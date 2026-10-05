import { dragPanel, openCodePanel, panelRect } from '../support/codePanel';
import { engineState, snapshotOf } from '../support/hu18';

describe('Panel de código · CA-5 rastro y geometría', () => {
  beforeEach(openCodePanel);

  it('conserva Java, variables, rastro y tamaño al contraer y cambiar 2D/3D', () => {
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-view-java]').click();
    cy.window().then(win => {
      const state = engineState(win);
      const snapshot = snapshotOf(win, '2D');
      dragPanel('code-move', 160, -80);
      dragPanel('code-resize', 120, 48);
      panelRect().then(geometry => {
        cy.get('[data-cy=code-toggle]').click();
        cy.get('[data-cy=code-panel]').should($panel => expect($panel[0].getBoundingClientRect().height).to.eq(44));
        cy.get('[data-cy=code-toggle]').click();
        panelRect().should('deep.equal', geometry);
        cy.get('[data-cy=mode-3d]').click();
        panelRect().should('deep.equal', geometry);
        cy.get('[data-cy=code-panel]').should('have.attr', 'data-language', 'java');
        cy.get('[data-cy=var-tope-value]').should('have.text', '8');
        cy.window().then(after => {
          expect(engineState(after).stepIndex).to.eq(state.stepIndex);
          expect(engineState(after).trace).to.deep.equal(state.trace);
          expect(snapshotOf(after, '3D')).to.deep.equal(snapshot);
        });
      });
    });
  });
});
