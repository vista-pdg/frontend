/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { ask, assertLegacyAnalyticsRetired } from '../support/hu21';

// La atribución por seudónimo y curso se verifica sobre Postgres en GenerationTelemetryTest.
// HU-06 impide observar el incremento individual en el antiguo resumen global.
describe('HU-16 · CA-5 Trazabilidad y frontera pública de privacidad', () => {
  it('el estudiante demo está vinculado a CEDI-G1', () => {
    cy.request('POST', '/api/auth/login', SEEDED.student).then(({ body }) => {
      expect(body.courseCode).to.eq('CEDI-G1');
      expect(body.termCode).to.eq('2026-1');
    });
  });
  it('generar sigue funcionando y el resumen global individualizable está retirado', () => {
    cy.clearLocalStorage(); cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/'); cy.get('[data-cy=chat-toggle]').click();
    ask('grafo completo de 3 vertices', 'generate');
    cy.get('[data-cy=chat-message-assistant]').last().should('contain', 'generado');
    assertLegacyAnalyticsRetired('summary');
  });
});
