/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * CA-1 — «Formulario de registro e inicio de sesion integrados en la pantalla de bienvenida».
 *
 * <p>Lo que se verifica aqui es exactamente eso: que ambos formularios convivan en una sola
 * pantalla y que el usuario pueda completar el ciclo desde ella.
 */
describe('CA-1 · Registro e inicio de sesion en la pantalla de bienvenida', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('muestra ambos formularios integrados en la misma pantalla, no en rutas separadas', () => {
    cy.get('[data-cy=welcome-screen]').should('be.visible');
    cy.get('[data-cy=tab-login]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-cy=tab-register]').should('have.attr', 'aria-selected', 'false');

    cy.get('[data-cy=tab-register]').click();
    cy.url().should('include', '/login');
    cy.get('[data-cy=tab-register]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-cy=input-displayName]').should('be.visible');
    cy.get('[data-cy=input-confirmPassword]').should('be.visible');
  });

  it('el enlace inferior alterna entre los dos formularios', () => {
    cy.get('[data-cy=link-to-register]').click();
    cy.get('[data-cy=tab-register]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-cy=link-to-login]').click();
    cy.get('[data-cy=tab-login]').should('have.attr', 'aria-selected', 'true');
  });

  it('el boton esta deshabilitado mientras falten campos', () => {
    cy.get('[data-cy=submit]').should('be.disabled');
    cy.get('[data-cy=input-email]').type(SEEDED.student.email);
    cy.get('[data-cy=submit]').should('be.disabled');
    cy.get('[data-cy=input-password]').type(SEEDED.student.password);
    cy.get('[data-cy=submit]').should('not.be.disabled');
  });

  it('registra una cuenta nueva y entra directamente', () => {
    cy.uniqueEmail('registro').then((email) => {
      cy.get('[data-cy=tab-register]').click();
      cy.get('[data-cy=input-displayName]').type('Ana Restrepo');
      cy.get('[data-cy=input-email]').type(email);
      cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
      cy.get('[data-cy=input-password]').type('clave12345');
      cy.get('[data-cy=input-confirmPassword]').type('clave12345');
      cy.get('[data-cy=submit]').click();

      // Una cuenta recien registrada es estudiante, asi que aterriza en el lienzo.
      cy.location('pathname').should('eq', '/');
      cy.storedSession().then((s) => {
        expect(s.user?.email).to.eq(email);
        expect(s.user?.roles).to.deep.eq(['STUDENT']);
      });
    });
  });

  it('el correo no institucional se marca en el campo, no en un banner generico', () => {
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=input-displayName]').type('Externa');
    cy.get('[data-cy=input-email]').type('ana@gmail.com');
      cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
    cy.get('[data-cy=input-password]').type('clave12345');
    cy.get('[data-cy=input-confirmPassword]').type('clave12345');
    cy.get('[data-cy=submit]').click();

    cy.get('[data-cy=field-error-email]').should('contain', 'institucional');
    cy.get('[data-cy=error-banner]').should('not.exist');
    cy.get('[data-cy=input-email]').should('have.attr', 'aria-invalid', 'true');
    cy.location('pathname').should('eq', '/login');
  });

  it('las contrasenas distintas se marcan en el campo de confirmacion', () => {
    cy.uniqueEmail('mismatch').then((email) => {
      cy.get('[data-cy=tab-register]').click();
      cy.get('[data-cy=input-displayName]').type('Ana');
      cy.get('[data-cy=input-email]').type(email);
      cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
      cy.get('[data-cy=input-password]').type('clave12345');
      cy.get('[data-cy=input-confirmPassword]').type('otraclave');
      cy.get('[data-cy=submit]').click();

      cy.get('[data-cy=field-error-confirmPassword]').should('be.visible');
    });
  });

  it('el error de un campo desaparece en cuanto el usuario lo corrige', () => {
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=input-displayName]').type('Externa');
    cy.get('[data-cy=input-email]').type('ana@gmail.com');
      cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
    cy.get('[data-cy=input-password]').type('clave12345');
    cy.get('[data-cy=input-confirmPassword]').type('clave12345');
    cy.get('[data-cy=submit]').click();
    cy.get('[data-cy=field-error-email]').should('be.visible');

    cy.get('[data-cy=input-email]').type('{selectall}ana@u.icesi.edu.co');
    cy.get('[data-cy=field-error-email]').should('not.exist');
  });

  it('un correo ya registrado no crea una segunda cuenta', () => {
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=input-displayName]').type('Duplicada');
    cy.get('[data-cy=input-email]').type(SEEDED.student.email);
      cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
    cy.get('[data-cy=input-password]').type('clave12345');
    cy.get('[data-cy=input-confirmPassword]').type('clave12345');
    cy.get('[data-cy=submit]').click();

    cy.get('[data-cy=field-error-email]').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('inicia sesion con credenciales validas', () => {
    cy.get('[data-cy=input-email]').type(SEEDED.student.email);
    cy.get('[data-cy=input-password]').type(SEEDED.student.password);
    cy.get('[data-cy=submit]').click();

    cy.location('pathname').should('eq', '/');
    cy.storedSession().then((s) => expect(s.user?.email).to.eq(SEEDED.student.email));
  });

  it('una contrasena incorrecta muestra el banner y deja al usuario en la pantalla', () => {
    cy.get('[data-cy=input-email]').type(SEEDED.student.email);
    cy.get('[data-cy=input-password]').type('claveequivocada');
    cy.get('[data-cy=submit]').click();

    cy.get('[data-cy=error-banner]').should('contain', 'Credenciales incorrectas');
    cy.location('pathname').should('eq', '/login');
    cy.storedSession().then((s) => expect(s.accessToken).to.be.null);
  });

  it('una ruta protegida sin sesion devuelve a la bienvenida', () => {
    cy.clearLocalStorage();
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });
});
