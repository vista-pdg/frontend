/// <reference types="cypress" />

/** Opt into a fixed sidebar when a scenario needs subtype or demo controls. */
export function openSidebar() {
  cy.get('[data-cy=sidebar-toggle]').then(button => {
    if (button.attr('aria-label') !== 'Contraer navegación') cy.wrap(button).click();
  });
  cy.get('[data-cy=app-sidebar]').should('have.attr', 'data-expanded', 'true');
}
