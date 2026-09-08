/// <reference types="cypress" />

/**
 * HU-16 · CA-2 — Rechazo de correo no institucional.
 *
 *   Dado que estoy en la pagina de registro
 *   Cuando ingreso el correo "ricardo@gmail.com" y confirmo el registro
 *   Entonces el sistema rechaza la solicitud, muestra el mensaje
 *   "Debes registrarte con tu correo institucional Icesi" y no se crea ningun registro.
 */
describe('HU-16 · CA-2 Rechazo de correo no institucional', () => {
  const LITERAL = 'Debes registrarte con tu correo institucional Icesi';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/login');
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=input-displayName]').type('Ricardo Urbina');
    cy.get('[data-cy=input-email]').type('ricardo@gmail.com');
    cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
    cy.get('[data-cy=input-password]').type('clave12345');
    cy.get('[data-cy=input-confirmPassword]').type('clave12345');
    cy.get('[data-cy=submit]').click();
  });

  it('muestra el mensaje exacto del criterio, palabra por palabra, sobre el campo de correo', () => {
    cy.get('[data-cy=field-error-email]').should('have.text', LITERAL);
    cy.get('[data-cy=input-email]').should('have.attr', 'aria-invalid', 'true');
    cy.get('[data-cy=error-banner]').should('not.exist');
  });

  it('rechaza la solicitud: sigo en el registro y sin sesion', () => {
    cy.location('pathname').should('eq', '/login');
    cy.get('[data-cy=tab-register]').should('have.attr', 'aria-selected', 'true');
    cy.storedSession().then((s) => {
      expect(s.accessToken).to.be.null;
      expect(s.user).to.be.null;
    });
  });

  it('no se creo ningun registro: esa cuenta no puede iniciar sesion', () => {
    // Desde el navegador no se lee la base; lo que si se puede probar es que la cuenta no existe
    // para el servidor. La ausencia de fila la cubre CourseRegistrationTest en el backend.
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email: 'ricardo@gmail.com', password: 'clave12345' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.code).to.eq('BAD_CREDENTIALS');
    });
  });
});
