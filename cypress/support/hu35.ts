/// <reference types="cypress" />
import type { VistaSetup } from '../../src/types/quiz';

/**
 * Ayudas de la HU-35. Los quizzes de estudio se preparan por la API real con la sesión del
 * estudiante que dejó `registerStudentByApi`; el perfil e2e redacta las preguntas sin red.
 */

export interface SetupQuestion { position: number; setup: VistaSetup }

function studentHeaders(): Cypress.Chainable<{ Authorization: string }> {
  return cy.storedSession().then(session => ({ Authorization: `Bearer ${session.accessToken}` }));
}

function generateAll(id: number, headers: { Authorization: string }, guard = 0): Cypress.Chainable {
  return cy.request({ method: 'POST', url: `/api/study-quizzes/${id}/generate`, headers }).then(({ body }) =>
    body.complete || guard > 10 ? cy.wrap(null) : generateAll(id, headers, guard + 1));
}

/** Quiz de estudio completo del estudiante en sesión; devuelve su id. */
export function createStudyQuizByApi(topics: string[], questionCount: number, title = ''): Cypress.Chainable<number> {
  return studentHeaders().then(headers =>
    cy.request({ method: 'POST', url: '/api/study-quizzes', headers, body: { title, topics, questionCount } })
      .then(({ body }) => generateAll(body.id, headers).then(() => body.id as number)));
}

export function remainingQuota(): Cypress.Chainable<number> {
  return studentHeaders().then(headers =>
    cy.request({ url: '/api/assistant/quota', headers }).then(({ body }) => body.remaining as number));
}
