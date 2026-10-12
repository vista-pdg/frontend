/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * HU-08 CA-3, actualizado por HU-06: el docente aterriza en analítica al ingresar;
 * ADMIN también puede consultar el tablero, mientras STUDENT queda excluido.
 *
 * Se conserva la redirección inicial del administrador al lienzo y se prueba su acceso
 * explícito al panel, además de las denegaciones al estudiante y al visitante sin sesión.
 */
describe('CA-3 · Redireccion docente y acceso analítico actualizado por HU-06', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('el docente aterriza en el panel analitico al iniciar sesion', () => {
    cy.visit('/login');
    cy.get('[data-cy=input-email]').type(SEEDED.teacher.email);
    cy.get('[data-cy=input-password]').type(SEEDED.teacher.password);
    cy.get('[data-cy=submit]').click();

    cy.location('pathname').should('eq', '/analytics');
    cy.get('[data-cy=analytics-page]').should('be.visible');
    cy.contains('Panel analítico').should('be.visible');
    cy.storedSession().then((s) => expect(s.user?.roles).to.include('TEACHER'));
  });

  it('el estudiante aterriza en el lienzo, no en el panel', () => {
    cy.visit('/login');
    cy.get('[data-cy=input-email]').type(SEEDED.student.email);
    cy.get('[data-cy=input-password]').type(SEEDED.student.password);
    cy.get('[data-cy=submit]').click();

    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=analytics-page]').should('not.exist');
  });

  it('el administrador inicia en el lienzo y puede consultar el panel según HU-06', () => {
    cy.visit('/login');
    cy.get('[data-cy=input-email]').type(SEEDED.admin.email);
    cy.get('[data-cy=input-password]').type(SEEDED.admin.password);
    cy.get('[data-cy=submit]').click();
    cy.location('pathname').should('eq', '/');

    cy.visit('/analytics');
    cy.location('pathname').should('eq', '/analytics');
    cy.get('[data-cy=analytics-page]').should('be.visible');
  });

  it('un estudiante que escribe la URL a mano es devuelto al lienzo', () => {
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/analytics');

    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=analytics-page]').should('not.exist');
  });

  it('sin sesion, el panel manda a la bienvenida y vuelve a el tras autenticarse', () => {
    cy.visit('/analytics');
    cy.location('pathname').should('eq', '/login');

    cy.get('[data-cy=input-email]').type(SEEDED.teacher.email);
    cy.get('[data-cy=input-password]').type(SEEDED.teacher.password);
    cy.get('[data-cy=submit]').click();

    // Se respeta el destino original en lugar de mandar siempre al inicio.
    cy.location('pathname').should('eq', '/analytics');
  });

  it('el docente puede ir al lienzo y volver al panel desde el sidebar', () => {
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/analytics');

    cy.get('[data-cy=link-to-canvas]').click();
    cy.location('pathname').should('eq', '/');

    cy.get('[data-cy=sidebar-analytics]').click();
    cy.location('pathname').should('eq', '/analytics');
    cy.get('[data-cy=analytics-page]').should('be.visible');
  });

  it('el estudiante no ve el acceso al panel en el sidebar', () => {
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/');

    cy.get('[data-cy=sidebar-analytics]').should('not.exist');
  });

  it('el panel presenta los cursos autorizados o el estado sin asignaciones', () => {
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.intercept('GET', '/api/analytics/courses').as('authorizedCourses');
    cy.visit('/analytics');
    cy.wait('@authorizedCourses').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      if (response!.body.length === 0) {
        cy.get('[data-cy=analytics-no-courses]').should('be.visible');
      } else {
        cy.get('[data-cy=analytics-course] option').should('have.length', response!.body.length);
        cy.get('[data-cy=analytics-apply]').should('be.visible');
      }
    });
    cy.get('[data-cy=analytics-page]').should('not.contain', 'historia posterior');
  });
});
