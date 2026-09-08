/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * CA-3 — «Redireccion a panel analitico unicamente para usuarios con rol docente».
 *
 * <p>El criterio tiene dos mitades y ambas hay que demostrarlas: que el docente llegue, y que
 * nadie mas lo haga. Una prueba que solo compruebe lo primero dejaria pasar un guard que abre la
 * ruta a todo el mundo.
 */
describe('CA-3 · Redireccion al panel analitico solo para el docente', () => {
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

  it('el administrador tampoco entra al panel del docente: el rol es TEACHER, no «cualquier rol elevado»', () => {
    cy.visit('/login');
    cy.get('[data-cy=input-email]').type(SEEDED.admin.email);
    cy.get('[data-cy=input-password]').type(SEEDED.admin.password);
    cy.get('[data-cy=submit]').click();
    cy.location('pathname').should('eq', '/');

    cy.visit('/analytics');
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=analytics-page]').should('not.exist');
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

  it('el panel declara que su contenido llega despues, en vez de fingir metricas', () => {
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/analytics');

    cy.get('[data-cy=analytics-page]').should('contain', 'historia posterior');
  });
});
