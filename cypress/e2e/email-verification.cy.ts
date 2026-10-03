/// <reference types="cypress" />

// Real backend + SMTP inbox: no production bypass, credentials or mocked mail.
describe('Correo · Verificación obligatoria antes de crear la cuenta', () => {
  it('rechaza registro sin prueba y login antes de verificar; acepta solo el código enviado', () => {
    cy.uniqueEmail('verificacion').then(email => {
      const intent = { displayName: 'Prueba correo', email, password: 'clave12345', confirmPassword: 'clave12345', courseCode: 'CEDI-G1' };
      cy.request({ method: 'POST', url: '/api/auth/register', body: intent, failOnStatusCode: false }).its('status').should('eq', 422);
      cy.request('POST', '/api/auth/registration-code', intent).then(({ body: receipt }) => {
        expect(receipt).not.to.have.property('accessToken');
        expect(receipt).not.to.have.property('verificationCode');
        cy.request({ method: 'POST', url: '/api/auth/login', body: { email, password: intent.password }, failOnStatusCode: false }).its('status').should('eq', 401);
        cy.request({ method: 'POST', url: '/api/auth/registration-code', body: intent, failOnStatusCode: false }).then(response => {
          expect(response.status).to.eq(429);
          expect(Number(response.headers['retry-after'])).to.be.greaterThan(0);
        });
        cy.verificationCodeFromInbox(email).then(code => {
          const proof = { ...intent, verificationId: receipt.verificationId, verificationCode: code };
          const wrong = code === '000000' ? '999999' : '000000';
          cy.request({ method: 'POST', url: '/api/auth/register', body: { ...proof, verificationCode: wrong }, failOnStatusCode: false }).its('status').should('eq', 422);
          cy.request('POST', '/api/auth/register', proof).then(({ body }) => {
            expect(body.roles).to.deep.eq(['STUDENT']);
            expect(body.accessToken).to.be.a('string');
          });
          cy.request({ method: 'POST', url: '/api/auth/register', body: proof, failOnStatusCode: false }).its('status').should('eq', 409);
        });
      });
    });
  });

  it('permite volver al formulario y conserva sus datos sin guardar la contraseña', () => {
    cy.visit('/login');
    cy.uniqueEmail('volver').then(email => {
      cy.get('[data-cy=tab-register]').click();
      cy.get('[data-cy=input-displayName]').type('Prueba volver');
      cy.get('[data-cy=input-email]').type(email);
      cy.get('[data-cy=select-courseCode]').select('CEDI-G1');
      cy.get('[data-cy=input-password]').type('clave12345', { log: false });
      cy.get('[data-cy=input-confirmPassword]').type('clave12345', { log: false });
      cy.get('[data-cy=submit]').click();
      cy.get('[data-cy=email-verification]').should('be.visible');
      cy.get('[data-cy=input-verificationCode]').should('have.focus');
      cy.get('[data-cy=resend-code]').should('be.disabled');
      cy.window().then(win => {
        expect(JSON.stringify(win.localStorage)).not.to.contain('clave12345');
        expect(JSON.stringify(win.sessionStorage)).not.to.contain('clave12345');
      });
      cy.get('[data-cy=back-to-register]').click();
      cy.get('[data-cy=input-email]').should('have.value', email);
      cy.get('[data-cy=input-password]').should('have.value', 'clave12345').and('have.attr', 'type', 'password');
    });
  });
});
