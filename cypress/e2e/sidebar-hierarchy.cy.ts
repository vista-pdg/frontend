import { openSidebar } from '../support/navigation';

describe('CA-5 · Identidad y jerarquía en navegación', () => {
  it('centra el logo completo Icesi en navegación abierta y señala los tres subtipos', () => {
    cy.loginByApi('estudiante@u.icesi.edu.co','estudiante123'); cy.visit('/');
    openSidebar();
    cy.get('[data-cy=icesi-brand]').should('have.css', 'width', '87px');
    cy.get('[data-cy=app-sidebar]').then($aside => {
      const aside = $aside[0].getBoundingClientRect();
      cy.get('[data-cy=icesi-brand]').then($brand => {
        const brand = $brand[0].getBoundingClientRect();
        expect(Math.abs(brand.left + brand.width / 2 - aside.left - aside.width / 2)).to.be.lessThan(1);
      });
    });
    for (const subtype of ['avl','bst','btree']) cy.get(`[data-cy=nav-tree-${subtype}] svg`).should('have.class','lucide-corner-down-right');
  });
});
