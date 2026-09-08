/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * HU-17 · CA-6 — Ajuste de la cuota por el administrador.
 *
 *   Dado que he iniciado sesion con el rol "Administrador"
 *   Cuando modifico la cuota diaria del curso "CEDI-G1" de 40 a 60 mensajes
 *   Entonces el nuevo limite aplica a todos los estudiantes del curso
 *   Y el cambio queda registrado con marca de tiempo y autor
 */
describe('HU-17 · CA-6 Ajuste de la cuota por el administrador', () => {
  after(() => cy.adminSetQuota('CEDI-G1', 40));

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.adminSetQuota('CEDI-G1', 40);
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.visit('/admin');
    cy.get('[data-cy=admin-tab-courses]').click();
    cy.get('[data-cy=courses-table]').should('be.visible');
  });

  it('cambia la cuota de CEDI-G1 de 40 a 60 desde la interfaz y aplica a los estudiantes', () => {
    cy.get('[data-cy=course-row-CEDI-G1]').should('contain', 'Computación y Estructuras Discretas I');
    cy.get('[data-cy=quota-save-CEDI-G1]').should('be.disabled');

    cy.get('[data-cy=quota-input-CEDI-G1]').clear().type('60');
    cy.get('[data-cy=quota-save-CEDI-G1]').should('not.be.disabled').click();
    cy.get('[data-cy=quota-saved-CEDI-G1]').should('be.visible');

    // Aplica a todos los estudiantes del curso: uno nuevo ve 60 sin hacer nada mas.
    cy.request('POST', '/api/auth/register', {
      displayName: 'Alumno Sesenta',
      email: `sesenta.${Date.now()}@u.icesi.edu.co`,
      password: 'clave12345',
      confirmPassword: 'clave12345',
      courseCode: 'CEDI-G1',
    }).then(({ body }) => {
      cy.request({
        url: '/api/assistant/quota',
        headers: { Authorization: `Bearer ${body.accessToken}` },
      }).then((res) => {
        expect(res.body.limit).to.eq(60);
        expect(res.body.remaining).to.eq(60);
      });
    });
  });

  it('el cambio queda registrado con marca de tiempo y autor, visible en el historial', () => {
    cy.get('[data-cy=quota-input-CEDI-G1]').clear().type('60');
    cy.get('[data-cy=quota-save-CEDI-G1]').click();
    cy.get('[data-cy=quota-saved-CEDI-G1]').should('be.visible');

    cy.get('[data-cy=quota-history-CEDI-G1]').click();
    cy.get('[data-cy=quota-history-list]').should('be.visible');
    cy.get('[data-cy=quota-history-row]')
      .first()
      .should('contain', '60')
      .and('contain', SEEDED.admin.email)
      .invoke('text')
      .should('match', /\d{1,2}\/\d{1,2}\/\d{2,4}/); // fecha formateada
  });

  it('rechaza valores fuera de rango sin llamar al servidor', () => {
    cy.intercept('PUT', '/api/admin/courses/*/quota').as('put');
    cy.get('[data-cy=quota-input-CEDI-G1]').clear().type('0');
    cy.get('[data-cy=quota-save-CEDI-G1]').should('be.disabled');
    cy.get('[data-cy=quota-input-CEDI-G1]').should('have.attr', 'aria-invalid', 'true');
    cy.get('[data-cy=quota-input-CEDI-G1]').clear().type('1001');
    cy.get('[data-cy=quota-save-CEDI-G1]').should('be.disabled');
    cy.get('@put.all').should('have.length', 0);
  });

  it('un estudiante no ve la pestaña de cursos ni puede cambiar la cuota', () => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/admin');
    cy.location('pathname').should('eq', '/');
    cy.storedSession().then((s) => {
      cy.request({
        method: 'PUT',
        url: '/api/admin/courses/CEDI-G1/quota',
        headers: { Authorization: `Bearer ${s.accessToken}` },
        body: { dailyQuota: 999 },
        failOnStatusCode: false,
      })
        .its('status')
        .should('eq', 403);
    });
  });
});
