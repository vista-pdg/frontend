/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { by } from '../support/hu34';

// HU-36 · CA-11: la guía del docente cuenta el material, la edición y la analítica.
describe('HU-36 · Guía de VISTA del docente', () => {
  it('termina en la analítica pedagógica señalando su acceso en la barra lateral', () => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/');
    by('tutorial-open').click();
    by('tutorial-callout').should('contain', '1 / 8');
    // Cada clic espera a que el paso avance: un clic durante la transición no debe perderse.
    for (let step = 2; step <= 7; step++) {
      by('tutorial-next').click();
      by('tutorial-callout').should('contain', `${step} / 8`);
    }
    by('tutorial-callout').should('contain', '7 / 8').and('contain', 'material del curso').and('contain', 'con IA');
    by('tutorial-next').click();
    by('tutorial-highlight').should('have.attr', 'data-target', '[data-cy=sidebar-analytics]');
    by('app-sidebar').should('have.attr', 'data-expanded', 'true');
    by('tutorial-callout').should('contain', '8 / 8').and('contain', 'Analítica pedagógica').and('contain', 'filtros opcionales');
    by('tutorial-next').should('contain', 'Terminar').click();
    by('tutorial-open').should('have.focus');
  });
});
