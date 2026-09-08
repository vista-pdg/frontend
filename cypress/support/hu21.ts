/// <reference types="cypress" />
import { SEEDED } from './commands';

/**
 * Utilidades de la HU-21 (registro analítico).
 *
 * <p>Los eventos no se ven en la pantalla del estudiante: eso es justo el punto de la historia. Lo
 * observable desde fuera es lo que el docente puede leer, así que los specs comprueban el registro
 * por la API del docente, con su propia sesión, y no espiando el estado del navegador.
 */

export interface AnalyticsEvent {
  structureType: string;
  algorithm: string | null;
  source: string;
  outcome: string;
  stepCount: number | null;
  visualizationMode: string | null;
  sessionId: string | null;
  promptText: string | null;
  at: string;
}

export interface RetrySequence {
  sessionId: string;
  structureType: string;
  attempts: number;
  firstAt: string;
  lastAt: string;
}

function asTeacher<T>(url: string): Cypress.Chainable<T> {
  return cy
    .request('POST', '/api/auth/login', {
      email: SEEDED.teacher.email,
      password: SEEDED.teacher.password,
    })
    .then(({ body }) =>
      cy.request({ url, headers: { Authorization: `Bearer ${body.accessToken}` } }).its('body')
    );
}

/** Los últimos eventos que ve el docente, del más reciente al más antiguo. */
export function teacherEvents(outcome?: string, limit = 50): Cypress.Chainable<AnalyticsEvent[]> {
  const query = outcome ? `?outcome=${outcome}&limit=${limit}` : `?limit=${limit}`;
  return asTeacher<AnalyticsEvent[]>(`/api/analytics/events${query}`);
}

/** Las secuencias de reintento que el docente puede revisar. */
export function teacherRetries(
  minAttempts = 3,
  windowSeconds = 120
): Cypress.Chainable<RetrySequence[]> {
  return asTeacher<RetrySequence[]>(
    `/api/analytics/retries?minAttempts=${minAttempts}&windowSeconds=${windowSeconds}`
  );
}

/** Envía una instrucción al asistente esperando que el backend la acepte o la rechace. */
export function ask(prompt: string, alias: string, expectedStatus = 200) {
  cy.intercept('POST', '/api/generate').as(alias);
  cy.get('[data-cy=quota-counter]').should('be.visible');
  cy.get('[data-cy=chat-input]').should('not.be.disabled').clear().type(prompt);
  // Se confirma lo escrito antes de enviarlo: una prueba que envía otra instrucción de la que dice
  // no prueba lo que cree. Ver `fix-chat-conserva-lo-escrito`.
  cy.get('[data-cy=chat-input]').should('have.value', prompt);
  cy.get('[data-cy=chat-send]').should('not.be.disabled').click();
  cy.wait(`@${alias}`).its('response.statusCode').should('eq', expectedStatus);
}
