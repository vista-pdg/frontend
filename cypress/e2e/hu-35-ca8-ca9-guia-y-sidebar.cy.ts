/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { by } from '../support/hu34';

// HU-35 · CA-8: la guía cuenta lo nuevo de Quizzes según el rol. CA-9: el sidebar no destella.
describe('HU-35 · Guía de VISTA y barra lateral', () => {
  function stepTo(count: number) {
    by('tutorial-open').click();
    by('tutorial-callout').should('contain', '1 / ');
    // Cada clic espera a que el paso avance: un clic durante la transición no debe perderse.
    for (let step = 2; step <= count + 1; step++) {
      by('tutorial-next').click();
      by('tutorial-callout').should('contain', `${step} / `);
    }
  }

  it('el estudiante termina la guía en los quizzes de su curso y los de estudio', () => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/');
    stepTo(6);
    by('tutorial-highlight').should('have.attr', 'data-target', '[data-cy=sidebar-quizzes]');
    by('app-sidebar').should('have.attr', 'data-expanded', 'true');
    by('tutorial-callout').should('contain', '7 / 8').and('contain', 'Quizzes de tu curso').and('contain', 'Insertar en el chat').and('contain', 'revísalos');
    by('tutorial-next').click();
    by('tutorial-callout').should('contain', '8 / 8').and('contain', 'Quizzes de estudio').and('contain', 'tutor IA');
    by('tutorial-next').should('contain', 'Terminar').click();
    by('tutorial-open').should('have.focus');
  });

  it('el docente ve la gestión de quizzes por cursos asignados', () => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/');
    stepTo(6);
    by('tutorial-highlight').should('have.attr', 'data-target', '[data-cy=sidebar-quizzes]');
    // HU-36 · CA-11: el docente tiene además el paso de la analítica pedagógica.
    by('tutorial-callout').should('contain', '7 / 8').and('contain', 'Quizzes de tus cursos').and('contain', 'asignó');
    by('tutorial-next').should('contain', 'Siguiente');
  });

  it('al expandir la barra, los botones de demo no toman el hover amarillo hasta quedar en su sitio', () => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.viewport(1440, 900);
    cy.visit('/');
    const demo = '[data-cy=demo-graph-simple]';
    // Causa del destello: el botón nacía en el borde del carril, bajo el cursor, y se deslizaba
    // con su hover amarillo. Mientras el ancho se anima no admite puntero ni se ve.
    cy.window().then(win => {
      // El hover expande solo con puntero fino; en un navegador sin él se recorre solo el botón.
      if (!win.matchMedia('(min-width: 1024px) and (hover: hover)').matches) return;
      by('app-sidebar').trigger('mouseover');
      by('app-sidebar').should('have.attr', 'data-expanded', 'true').and('have.attr', 'data-settled', 'false');
      cy.get(demo).should('have.css', 'pointer-events', 'none').and('have.css', 'opacity', '0');
      by('app-sidebar').should('have.attr', 'data-settled', 'true');
      cy.get(demo).should('have.css', 'pointer-events', 'auto').and('have.css', 'opacity', '1');
      by('app-sidebar').trigger('mouseout');
      by('app-sidebar').should('have.attr', 'data-expanded', 'false');
    });

    // Al fijar la barra con el botón.
    by('sidebar-toggle').click();
    by('app-sidebar').should('have.attr', 'data-settled', 'false');
    cy.get(demo).should('have.css', 'pointer-events', 'none').and('have.css', 'opacity', '0');
    by('app-sidebar').should('have.attr', 'data-settled', 'true');
    cy.get(demo).should('have.css', 'pointer-events', 'auto').and('have.css', 'opacity', '1').click();
    by('algorithm-toggle').should('have.attr', 'aria-pressed', 'true');
  });
});
