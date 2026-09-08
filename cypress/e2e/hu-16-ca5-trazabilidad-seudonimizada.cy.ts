/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * HU-16 · CA-5 — Trazabilidad de la interaccion con el usuario registrado.
 *
 *   Dado que estoy autenticado como estudiante del curso "CEDI-G1"
 *   Cuando genero una estructura de datos en el lienzo
 *   Entonces el evento persistido incluye un identificador seudonimizado de mi cuenta
 *   Y el codigo de curso "CEDI-G1"
 *   Y no incluye mi correo ni mi nombre en texto plano
 *
 * Desde el navegador no se lee la tabla de eventos; lo observable es el agregado por cohorte que
 * ve el docente. Que la fila lleve seudonimo y no correo lo demuestra GenerationTelemetryTest sobre
 * la fila cruda. Requiere el backend con perfil `e2e`, que sustituye a Gemini por un grafo fijo.
 */
describe('HU-16 · CA-5 Trazabilidad seudonimizada por cohorte', () => {
  const SUMMARY = '/api/analytics/summary';

  interface Summary {
    totalGenerations: number;
    distinctUsers: number;
    generationsByCourse: Record<string, number>;
    generationsByStructureType: Record<string, number>;
  }

  function teacherSummary(): Cypress.Chainable<Summary> {
    return cy
      .request('POST', '/api/auth/login', {
        email: SEEDED.teacher.email,
        password: SEEDED.teacher.password,
      })
      .then(({ body }) =>
        cy
          .request({ url: SUMMARY, headers: { Authorization: `Bearer ${body.accessToken}` } })
          .its('body')
      );
  }

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('el estudiante demo esta vinculado a CEDI-G1', () => {
    cy.request('POST', '/api/auth/login', {
      email: SEEDED.student.email,
      password: SEEDED.student.password,
    }).then(({ body }) => {
      expect(body.courseCode).to.eq('CEDI-G1');
      expect(body.termCode).to.eq('2026-1');
    });
  });

  it('generar en el lienzo incrementa la cohorte CEDI-G1 sin exponer correo ni nombre', () => {
    teacherSummary().then((before) => {
      const base = before.generationsByCourse['CEDI-G1'] ?? 0;

      cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
      cy.intercept('POST', '/api/generate').as('generate');
      cy.visit('/');
      cy.get('[data-cy=chat-toggle]').click();
      cy.get('[data-cy=chat-input]').type('grafo completo de 3 vertices');
      cy.get('[data-cy=chat-send]').click();

      cy.wait('@generate').its('response.statusCode').should('eq', 200);
      cy.get('[data-cy=chat-message-assistant]').last().should('contain', 'generado');
      cy.get('[data-cy=chat-message-error]').should('not.exist');

      teacherSummary().then((after) => {
        expect(after.generationsByCourse['CEDI-G1'], 'evento atribuido a la cohorte').to.eq(base + 1);
        expect(after.totalGenerations).to.be.greaterThan(before.totalGenerations);

        const raw = JSON.stringify(after);
        expect(raw).to.not.contain(SEEDED.student.email);
        expect(raw).to.not.contain('Estudiante Demo');
        expect(raw).to.not.contain('@u.icesi.edu.co');
      });
    });
  });
});
