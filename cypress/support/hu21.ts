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

/**
 * Escribe la instrucción en el campo del chat y confirma que quedó entera.
 *
 * <p>El panel se refresca justo después de cada respuesta —llega el mensaje, se renueva la sesión,
 * se repinta la cuenta atrás— y escribir a la velocidad de Cypress en medio de ese repintado pierde
 * alguna tecla. Una persona escribiendo a su ritmo no lo nota, pero la prueba acabaría enviando una
 * instrucción distinta de la que dice, y entonces no probaría lo que cree. Se vuelve a escribir
 * hasta que el campo contenga exactamente el texto, y si no se consigue la aserción final falla.
 */
function typePrompt(prompt: string, attemptsLeft = 5) {
  cy.get('[data-cy=chat-input]').should('not.be.disabled').clear().type(prompt);
  cy.get('[data-cy=chat-input]').then(($input) => {
    if ($input.val() !== prompt && attemptsLeft > 1) typePrompt(prompt, attemptsLeft - 1);
  });
}

/** Envía una instrucción al asistente esperando que el backend la acepte o la rechace. */
export function ask(prompt: string, alias: string, expectedStatus = 200) {
  cy.intercept('POST', '/api/generate').as(alias);
  cy.get('[data-cy=quota-counter]').should('be.visible');
  typePrompt(prompt);
  cy.get('[data-cy=chat-input]').should('have.value', prompt);
  cy.get('[data-cy=chat-send]').should('not.be.disabled').click();
  cy.wait(`@${alias}`).its('response.statusCode').should('eq', expectedStatus);
}
