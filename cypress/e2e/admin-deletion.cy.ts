/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

describe('Administración · eliminación persistente y confirmaciones', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.on('window:confirm', () => { throw new Error('La UI no debe abrir confirmaciones nativas'); });
    cy.on('window:alert', () => { throw new Error('La UI no debe abrir alertas nativas'); });
  });

  it('cancelar conserva la cuenta; confirmar elimina una cuenta con sesiones y permanece eliminada', () => {
    const email = `admin.delete.${Date.now()}@u.icesi.edu.co`;
    let token: string;
    let refreshToken: string;
    let id: number;
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.storedSession().then((session) => {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      cy.request({ url: '/api/admin/roles', headers }).then(({ body }) => {
        const role = body.find((value: { name: string }) => value.name === 'STUDENT');
        cy.request({ method: 'POST', url: '/api/admin/users', headers,
          body: { displayName: 'E2E admin.delete', email, password: 'clave12345', roleIds: [role.id] } });
      });
    });
    cy.then(() => cy.loginByApi(email, 'clave12345'));
    cy.storedSession().then((session) => {
      token = session.accessToken!;
      refreshToken = session.refreshToken!;
      cy.request('POST', '/api/auth/refresh', { refreshToken });
    });
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.storedSession().then((session) => {
      cy.request({ url: '/api/admin/users', headers: { Authorization: `Bearer ${session.accessToken}` } })
        .then(({ body }) => { id = body.find((user: { email: string }) => user.email === email).id; });
    });
    cy.visit('/admin');
    cy.intercept('DELETE', '/api/admin/users/*').as('deleteUser');
    cy.then(() => cy.get(`[data-cy=delete-usuario-${id}]`).click());
    cy.get('[data-cy=confirmation-dialog]').should('have.attr', 'role', 'alertdialog');
    cy.then(() => cy.get('[data-cy=confirmation-dialog]').should('contain', email));
    cy.get('[data-cy=confirmation-cancel]').should('have.focus').click();
    cy.get('@deleteUser.all').should('have.length', 0);
    cy.then(() => cy.get(`[data-cy=usuario-row-${id}]`).should('exist'));
    cy.then(() => cy.get(`[data-cy=delete-usuario-${id}]`).click());
    cy.get('[data-cy=confirmation-submit]').click();
    cy.wait('@deleteUser').its('response.statusCode').should('eq', 204);
    cy.get('[data-cy=confirmation-dialog]').should('not.exist');
    cy.get('[role=status]').should('contain', 'Usuario eliminado');
    cy.then(() => cy.get(`[data-cy=usuario-row-${id}]`).should('not.exist'));
    cy.reload();
    cy.get('[data-cy=users-summary]').should('be.visible');
    cy.then(() => cy.get(`[data-cy=usuario-row-${id}]`).should('not.exist'));
    cy.then(() => {
      cy.request({ method: 'POST', url: '/api/auth/refresh', body: { refreshToken }, failOnStatusCode: false })
        .its('status').should('eq', 401);
      cy.request({ url: '/api/assistant/quota', headers: { Authorization: `Bearer ${token}` }, failOnStatusCode: false })
        .its('status').should('eq', 401);
    });
  });

  it('un rol asignado responde 409 y muestra el motivo dentro del diálogo estándar', () => {
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.visit('/admin');
    cy.get('[data-cy=admin-tab-roles]').click();
    cy.contains('tr', 'STUDENT').find('[data-cy^=delete-rol-]').click();
    cy.intercept('DELETE', '/api/admin/roles/*').as('deleteRole');
    cy.get('[data-cy=confirmation-submit]').click();
    cy.wait('@deleteRole').its('response.statusCode').should('eq', 409);
    cy.get('[data-cy=confirmation-dialog]').find('[role=alert]').should('contain', 'Retíralo de sus cuentas');
    cy.get('[data-cy=confirmation-cancel]').click();
    cy.contains('tr', 'STUDENT').should('exist');
  });

  it('el estudiante no puede eliminar cuentas por API', () => {
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.storedSession().then((session) => {
      cy.request({ method: 'DELETE', url: '/api/admin/users/1', headers: { Authorization: `Bearer ${session.accessToken}` }, failOnStatusCode: false })
        .its('status').should('eq', 403);
    });
  });
});
