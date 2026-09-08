/// <reference types="cypress" />

/**
 * HU-16 · CA-1 — Registro exitoso de un estudiante con correo institucional.
 *
 *   Dado que soy un visitante no autenticado en la pagina de registro
 *   Cuando ingreso el correo "ricardo.urbina@u.icesi.edu.co", una contrasena valida y selecciono
 *   el curso "CEDI-G1" y confirmo el registro
 *   Entonces el sistema crea mi cuenta con el rol "Estudiante", la asocia a "CEDI-G1" y "2026-1"
 *   y me redirige al lienzo.
 */
describe('HU-16 · CA-1 Registro exitoso con vinculacion a curso', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('antecedentes: existe el curso CEDI-G1 en el periodo activo 2026-1', () => {
    cy.request('/api/courses').then(({ status, body }) => {
      expect(status).to.eq(200);
      const cedi = body.find((c: { code: string }) => c.code === 'CEDI-G1');
      expect(cedi, 'CEDI-G1 seleccionable').to.exist;
      expect(cedi.name).to.eq('Computación y Estructuras Discretas I');
      expect(cedi.termCode).to.eq('2026-1');
    });
  });

  it('crea la cuenta Estudiante vinculada a CEDI-G1 y 2026-1 y redirige al lienzo', () => {
    const email = `ricardo.urbina.${Date.now()}@u.icesi.edu.co`;

    cy.visit('/login');
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=input-displayName]').type('Ricardo Urbina');
    cy.get('[data-cy=input-email]').type(email);
    cy.get('[data-cy=select-courseCode]').find('option[value="CEDI-G1"]').should('exist');
    cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
    cy.get('[data-cy=input-password]').type('clave12345');
    cy.get('[data-cy=input-confirmPassword]').type('clave12345');
    cy.get('[data-cy=submit]').click();

    // Entonces: me redirige al lienzo
    cy.location('pathname').should('eq', '/');
    cy.storedSession().then((s) => {
      expect(s.user?.email).to.eq(email);
      expect(s.user?.roles).to.deep.eq(['STUDENT']);
    });

    // Y asocia mi cuenta al curso y al periodo: lo confirma el servidor en un login posterior
    cy.request('POST', '/api/auth/login', { email, password: 'clave12345' }).then(({ body }) => {
      expect(body.roles).to.deep.eq(['STUDENT']);
      expect(body.courseCode).to.eq('CEDI-G1');
      expect(body.termCode).to.eq('2026-1');
    });
  });

  it('el registro no se puede confirmar sin elegir curso', () => {
    cy.visit('/login');
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=input-displayName]').type('Sin Curso');
    cy.get('[data-cy=input-email]').type(`sin.curso.${Date.now()}@u.icesi.edu.co`);
    cy.get('[data-cy=input-password]').type('clave12345');
    cy.get('[data-cy=input-confirmPassword]').type('clave12345');

    cy.get('[data-cy=submit]').should('be.disabled');
    cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
    cy.get('[data-cy=submit]').should('not.be.disabled');
  });

  it('el selector muestra el codigo y el nombre del curso', () => {
    cy.visit('/login');
    cy.get('[data-cy=tab-register]').click();
    cy.get('[data-cy=select-courseCode]')
      .find('option[value="CEDI-G1"]')
      .should('contain', 'CEDI-G1')
      .and('contain', 'Computación y Estructuras Discretas I');
  });
});
